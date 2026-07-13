import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { EmailService } from './../src/email/email.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';

function extractToken(url: string): string {
  return new URL(url).searchParams.get('token')!;
}

describe('Password reset (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const suffix = Date.now();
  const email = `reset-e2e-${suffix}@example.com`;
  const password = 'Str0ngPass123';
  let userId: string;
  let firstRefreshToken: string;

  const emailServiceMock = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailServiceMock)
      .compile();

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
      .send({ email, password, firstName: 'Reset', lastName: 'E2E' });
    const body = registerRes.body as AuthResponseDto;
    userId = body.user.id;
    firstRefreshToken = body.refreshToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('sends a welcome email on registration without failing it', () => {
    expect(emailServiceMock.sendWelcomeEmail).toHaveBeenCalledWith(
      email,
      'Reset',
    );
  });

  it('does not reveal whether an email is registered', async () => {
    emailServiceMock.sendPasswordResetEmail.mockClear();
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: `no-such-account-${suffix}@example.com` })
      .expect(204);
    expect(emailServiceMock.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('rejects a garbage reset token', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'not-a-real-token', newPassword: 'NewStr0ngPass1' })
      .expect(400);
  });

  it('rejects a weak new password even with a token pending', async () => {
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);
    const [, resetUrl] = emailServiceMock.sendPasswordResetEmail.mock.calls.at(
      -1,
    ) as [string, string];
    const token = extractToken(resetUrl);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'weak' })
      .expect(400);
  });

  it('rejects an expired token', async () => {
    emailServiceMock.sendPasswordResetEmail.mockClear();
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);
    const [, resetUrl] = emailServiceMock.sendPasswordResetEmail.mock.calls.at(
      -1,
    ) as [string, string];
    const token = extractToken(resetUrl);

    await prisma.passwordResetToken.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'NewStr0ngPass1' })
      .expect(400);
  });

  it('resets the password, revokes existing sessions, and rejects reusing the token', async () => {
    emailServiceMock.sendPasswordResetEmail.mockClear();
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(204);
    const [, resetUrl] = emailServiceMock.sendPasswordResetEmail.mock.calls.at(
      -1,
    ) as [string, string];
    const token = extractToken(resetUrl);

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'NewStr0ngPass1' })
      .expect(204);

    // Old password no longer works.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(401);

    // New password works.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'NewStr0ngPass1' })
      .expect(200);

    // The refresh token issued at registration - before the reset - no
    // longer works, so a stolen session can't survive the reset.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);

    // The token is single-use.
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'AnotherStr0ngPass1' })
      .expect(400);
  });
});
