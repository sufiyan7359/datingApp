import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { SwipeResultDto } from './../src/matching/dto/swipe-result.dto';
import type { MatchDto } from './../src/matching/dto/match.dto';
import type { SwipeLimitsDto } from './../src/matching/dto/swipe-limits.dto';
import type { DiscoveryFeedDto } from './../src/discovery/dto/discovery-feed.dto';

describe('Matching (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    alice: `match-alice-${suffix}@example.com`,
    bob: `match-bob-${suffix}@example.com`,
    carol: `match-carol-${suffix}@example.com`,
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

    const seed: Array<[keyof typeof emails, string, string[]]> = [
      ['alice', 'FEMALE', ['MALE']],
      ['bob', 'MALE', ['FEMALE']],
      ['carol', 'FEMALE', ['MALE']],
    ];

    for (const [key, gender, interestedIn] of seed) {
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

      await request(app.getHttpServer())
        .patch('/profiles/me')
        .set('Authorization', `Bearer ${tokens[key]}`)
        .send({
          gender,
          interestedIn,
          dateOfBirth: '1996-01-01',
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

  it('rejects unauthenticated access to every matching endpoint', async () => {
    await request(app.getHttpServer()).post('/swipes').expect(401);
    await request(app.getHttpServer()).delete('/swipes/last').expect(401);
    await request(app.getHttpServer()).get('/swipes/limits').expect(401);
    await request(app.getHttpServer()).get('/matches').expect(401);
    await request(app.getHttpServer()).post('/profiles/me/boost').expect(401);
  });

  it('rejects swiping on yourself', async () => {
    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ targetUserId: ids.alice, action: 'LIKE' })
      .expect(400);
  });

  it('removes a liked profile from discovery, then creates a match on reciprocal like', async () => {
    const likeRes = await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ targetUserId: ids.bob, action: 'LIKE' })
      .expect(201);
    expect((likeRes.body as SwipeResultDto).isMatch).toBe(false);

    const feedAfterLike = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (feedAfterLike.body as DiscoveryFeedDto).results.map((r) => r.userId),
    ).not.toContain(ids.bob);

    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ targetUserId: ids.bob, action: 'LIKE' })
      .expect(400); // duplicate swipe

    const reciprocalRes = await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ targetUserId: ids.alice, action: 'LIKE' })
      .expect(201);
    const reciprocalBody = reciprocalRes.body as SwipeResultDto;
    expect(reciprocalBody.isMatch).toBe(true);
    expect(reciprocalBody.match?.firstName).toBe('alice');

    const aliceMatches = await request(app.getHttpServer())
      .get('/matches')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect((aliceMatches.body as MatchDto[]).map((m) => m.userId)).toContain(
      ids.bob,
    );

    const bobMatches = await request(app.getHttpServer())
      .get('/matches')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .expect(200);
    expect((bobMatches.body as MatchDto[]).map((m) => m.userId)).toContain(
      ids.alice,
    );
  });

  it('blocks undoing a swipe that already resulted in a match', async () => {
    await request(app.getHttpServer())
      .delete('/swipes/last')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .expect(400);
  });

  it('lets you undo an unmatched swipe and restores it in discovery', async () => {
    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .send({ targetUserId: ids.bob, action: 'PASS' })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/swipes/last')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .expect(204);

    const feed = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .expect(200);
    expect(
      (feed.body as DiscoveryFeedDto).results.map((r) => r.userId),
    ).toContain(ids.bob);
  });

  it('reports swipe limits and enforces the boost daily cap', async () => {
    const limitsRes = await request(app.getHttpServer())
      .get('/swipes/limits')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .expect(200);
    const limits = limitsRes.body as SwipeLimitsDto;
    expect(limits.boostsRemaining).toBe(1);

    await request(app.getHttpServer())
      .post('/profiles/me/boost')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/profiles/me/boost')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .expect(403);
  });
});
