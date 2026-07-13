import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { join } from 'path';
import { rmSync } from 'fs';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { SwipeResultDto } from './../src/matching/dto/swipe-result.dto';
import type { DiscoveryFeedDto } from './../src/discovery/dto/discovery-feed.dto';
import type { ConversationResponseDto } from './../src/chat/dto/conversation-response.dto';
import type { PhotoResponseDto } from './../src/profiles/dto/photo-response.dto';
import type { BlockedUserDto } from './../src/safety/dto/blocked-user.dto';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('Safety (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    alice: `safety-alice-${suffix}@example.com`,
    bob: `safety-bob-${suffix}@example.com`,
    carol: `safety-carol-${suffix}@example.com`,
  };
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  const password = 'Str0ngPass123';

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

    const seed: Array<[keyof typeof emails, string, string[]]> = [
      ['alice', 'FEMALE', ['MALE']],
      ['bob', 'MALE', ['FEMALE']],
      ['carol', 'MALE', ['FEMALE']],
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
    for (const id of Object.values(ids)) {
      rmSync(join(process.cwd(), 'uploads', 'photos', id), {
        recursive: true,
        force: true,
      });
    }
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('rejects unauthenticated access to safety endpoints', async () => {
    await request(app.getHttpServer()).post('/safety/block').expect(401);
    await request(app.getHttpServer()).get('/safety/blocked').expect(401);
    await request(app.getHttpServer()).post('/safety/report').expect(401);
  });

  it('rejects blocking yourself', async () => {
    await request(app.getHttpServer())
      .post('/safety/block')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ userId: ids.alice })
      .expect(400);
  });

  it('blocking hides a profile from discovery and swiping in both directions, and unblocking restores it', async () => {
    await request(app.getHttpServer())
      .post('/safety/block')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ userId: ids.bob })
      .expect(201);

    const aliceFeed = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (aliceFeed.body as DiscoveryFeedDto).results.map((r) => r.userId),
    ).not.toContain(ids.bob);

    const bobFeed = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .expect(200);
    expect(
      (bobFeed.body as DiscoveryFeedDto).results.map((r) => r.userId),
    ).not.toContain(ids.alice);

    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ targetUserId: ids.alice, action: 'LIKE' })
      .expect(403);

    const blockedList = await request(app.getHttpServer())
      .get('/safety/blocked')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect((blockedList.body as BlockedUserDto[]).map((b) => b.userId)).toEqual(
      [ids.bob],
    );

    await request(app.getHttpServer())
      .delete(`/safety/block/${ids.bob}`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(204);

    const feedAfterUnblock = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (feedAfterUnblock.body as DiscoveryFeedDto).results.map((r) => r.userId),
    ).toContain(ids.bob);
  });

  it('reporting with alsoBlock creates the report and blocks in one call', async () => {
    await request(app.getHttpServer())
      .post('/safety/report')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .send({
        userId: ids.alice,
        reason: 'HARASSMENT',
        description: 'Being unpleasant',
        alsoBlock: true,
      })
      .expect(201);

    const report = await prisma.report.findFirst({
      where: { reporterId: ids.carol, reportedId: ids.alice },
    });
    expect(report?.reason).toBe('HARASSMENT');

    const blocked = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: { blockerId: ids.carol, blockedId: ids.alice },
      },
    });
    expect(blocked).not.toBeNull();

    await prisma.block.deleteMany({
      where: { blockerId: ids.carol, blockedId: ids.alice },
    });
  });

  it('blocking a match removes the conversation from the list for both people', async () => {
    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.carol}`)
      .send({ targetUserId: ids.alice, action: 'LIKE' })
      .expect(201);
    const matchRes = await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ targetUserId: ids.carol, action: 'LIKE' })
      .expect(201);
    expect((matchRes.body as SwipeResultDto).isMatch).toBe(true);

    const beforeBlockList = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (beforeBlockList.body as ConversationResponseDto[]).map(
        (c) => c.otherUserId,
      ),
    ).toContain(ids.carol);

    await request(app.getHttpServer())
      .post('/safety/block')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ userId: ids.carol })
      .expect(201);

    const afterBlockList = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (afterBlockList.body as ConversationResponseDto[]).map(
        (c) => c.otherUserId,
      ),
    ).not.toContain(ids.carol);

    await request(app.getHttpServer())
      .delete(`/safety/block/${ids.carol}`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(204);
  });

  it('mutes and unmutes a conversation', async () => {
    const conversation = await prisma.conversation.findFirst({
      where: { match: { userAId: { in: [ids.alice, ids.carol] } } },
    });
    expect(conversation).not.toBeNull();

    await request(app.getHttpServer())
      .post(`/conversations/${conversation!.id}/mute`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(204);

    const listMuted = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (listMuted.body as ConversationResponseDto[]).find(
        (c) => c.otherUserId === ids.carol,
      )?.isMuted,
    ).toBe(true);

    await request(app.getHttpServer())
      .delete(`/conversations/${conversation!.id}/mute`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(204);

    const listUnmuted = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (listUnmuted.body as ConversationResponseDto[]).find(
        (c) => c.otherUserId === ids.carol,
      )?.isMuted,
    ).toBe(false);
  });

  it('hides age and distance from discovery when the privacy toggles are on', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ hideAge: true, hideDistance: true })
      .expect(200);

    const feed = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    const bobEntry = (feed.body as DiscoveryFeedDto).results.find(
      (r) => r.userId === ids.bob,
    );
    expect(bobEntry?.age).toBeNull();
    expect(bobEntry?.distanceKm).toBeNull();

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ hideAge: false, hideDistance: false })
      .expect(200);
  });

  it('serves a real server-generated blurred image to non-matches and the original to matches', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post('/profiles/me/photos')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .attach('photo', TINY_PNG, {
        filename: 'bob.png',
        contentType: 'image/png',
      })
      .expect(201);
    const photo = uploadRes.body as PhotoResponseDto;

    const blurRes = await request(app.getHttpServer())
      .patch(`/profiles/me/photos/${photo.id}/blur`)
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ isBlurred: true })
      .expect(200);
    const blurredPhoto = blurRes.body as PhotoResponseDto;
    // The owner always sees their own real photo (revealed=true by default).
    expect(blurredPhoto.isBlurred).toBe(true);
    expect(blurredPhoto.url).toBe(photo.url);

    const stored = await prisma.photo.findUniqueOrThrow({
      where: { id: photo.id },
    });
    expect(stored.blurredUrl).not.toBeNull();
    expect(stored.blurredUrl).not.toBe(photo.url);
    await request(app.getHttpServer()).get(stored.blurredUrl!).expect(200);

    const feed = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    const bobEntry = (feed.body as DiscoveryFeedDto).results.find(
      (r) => r.userId === ids.bob,
    );
    expect(bobEntry?.photos[0]?.url).toBe(stored.blurredUrl);
    expect(bobEntry?.photos[0]?.url).not.toBe(photo.url);

    // Alice and Bob match -> Bob's photo should now render unblurred for Alice.
    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ targetUserId: ids.bob, action: 'LIKE' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ targetUserId: ids.alice, action: 'LIKE' })
      .expect(201);

    const matches = await request(app.getHttpServer())
      .get('/matches')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    const bobMatch = (
      matches.body as { userId: string; photos: PhotoResponseDto[] }[]
    ).find((m) => m.userId === ids.bob);
    expect(bobMatch?.photos[0]?.url).toBe(photo.url);

    await request(app.getHttpServer())
      .patch(`/profiles/me/photos/${photo.id}/blur`)
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ isBlurred: false })
      .expect(200);
  });
});
