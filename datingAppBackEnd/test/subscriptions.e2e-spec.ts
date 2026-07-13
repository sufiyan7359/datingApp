import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { SwipeLimitsDto } from './../src/matching/dto/swipe-limits.dto';
import type { DiscoveryFeedDto } from './../src/discovery/dto/discovery-feed.dto';
import type { LikesReceivedDto } from './../src/matching/dto/likes-received.dto';

describe('Subscriptions & premium gating (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const emails = {
    gold: `gold-${suffix}@example.com`,
    free: `free-${suffix}@example.com`,
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

    await prisma.promoCode.upsert({
      where: { code: `E2EPROMO${suffix}` },
      update: {},
      create: {
        code: `E2EPROMO${suffix}`,
        discountPercent: 25,
        maxRedemptions: 1,
        isActive: true,
      },
    });
    await prisma.promoCode.upsert({
      where: { code: `E2EEXPIRED${suffix}` },
      update: {},
      create: {
        code: `E2EEXPIRED${suffix}`,
        discountPercent: 25,
        isActive: true,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    for (const key of ['gold', 'free'] as const) {
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
          gender: key === 'gold' ? 'MALE' : 'FEMALE',
          interestedIn: key === 'gold' ? ['FEMALE'] : ['MALE'],
          dateOfBirth: '1996-01-01',
          latitude: 19.076,
          longitude: 72.8777,
          onboardingCompleted: true,
        })
        .expect(200);
    }
  });

  afterAll(async () => {
    await prisma.promoCode.deleteMany({
      where: { code: { in: [`E2EPROMO${suffix}`, `E2EEXPIRED${suffix}`] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('lists plans without auth', async () => {
    const res = await request(app.getHttpServer())
      .get('/subscriptions/plans')
      .expect(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tier: 'GOLD', billingCycle: 'MONTHLY' }),
      ]),
    );
  });

  it('reports FREE tier with plain daily limits before subscribing', async () => {
    const res = await request(app.getHttpServer())
      .get('/swipes/limits')
      .set('Authorization', `Bearer ${tokens.free}`)
      .expect(200);
    const limits = res.body as SwipeLimitsDto;
    expect(limits.tier).toBe('FREE');
    expect(limits.likesUnlimited).toBe(false);
  });

  it('rejects an expired promo code', async () => {
    const res = await request(app.getHttpServer())
      .post('/subscriptions/promo/validate')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .send({ code: `E2EEXPIRED${suffix}` })
      .expect(201);
    expect(res.body).toEqual({ valid: false, discountPercent: 0 });
  });

  it('rejects incognito/passport writes for FREE users', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.free}`)
      .send({ isIncognito: true })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.free}`)
      .send({ passportLatitude: 40.7128, passportLongitude: -74.006 })
      .expect(403);
  });

  it('subscribes to GOLD with a valid promo code, applying the discount and blocking reuse', async () => {
    const res = await request(app.getHttpServer())
      .post('/subscriptions/subscribe')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .send({
        tier: 'GOLD',
        billingCycle: 'MONTHLY',
        promoCode: `E2EPROMO${suffix}`,
      })
      .expect(201);
    expect(res.body).toMatchObject({
      tier: 'GOLD',
      isPremium: true,
      status: 'ACTIVE',
      priceCents: 1499, // 1999 * 0.75, rounded
      autoRenew: true,
    });

    await request(app.getHttpServer())
      .post('/subscriptions/subscribe')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .send({
        tier: 'PLATINUM',
        billingCycle: 'MONTHLY',
        promoCode: `E2EPROMO${suffix}`,
      })
      .expect(400);
  });

  it('unlocks unlimited likes/undos and incognito/passport once subscribed', async () => {
    const limitsRes = await request(app.getHttpServer())
      .get('/swipes/limits')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .expect(200);
    const limits = limitsRes.body as SwipeLimitsDto;
    expect(limits.tier).toBe('GOLD');
    expect(limits.likesUnlimited).toBe(true);
    expect(limits.undosUnlimited).toBe(true);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .send({
        passportLatitude: 40.7128,
        passportLongitude: -74.006,
        passportCity: 'New York',
      })
      .expect(200);
  });

  it('cancels auto-renew without ending the current entitlement', async () => {
    const res = await request(app.getHttpServer())
      .post('/subscriptions/cancel')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .expect(201);
    expect(res.body).toMatchObject({ status: 'ACTIVE', autoRenew: false });
  });

  it('excludes an incognito profile from other users discovery feeds', async () => {
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .send({ isIncognito: true })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/discovery/feed')
      .set('Authorization', `Bearer ${tokens.free}`)
      .expect(200);
    const body = res.body as DiscoveryFeedDto;
    expect(body.results.some((r) => r.userId === ids.gold)).toBe(false);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .send({ isIncognito: false })
      .expect(200);
  });

  it('shows who-liked-me as count-only for FREE and full profiles for GOLD', async () => {
    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.free}`)
      .send({ targetUserId: ids.gold, action: 'LIKE' })
      .expect(201);

    const goldRes = await request(app.getHttpServer())
      .get('/swipes/likes-received')
      .set('Authorization', `Bearer ${tokens.gold}`)
      .expect(200);
    const goldBody = goldRes.body as LikesReceivedDto;
    expect(goldBody.isPremium).toBe(true);
    expect(goldBody.likes.some((l) => l.userId === ids.free)).toBe(true);

    const freeRes = await request(app.getHttpServer())
      .get('/swipes/likes-received')
      .set('Authorization', `Bearer ${tokens.free}`)
      .expect(200);
    const freeBody = freeRes.body as LikesReceivedDto;
    expect(freeBody.isPremium).toBe(false);
    expect(freeBody.likes).toEqual([]);
  });
});
