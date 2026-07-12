import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { DiscoveryFeedDto } from './../src/discovery/dto/discovery-feed.dto';

describe('Discovery (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    alice: `alice-${suffix}@example.com`,
    bob: `bob-${suffix}@example.com`,
    charlie: `charlie-${suffix}@example.com`,
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

    // Alice: female, interested in male, Mumbai.
    // Bob: male, interested in female, ~5km from Alice.
    // Charlie: male, interested in female, ~1150km from Alice (Delhi).
    const seed: Array<[keyof typeof emails, string, string[], number, number]> =
      [
        ['alice', 'FEMALE', ['MALE'], 19.076, 72.8777],
        ['bob', 'MALE', ['FEMALE'], 19.1197, 72.905],
        ['charlie', 'MALE', ['FEMALE'], 28.7041, 77.1025],
      ];

    for (const [key, gender, interestedIn, latitude, longitude] of seed) {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: emails[key],
          password,
          firstName: key,
          lastName: 'E2E',
        });
      const { accessToken, user } = registerRes.body as AuthResponseDto;
      tokens[key] = accessToken;
      ids[key] = user.id;

      await request(app.getHttpServer())
        .patch('/profiles/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          gender,
          interestedIn,
          dateOfBirth: '1996-01-01',
          latitude,
          longitude,
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

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/discovery/feed').expect(401);
  });

  it('excludes the viewer and non-reciprocal genders, sorts by distance ascending', async () => {
    const res = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);

    const body = res.body as DiscoveryFeedDto;
    // Filter to this spec's own fixtures: e2e specs share one dev database and run
    // concurrently, so other spec files' users (e.g. a reciprocal-gender fixture from
    // matching.e2e-spec.ts) can legitimately also appear in a real, unscoped feed query.
    const ownResults = body.results.filter(
      (r) => r.userId === ids.bob || r.userId === ids.charlie,
    );
    expect(ownResults.map((r) => r.firstName)).toEqual(['bob', 'charlie']);
    expect(ownResults[0].distanceKm).toBeLessThan(ownResults[1].distanceKm!);
  });

  it('filters by maxDistanceKm', async () => {
    const res = await request(app.getHttpServer())
      .get('/discovery/feed?maxDistanceKm=100')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);

    const body = res.body as DiscoveryFeedDto;
    const ownResults = body.results.filter(
      (r) => r.userId === ids.bob || r.userId === ids.charlie,
    );
    expect(ownResults.map((r) => r.firstName)).toEqual(['bob']);
  });

  it('rejects an out-of-range age filter', async () => {
    await request(app.getHttpServer())
      .get('/discovery/feed?minAge=17')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(400);
  });
});
