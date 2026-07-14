import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { EmailService } from './../src/email/email.service';

describe('Contact (e2e)', () => {
  let app: INestApplication<App>;

  const emailServiceMock = {
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('sends the message to support without requiring auth', async () => {
    emailServiceMock.send.mockClear();
    await request(app.getHttpServer())
      .post('/contact')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'Question about Premium',
        message: 'Hi, I wanted to ask about the boost feature.',
      })
      .expect(204);

    expect(emailServiceMock.send).toHaveBeenCalledTimes(1);
    const [to, subject, html] = emailServiceMock.send.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(to).toContain('@');
    expect(subject).toContain('Question about Premium');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('jane@example.com');
  });

  it('rejects an invalid email address', async () => {
    await request(app.getHttpServer())
      .post('/contact')
      .send({
        name: 'Jane Doe',
        email: 'not-an-email',
        subject: 'Hi',
        message: 'Hello there',
      })
      .expect(400);
  });

  it('rejects a missing message', async () => {
    await request(app.getHttpServer())
      .post('/contact')
      .send({
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'Hi',
        message: '',
      })
      .expect(400);
  });
});
