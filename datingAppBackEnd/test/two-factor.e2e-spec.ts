import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { authenticator } from 'otplib';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { TwoFactorSetupResponseDto } from './../src/auth/dto/two-factor-setup-response.dto';
import type { TwoFactorChallengeDto } from './../src/auth/dto/two-factor-challenge.dto';

describe('Two-factor authentication (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const email = `2fa-${suffix}@example.com`;
  const password = 'Str0ngPass123';
  let accessToken: string;
  let userId: string;

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
      .send({ email, password, firstName: 'TwoFA', lastName: 'E2E' });
    const body = registerRes.body as AuthResponseDto;
    accessToken = body.accessToken;
    userId = body.user.id;
    expect(body.user.twoFactorEnabled).toBe(false);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects confirming 2FA before setup has been started', async () => {
    await request(app.getHttpServer())
      .post('/auth/2fa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '123456' })
      .expect(400);
  });

  it('rejects confirming 2FA with a wrong code', async () => {
    await request(app.getHttpServer())
      .post('/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/2fa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' })
      .expect(401);
  });

  it('completes setup, then gates login behind a TOTP challenge, then disables cleanly', async () => {
    const setupRes = await request(app.getHttpServer())
      .post('/auth/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    const setup = setupRes.body as TwoFactorSetupResponseDto;
    expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = user.twoFactorSecret!;
    expect(secret).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/2fa/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: authenticator.generate(secret) })
      .expect(204);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((meRes.body as { twoFactorEnabled: boolean }).twoFactorEnabled).toBe(
      true,
    );

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const challenge = loginRes.body as TwoFactorChallengeDto;
    expect(challenge.requiresTwoFactor).toBe(true);
    expect(challenge.challengeToken).toBeTruthy();
    expect(
      (loginRes.body as Partial<AuthResponseDto>).accessToken,
    ).toBeUndefined();

    await request(app.getHttpServer())
      .post('/auth/2fa/login-verify')
      .send({ challengeToken: challenge.challengeToken, code: '000000' })
      .expect(401);

    const verifyRes = await request(app.getHttpServer())
      .post('/auth/2fa/login-verify')
      .send({
        challengeToken: challenge.challengeToken,
        code: authenticator.generate(secret),
      })
      .expect(200);
    const finalTokens = verifyRes.body as AuthResponseDto;
    expect(finalTokens.accessToken).toBeTruthy();
    expect(finalTokens.user.id).toBe(userId);

    await request(app.getHttpServer())
      .post('/auth/2fa/disable')
      .set('Authorization', `Bearer ${finalTokens.accessToken}`)
      .send({ password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/2fa/disable')
      .set('Authorization', `Bearer ${finalTokens.accessToken}`)
      .send({ password })
      .expect(204);

    const loginAfterDisable = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(
      (loginAfterDisable.body as AuthResponseDto).accessToken,
    ).toBeTruthy();
  });
});
