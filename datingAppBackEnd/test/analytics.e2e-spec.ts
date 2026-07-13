import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { AnalyticsSummaryDto } from './../src/analytics/dto/analytics-summary.dto';

describe('Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    admin: `analytics-admin-${suffix}@example.com`,
    plain: `analytics-plain-${suffix}@example.com`,
  };
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  const password = 'Str0ngPass123';

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

    // A distinct, explicit LOGIN on top of the SIGNUP already recorded above.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emails.plain, password });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('rejects non-admins', async () => {
    await request(app.getHttpServer())
      .get('/admin/analytics/summary')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(403);
  });

  it('rejects an out-of-range days value', async () => {
    await request(app.getHttpServer())
      .get('/admin/analytics/summary?days=0')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(400);
  });

  it('counts SIGNUP and LOGIN events recorded by the actions above', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/analytics/summary?days=1')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);

    const summary = res.body as AnalyticsSummaryDto;
    expect(summary.days).toBe(1);
    expect(summary.countByType.SIGNUP).toBeGreaterThanOrEqual(2);
    expect(summary.countByType.LOGIN).toBeGreaterThanOrEqual(1);
  });
});
