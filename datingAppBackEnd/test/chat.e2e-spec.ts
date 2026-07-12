import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { io, Socket } from 'socket.io-client';
import { AddressInfo } from 'net';
import type { Server } from 'http';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import type { AuthResponseDto } from './../src/auth/dto/auth-response.dto';
import type { SwipeResultDto } from './../src/matching/dto/swipe-result.dto';
import type { ConversationResponseDto } from './../src/chat/dto/conversation-response.dto';
import type { MessageResponseDto } from './../src/chat/dto/message-response.dto';

function waitFor<T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe('Chat (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let baseUrl: string;

  const suffix = Date.now();
  const emails = {
    alice: `chat-alice-${suffix}@example.com`,
    bob: `chat-bob-${suffix}@example.com`,
  };
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  const password = 'Str0ngPass123';
  let conversationId: string;

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
    await app.listen(0);

    const address = (app.getHttpServer() as Server).address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    prisma = moduleFixture.get(PrismaService);

    for (const key of ['alice', 'bob'] as const) {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: emails[key],
          password,
          firstName: key,
          lastName: 'Chat',
        });
      const body = res.body as AuthResponseDto;
      tokens[key] = body.accessToken;
      ids[key] = body.user.id;
    }

    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({
        gender: 'FEMALE',
        interestedIn: ['MALE'],
        dateOfBirth: '1996-01-01',
        onboardingCompleted: true,
      });
    await request(app.getHttpServer())
      .patch('/profiles/me')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({
        gender: 'MALE',
        interestedIn: ['FEMALE'],
        dateOfBirth: '1994-01-01',
        onboardingCompleted: true,
      });

    await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .send({ targetUserId: ids.bob, action: 'LIKE' });
    const matchRes = await request(app.getHttpServer())
      .post('/swipes')
      .set('Authorization', `Bearer ${tokens.bob}`)
      .send({ targetUserId: ids.alice, action: 'LIKE' });
    expect((matchRes.body as SwipeResultDto).isMatch).toBe(true);

    const conversationsRes = await request(app.getHttpServer())
      .get('/conversations')
      .set('Authorization', `Bearer ${tokens.alice}`);
    conversationId = (conversationsRes.body as ConversationResponseDto[])[0]
      .conversationId;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  function connect(token: string): Socket {
    return io(`${baseUrl}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });
  }

  it('rejects a socket connection with an invalid token', async () => {
    const badSocket = connect('not-a-real-token');
    const reason = await waitFor<string>(badSocket, 'disconnect');
    expect(reason).toBe('io server disconnect');
    badSocket.disconnect();
  });

  it('delivers messages in real time, with typing, read receipts, reactions, and delete', async () => {
    const aliceSocket = connect(tokens.alice);
    const bobSocket = connect(tokens.bob);
    await Promise.all([
      waitFor(aliceSocket, 'connect'),
      waitFor(bobSocket, 'connect'),
    ]);

    const bobReceives = waitFor<MessageResponseDto>(bobSocket, 'newMessage');
    aliceSocket.emit('sendMessage', {
      conversationId,
      type: 'TEXT',
      content: 'Hey Bob!',
    });
    const firstMessage = await bobReceives;
    expect(firstMessage.content).toBe('Hey Bob!');
    expect(firstMessage.senderId).toBe(ids.alice);

    const aliceTyping = waitFor<{ userId: string; isTyping: boolean }>(
      aliceSocket,
      'typing',
    );
    bobSocket.emit('typing', { conversationId, isTyping: true });
    const typingEvent = await aliceTyping;
    expect(typingEvent.isTyping).toBe(true);
    expect(typingEvent.userId).toBe(ids.bob);

    const aliceReceives = waitFor<MessageResponseDto>(
      aliceSocket,
      'newMessage',
    );
    bobSocket.emit('sendMessage', {
      conversationId,
      type: 'TEXT',
      content: 'Hi Alice!',
      replyToId: firstMessage.id,
    });
    const replyMessage = await aliceReceives;
    expect(replyMessage.replyToId).toBe(firstMessage.id);
    expect(replyMessage.deliveredAt).not.toBeNull();

    const bobReadReceipt = waitFor<{ readerId: string; messageIds: string[] }>(
      bobSocket,
      'messagesRead',
    );
    aliceSocket.emit('markRead', {
      conversationId,
      upToMessageId: replyMessage.id,
    });
    const readEvent = await bobReadReceipt;
    expect(readEvent.readerId).toBe(ids.alice);
    expect(readEvent.messageIds).toContain(replyMessage.id);

    const bobSeesReaction = waitFor<{ emoji: string; added: boolean }>(
      bobSocket,
      'messageReaction',
    );
    aliceSocket.emit('reactToMessage', {
      messageId: replyMessage.id,
      emoji: '❤️',
    });
    const reactionEvent = await bobSeesReaction;
    expect(reactionEvent.emoji).toBe('❤️');
    expect(reactionEvent.added).toBe(true);

    const bobSeesDelete = waitFor<{ messageId: string }>(
      bobSocket,
      'messageDeleted',
    );
    aliceSocket.emit('deleteMessage', { messageId: firstMessage.id });
    const deleteEvent = await bobSeesDelete;
    expect(deleteEvent.messageId).toBe(firstMessage.id);

    const alicePresence = waitFor<{ userId: string; online: boolean }>(
      aliceSocket,
      'presence',
    );
    bobSocket.disconnect();
    const presenceEvent = await alicePresence;
    expect(presenceEvent).toEqual({ userId: ids.bob, online: false });

    aliceSocket.disconnect();
  });

  it('reflects the conversation in REST history, search, and pinning', async () => {
    const history = await request(app.getHttpServer())
      .get(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    const messages = history.body as MessageResponseDto[];

    const deletedMessage = messages.find(
      (m) => m.content === null && m.deletedAt !== null,
    );
    expect(deletedMessage).toBeDefined();

    const replyMessage = messages.find((m) => m.content === 'Hi Alice!');
    expect(replyMessage).toBeDefined();
    expect(replyMessage!.reactions).toEqual([
      { emoji: '❤️', userId: ids.alice },
    ]);

    const search = await request(app.getHttpServer())
      .get(`/conversations/${conversationId}/messages/search?q=Alice`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (search.body as MessageResponseDto[]).some(
        (m) => m.content === 'Hi Alice!',
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post(`/conversations/${conversationId}/messages/${replyMessage!.id}/pin`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(201);

    const pinned = await request(app.getHttpServer())
      .get(`/conversations/${conversationId}/pinned`)
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    expect(
      (pinned.body as MessageResponseDto[]).some(
        (m) => m.id === replyMessage!.id,
      ),
    ).toBe(true);
  });

  it('rejects access to a conversation you are not part of', async () => {
    const outsider = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `chat-outsider-${suffix}@example.com`,
        password,
        firstName: 'Out',
        lastName: 'Sider',
      });
    const outsiderToken = (outsider.body as AuthResponseDto).accessToken;

    await request(app.getHttpServer())
      .get(`/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);

    await prisma.user.deleteMany({
      where: { email: `chat-outsider-${suffix}@example.com` },
    });
  });
});
