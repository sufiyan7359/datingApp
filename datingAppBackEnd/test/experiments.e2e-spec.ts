import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { ExperimentAssignmentDto } from './../src/experiments/dto/experiment-assignment.dto';
import type { ExperimentDto } from './../src/experiments/dto/experiment.dto';
import type { ExperimentResultsDto } from './../src/experiments/dto/experiment-results.dto';

describe('Experiments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const key = `e2e_experiment_${suffix}`;
  const emails = {
    admin: `exp-admin-${suffix}@example.com`,
    a: `exp-a-${suffix}@example.com`,
    b: `exp-b-${suffix}@example.com`,
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

    for (const k of Object.keys(emails) as (keyof typeof emails)[]) {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: emails[k], password, firstName: k, lastName: 'E2E' });
      const body = registerRes.body as AuthResponseDto;
      tokens[k] = body.accessToken;
      ids[k] = body.user.id;
    }

    await prisma.user.update({
      where: { id: ids.admin },
      data: { role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.experiment.deleteMany({ where: { key } });
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer())
      .get(`/experiments/${key}/assignment`)
      .expect(401);
  });

  it('defaults an unknown experiment key to the control variant', async () => {
    const res = await request(app.getHttpServer())
      .get(`/experiments/does-not-exist-${suffix}/assignment`)
      .set('Authorization', `Bearer ${tokens.a}`)
      .expect(200);
    expect((res.body as ExperimentAssignmentDto).variant).toBe('A');
  });

  it('rejects non-admins from managing experiments', async () => {
    await request(app.getHttpServer())
      .post('/admin/experiments')
      .set('Authorization', `Bearer ${tokens.a}`)
      .send({ key, name: 'E2E experiment', variantBPercent: 100 })
      .expect(403);
  });

  it('creates an experiment, deterministically assigns, and keeps the assignment sticky across a split change', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/admin/experiments')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ key, name: 'E2E experiment', variantBPercent: 100 })
      .expect(201);
    expect((createRes.body as ExperimentDto).assignedCount).toBe(0);

    // 100% to B: user A is guaranteed variant B on first assignment.
    const firstRes = await request(app.getHttpServer())
      .get(`/experiments/${key}/assignment`)
      .set('Authorization', `Bearer ${tokens.a}`)
      .expect(200);
    expect((firstRes.body as ExperimentAssignmentDto).variant).toBe('B');

    // Flip the split to 0% *after* user A is already assigned - existing
    // assignments must not reshuffle.
    await request(app.getHttpServer())
      .patch(`/admin/experiments/${key}`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ variantBPercent: 0 })
      .expect(200);

    const stillBRes = await request(app.getHttpServer())
      .get(`/experiments/${key}/assignment`)
      .set('Authorization', `Bearer ${tokens.a}`)
      .expect(200);
    expect((stillBRes.body as ExperimentAssignmentDto).variant).toBe('B');

    // User B is assigned for the first time *after* the split changed to 0%,
    // so they land in the control variant.
    const userBRes = await request(app.getHttpServer())
      .get(`/experiments/${key}/assignment`)
      .set('Authorization', `Bearer ${tokens.b}`)
      .expect(200);
    expect((userBRes.body as ExperimentAssignmentDto).variant).toBe('A');

    const listRes = await request(app.getHttpServer())
      .get('/admin/experiments')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const listed = (listRes.body as ExperimentDto[]).find((e) => e.key === key);
    expect(listed?.assignedCount).toBe(2);
  });

  it('computes per-variant conversion against a goal event', async () => {
    // User A (variant B) logs in again after being assigned - a conversion.
    // User B (variant A) never logs in again - no conversion.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: emails.a, password })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/admin/experiments/${key}/results?goalEvent=LOGIN`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);

    const results = res.body as ExperimentResultsDto;
    const variantB = results.results.find((r) => r.variant === 'B');
    const variantA = results.results.find((r) => r.variant === 'A');
    expect(variantB).toMatchObject({
      assignedCount: 1,
      convertedCount: 1,
      conversionRate: 1,
    });
    expect(variantA).toMatchObject({
      assignedCount: 1,
      convertedCount: 0,
      conversionRate: 0,
    });
  });

  it('rejects an invalid goal event', async () => {
    await request(app.getHttpServer())
      .get(`/admin/experiments/${key}/results?goalEvent=NOT_A_REAL_EVENT`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(400);
  });
});
