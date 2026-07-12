import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { join } from 'path';
import { rmSync } from 'fs';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { ProfileResponseDto } from './../src/profiles/dto/profile-response.dto';
import type { PhotoResponseDto } from './../src/profiles/dto/photo-response.dto';

describe('Profiles (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const email = `e2e-profile-${Date.now()}@example.com`;
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

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'Profile', lastName: 'Tester' });
    const body = registerRes.body as AuthResponseDto;
    accessToken = body.accessToken;
    userId = body.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    rmSync(join(process.cwd(), 'uploads', 'photos', userId), {
      recursive: true,
      force: true,
    });
    await app.close();
  });

  it('rejects unauthenticated access', async () => {
    await request(app.getHttpServer()).get('/profiles/me').expect(401);
  });

  it('auto-creates an empty profile on first access', async () => {
    const res = await request(app.getHttpServer())
      .get('/profiles/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as ProfileResponseDto;
    expect(body.onboardingCompleted).toBe(false);
    expect(body.photos).toEqual([]);
    expect(body.gender).toBeNull();
  });

  it('updates profile fields and rejects an invalid enum value', async () => {
    const res = await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        gender: 'FEMALE',
        interestedIn: ['MALE'],
        heightCm: 170,
        bio: 'Hello world',
        interests: ['Hiking', 'Coffee'],
      })
      .expect(200);

    const body = res.body as ProfileResponseDto;
    expect(body.gender).toBe('FEMALE');
    expect(body.heightCm).toBe(170);
    expect(body.interests).toEqual(['Hiking', 'Coffee']);

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ gender: 'NOT_A_REAL_GENDER' })
      .expect(400);
  });

  it('uploads a photo, serves it statically, and rejects non-image files', async () => {
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    const uploadRes = await request(app.getHttpServer())
      .post('/profiles/me/photos')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('photo', pngBuffer, {
        filename: 'test.png',
        contentType: 'image/png',
      })
      .expect(201);

    const photo = uploadRes.body as PhotoResponseDto;
    expect(photo.isPrimary).toBe(true);

    await request(app.getHttpServer()).get(photo.url).expect(200);

    await request(app.getHttpServer())
      .post('/profiles/me/photos')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('photo', Buffer.from('not an image'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/profiles/me/photos/${photo.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get('/profiles/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((afterDelete.body as ProfileResponseDto).photos).toEqual([]);
  });
});
