import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { DashboardStatsDto } from './../src/admin/dto/dashboard-stats.dto';
import type { AdminUsersPageDto } from './../src/admin/dto/admin-users-page.dto';
import type { AdminUserDetailDto } from './../src/admin/dto/admin-user-detail.dto';
import type { AdminReportsPageDto } from './../src/admin/dto/admin-reports-page.dto';
import type { AdminReportDto } from './../src/admin/dto/admin-report.dto';
import type { AdminPromoCodeDto } from './../src/admin/dto/admin-promo-code.dto';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    admin: `admin-${suffix}@example.com`,
    admin2: `admin2-${suffix}@example.com`,
    plain: `plain-${suffix}@example.com`,
    reporter: `reporter-${suffix}@example.com`,
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

    await prisma.user.updateMany({
      where: { id: { in: [ids.admin, ids.admin2] } },
      data: { role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('rejects non-admins from every admin endpoint', async () => {
    await request(app.getHttpServer())
      .get('/admin/dashboard/stats')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/reports')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/promo-codes')
      .set('Authorization', `Bearer ${tokens.plain}`)
      .expect(403);
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get('/admin/dashboard/stats')
      .expect(401);
  });

  it('returns platform-wide dashboard stats to an admin', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/dashboard/stats')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const stats = res.body as DashboardStatsDto;
    expect(stats.totalUsers).toBeGreaterThanOrEqual(Object.keys(emails).length);
    expect(stats.activeUsers).toBeGreaterThanOrEqual(0);
  });

  it('searches users and returns a detail view', async () => {
    const listRes = await request(app.getHttpServer())
      .get(`/admin/users?search=${emails.plain}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const page = listRes.body as AdminUsersPageDto;
    expect(page.results.map((u) => u.id)).toContain(ids.plain);

    const detailRes = await request(app.getHttpServer())
      .get(`/admin/users/${ids.plain}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const detail = detailRes.body as AdminUserDetailDto;
    expect(detail.email).toBe(emails.plain);
    expect(detail.subscriptionTier).toBe('FREE');
  });

  it('rejects self-suspension and suspending another admin', async () => {
    await request(app.getHttpServer())
      .post(`/admin/users/${ids.admin}/suspend`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(400);
    await request(app.getHttpServer())
      .post(`/admin/users/${ids.admin2}/suspend`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(403);
  });

  it('suspends a user, blocking login and revoking sessions, then reactivates them', async () => {
    await request(app.getHttpServer())
      .post(`/admin/users/${ids.plain}/suspend`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emails.plain, password })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/admin/users/${ids.plain}/reactivate`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emails.plain, password })
      .expect(200);
  });

  it('reviews a report and can suspend the reported user as part of the review', async () => {
    await request(app.getHttpServer())
      .post('/safety/report')
      .set('Authorization', `Bearer ${tokens.reporter}`)
      .send({
        userId: ids.plain,
        reason: 'SPAM',
        description: 'Spammy messages',
      })
      .expect(201);

    const pendingRes = await request(app.getHttpServer())
      .get('/admin/reports?status=PENDING')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const pendingPage = pendingRes.body as AdminReportsPageDto;
    const report = pendingPage.results.find((r) => r.reportedId === ids.plain);
    expect(report).toBeDefined();
    expect(report!.reporterFirstName).toBe('reporter');

    const reviewRes = await request(app.getHttpServer())
      .patch(`/admin/reports/${report!.id}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        status: 'ACTION_TAKEN',
        adminNote: 'Confirmed spam',
        suspendReportedUser: true,
      })
      .expect(200);
    expect((reviewRes.body as AdminReportDto).status).toBe('ACTION_TAKEN');

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emails.plain, password })
      .expect(401);

    // cleanup: restore for other tests / teardown
    await request(app.getHttpServer())
      .post(`/admin/users/${ids.plain}/reactivate`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(204);
  });

  it('creates, lists, and deactivates a promo code, rejecting duplicates', async () => {
    const code = `E2EADMIN${suffix}`;
    const createRes = await request(app.getHttpServer())
      .post('/admin/promo-codes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ code, discountPercent: 15, maxRedemptions: 5 })
      .expect(201);
    const created = createRes.body as AdminPromoCodeDto;
    expect(created.code).toBe(code);
    expect(created.isActive).toBe(true);

    await request(app.getHttpServer())
      .post('/admin/promo-codes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ code, discountPercent: 10 })
      .expect(409);

    const listRes = await request(app.getHttpServer())
      .get('/admin/promo-codes')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    expect((listRes.body as AdminPromoCodeDto[]).map((p) => p.code)).toContain(
      code,
    );

    const updateRes = await request(app.getHttpServer())
      .patch(`/admin/promo-codes/${created.id}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ isActive: false })
      .expect(200);
    expect((updateRes.body as AdminPromoCodeDto).isActive).toBe(false);

    await prisma.promoCode.deleteMany({ where: { code } });
  });
});
