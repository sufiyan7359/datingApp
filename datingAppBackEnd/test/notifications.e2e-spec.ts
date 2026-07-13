import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `e2e-notifications-${Date.now()}@example.com`;
  const password = 'Str0ngPass123';
  let accessToken: string;
  let userId: string;

  const endpoint = `https://fcm.googleapis.com/fcm/send/e2e-${Date.now()}`;
  const keys = { p256dh: 'test-p256dh-key', auth: 'test-auth-key' };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'Notif', lastName: 'E2E' });
    const body = registerRes.body as AuthResponseDto;
    accessToken = body.accessToken;
    userId = body.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get('/notifications/vapid-public-key')
      .expect(401);
    await request(app.getHttpServer())
      .post('/notifications/subscribe')
      .expect(401);
    await request(app.getHttpServer())
      .delete('/notifications/subscribe')
      .expect(401);
  });

  it('returns a VAPID public key', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications/vapid-public-key')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(typeof (res.body as { publicKey: string }).publicKey).toBe('string');
  });

  it('rejects a malformed subscription body', async () => {
    await request(app.getHttpServer())
      .post('/notifications/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ endpoint })
      .expect(400);
  });

  it('subscribes, re-subscribes the same endpoint (upsert), and unsubscribes', async () => {
    await request(app.getHttpServer())
      .post('/notifications/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ endpoint, keys })
      .expect(204);

    const stored = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });
    expect(stored?.userId).toBe(userId);

    // Re-subscribing the same endpoint (e.g. the browser renewed it) upserts
    // rather than erroring on the unique constraint.
    await request(app.getHttpServer())
      .post('/notifications/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ endpoint, keys: { p256dh: 'updated', auth: 'updated' } })
      .expect(204);

    const updated = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });
    expect(updated?.p256dh).toBe('updated');

    await request(app.getHttpServer())
      .delete('/notifications/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ endpoint })
      .expect(204);

    const afterDelete = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });
    expect(afterDelete).toBeNull();
  });

  it('unsubscribing an unknown endpoint is a no-op, not an error', async () => {
    await request(app.getHttpServer())
      .delete('/notifications/subscribe')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ endpoint: 'https://example.com/does-not-exist' })
      .expect(204);
  });
});
