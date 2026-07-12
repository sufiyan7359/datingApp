import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { UserResponseDto } from './../src/users/user-response.dto';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `e2e-${Date.now()}@example.com`;
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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers a new user and returns a token pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Test' })
      .expect(201);

    const body = res.body as AuthResponseDto;
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.email).toBe(email);
    expect((body.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('rejects duplicate registration', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Test' })
      .expect(409);
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'WrongPassword1' })
      .expect(401);
  });

  it('logs in and can access a protected route', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { accessToken } = loginRes.body as AuthResponseDto;

    await request(app.getHttpServer()).get('/auth/me').expect(401);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((meRes.body as UserResponseDto).email).toBe(email);
  });

  it('rotates refresh tokens and rejects reuse of the old one', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { refreshToken: oldRefreshToken } = loginRes.body as AuthResponseDto;

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(200);

    expect((refreshRes.body as AuthResponseDto).refreshToken).not.toBe(
      oldRefreshToken,
    );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
  });

  it('revokes a refresh token on logout', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { refreshToken } = loginRes.body as AuthResponseDto;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
