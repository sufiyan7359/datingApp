import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { RiskAssessmentDto } from './../src/ai/dto/risk-assessment.dto';
import type { DiscoveryFeedDto } from './../src/discovery/dto/discovery-feed.dto';

describe('AI features (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    admin: `ai-admin-${suffix}@example.com`,
    sparse: `ai-sparse-${suffix}@example.com`,
    reporter: `ai-reporter-${suffix}@example.com`,
    viewer: `ai-viewer-${suffix}@example.com`,
    compatible: `ai-compatible-${suffix}@example.com`,
    incompatible: `ai-incompatible-${suffix}@example.com`,
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

    // "sparse" is left with no profile fields at all - the fake-profile
    // detection fixture. Everyone else gets just enough to appear in
    // reciprocal-gender discovery results together.
    const compatibilitySeed: Array<
      [keyof typeof emails, string, string[], string[], string]
    > = [
      ['viewer', 'FEMALE', ['MALE'], ['hiking', 'coffee', 'jazz'], 'LONG_TERM'],
      [
        'compatible',
        'MALE',
        ['FEMALE'],
        ['hiking', 'coffee', 'jazz'],
        'LONG_TERM',
      ],
      ['incompatible', 'MALE', ['FEMALE'], ['crypto'], 'CASUAL'],
      ['reporter', 'MALE', ['FEMALE'], [], 'NOT_SURE'],
    ];

    for (const [
      key,
      gender,
      interestedIn,
      interests,
      relationshipGoal,
    ] of compatibilitySeed) {
      await request(app.getHttpServer())
        .patch('/profiles/me')
        .set('Authorization', `Bearer ${tokens[key]}`)
        .send({
          gender,
          interestedIn,
          dateOfBirth: '1996-01-01',
          latitude: 19.076,
          longitude: 72.8777,
          interests,
          relationshipGoal,
          onboardingCompleted: true,
        })
        .expect(200);
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('rejects non-admins from the risk endpoint', async () => {
    await request(app.getHttpServer())
      .get(`/admin/users/${ids.sparse}/risk`)
      .set('Authorization', `Bearer ${tokens.sparse}`)
      .expect(403);
  });

  it('flags a bare-minimum profile with no photos, no bio, and missing fields', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/users/${ids.sparse}/risk`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const assessment = res.body as RiskAssessmentDto;
    const codes = assessment.factors.map((f) => f.code);
    expect(codes).toContain('NO_PHOTOS');
    expect(codes).toContain('MISSING_BIO');
    expect(codes).toContain('INCOMPLETE_PROFILE');
    expect(assessment.score).toBeGreaterThan(0);
  });

  it('reflects report count in the risk score', async () => {
    await request(app.getHttpServer())
      .post('/safety/report')
      .set('Authorization', `Bearer ${tokens.reporter}`)
      .send({ userId: ids.sparse, reason: 'FAKE_PROFILE' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/admin/users/${ids.sparse}/risk`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .expect(200);
    const assessment = res.body as RiskAssessmentDto;
    expect(assessment.factors.map((f) => f.code)).toContain('REPORTED');
  });

  it('ranks a shared-interest, shared-goal candidate above an unrelated one at the same distance', async () => {
    const res = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.viewer}`)
      .expect(200);

    const body = res.body as DiscoveryFeedDto;
    const compatibleEntry = body.results.find(
      (r) => r.userId === ids.compatible,
    );
    const incompatibleEntry = body.results.find(
      (r) => r.userId === ids.incompatible,
    );
    expect(compatibleEntry).toBeDefined();
    expect(incompatibleEntry).toBeDefined();
    expect(compatibleEntry!.compatibilityScore).toBeGreaterThan(
      incompatibleEntry!.compatibilityScore,
    );

    const compatibleIndex = body.results.findIndex(
      (r) => r.userId === ids.compatible,
    );
    const incompatibleIndex = body.results.findIndex(
      (r) => r.userId === ids.incompatible,
    );
    expect(compatibleIndex).toBeLessThan(incompatibleIndex);
  });
});
