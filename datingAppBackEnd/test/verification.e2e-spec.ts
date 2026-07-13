import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { join } from 'path';
import { rmSync } from 'fs';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { VerificationStatusDto } from './../src/verification/dto/verification-status.dto';
import type { ProfileResponseDto } from './../src/profiles/dto/profile-response.dto';
import type { AdminVerificationsPageDto } from './../src/admin/dto/admin-verifications-page.dto';
import type { AdminVerificationDto } from './../src/admin/dto/admin-verification.dto';

describe('Verification (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    admin: `verify-admin-${suffix}@example.com`,
    plain: `verify-plain-${suffix}@example.com`,
  };
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  const password = 'Str0ngPass123';

  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads/',
    });
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    for (const key of Object.keys(emails) as (keyof typeof emails)[]) {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: emails[key],
          password,
          firstName: key,
          lastName: 'E2E',
        });
      const body = registerRes.body as AuthResponseDto;
      tokens[key] = body.accessToken;
      ids[key] = body.user.id;
    }

    await prisma.user.update({
      where: { id: ids.admin },
      data: { role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
    for (const id of Object.values(ids)) {
      rmSync(join(process.cwd(), 'uploads', 'photos', id), {
        recursive: true,
        force: true,
      });
      rmSync(join(process.cwd(), 'uploads', 'verification', id), {
        recursive: true,
        force: true,
      });
    }
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/verification/me').expect(401);
    await request(app.getHttpServer()).post('/verification/submit').expect(401);
  });

  it('starts as NONE', async () => {
    const res = await request(app.getHttpServer())
      .get('/verification/me')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(200);
    expect((res.body as VerificationStatusDto).status).toBe('NONE');
  });

  it('rejects submission before any profile photo is uploaded', async () => {
    await request(app.getHttpServer())
      .post('/verification/submit')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .attach('selfie', pngBuffer, { filename: 'selfie.png', contentType: 'image/png' })
      .expect(400);
  });

  it('submits, blocks resubmission while pending, gets reviewed, and can be resubmitted after rejection', async () => {
    await request(app.getHttpServer())
      .post('/profiles/me/photos')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .attach('photo', pngBuffer, { filename: 'profile.png', contentType: 'image/png' })
      .expect(201);

    const submitRes = await request(app.getHttpServer())
      .post('/verification/submit')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .attach('selfie', pngBuffer, { filename: 'selfie.png', contentType: 'image/png' })
      .expect(201);
    expect((submitRes.body as VerificationStatusDto).status).toBe('PENDING');

    await request(app.getHttpServer())
      .post('/verification/submit')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .attach('selfie', pngBuffer, { filename: 'selfie.png', contentType: 'image/png' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/admin/verifications')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(403);

    const queueRes = await request(app.getHttpServer())
      .get('/admin/verifications?status=PENDING')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const queue = queueRes.body as AdminVerificationsPageDto;
    expect(queue.results.map((r) => r.userId)).toContain(ids.plain);

    await request(app.getHttpServer())
      .patch(`/admin/verifications/${ids.plain}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ status: 'REJECTED' })
      .expect(400);

    const rejectRes = await request(app.getHttpServer())
      .patch(`/admin/verifications/${ids.plain}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ status: 'REJECTED', note: 'Selfie does not match profile photo' })
      .expect(200);
    expect((rejectRes.body as AdminVerificationDto).status).toBe('REJECTED');

    const afterRejectRes = await request(app.getHttpServer())
      .get('/verification/me')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(200);
    expect((afterRejectRes.body as VerificationStatusDto).note).toBe(
      'Selfie does not match profile photo',
    );

    await request(app.getHttpServer())
      .post('/verification/submit')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .attach('selfie', pngBuffer, { filename: 'selfie2.png', contentType: 'image/png' })
      .expect(201);

    const approveRes = await request(app.getHttpServer())
      .patch(`/admin/verifications/${ids.plain}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ status: 'APPROVED' })
      .expect(200);
    expect((approveRes.body as AdminVerificationDto).status).toBe('APPROVED');

    const profileRes = await request(app.getHttpServer())
      .get('/profiles/me')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(200);
    expect((profileRes.body as ProfileResponseDto).isVerified).toBe(true);

    await request(app.getHttpServer())
      .post('/verification/submit')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .attach('selfie', pngBuffer, { filename: 'selfie3.png', contentType: 'image/png' })
      .expect(400);
  });

  it('404s reviewing a user who never submitted verification', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/verifications/${ids.admin}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ status: 'APPROVED' })
      .expect(404);
  });
});
