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
import type { CallResponseDto } from './../src/chat/dto/call-response.dto';

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

/** NestJS WS exceptions are emitted as a separate 'exception' event, not via the ack callback. */
function emitExpectingException(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 3000,
): Promise<{ status: number; message: string }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for exception on "${event}"`)),
      timeoutMs,
    );
    socket.once('exception', (err: { status: number; message: string }) => {
      clearTimeout(timer);
      resolve(err);
    });
    socket.emit(event, payload);
  });
}

describe('Calls (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let baseUrl: string;

  const suffix = Date.now();
  const emails = {
    alice: `call-alice-${suffix}@example.com`,
    bob: `call-bob-${suffix}@example.com`,
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
          lastName: 'Call',
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

  it('rings the callee, exchanges WebRTC signaling, and ends the call', async () => {
    const aliceSocket = connect(tokens.alice);
    const bobSocket = connect(tokens.bob);
    await Promise.all([
      waitFor(aliceSocket, 'connect'),
      waitFor(bobSocket, 'connect'),
    ]);

    const bobIncoming = waitFor<{
      callId: string;
      callerId: string;
      type: string;
    }>(bobSocket, 'incomingCall');
    const inviteAck = await new Promise<{ callId: string }>((resolve) =>
      aliceSocket.emit(
        'callInvite',
        { conversationId, type: 'VIDEO' },
        resolve,
      ),
    );
    const incoming = await bobIncoming;
    expect(incoming.callId).toBe(inviteAck.callId);
    expect(incoming.callerId).toBe(ids.alice);
    expect(incoming.type).toBe('VIDEO');

    const aliceAccepted = waitFor<{ callId: string }>(
      aliceSocket,
      'callAccepted',
    );
    bobSocket.emit('callAccept', { callId: incoming.callId });
    expect((await aliceAccepted).callId).toBe(incoming.callId);

    const bobGetsOffer = waitFor<{ sdp: { sdp: string }; from: string }>(
      bobSocket,
      'webrtcOffer',
    );
    aliceSocket.emit('webrtcOffer', {
      callId: incoming.callId,
      sdp: { type: 'offer', sdp: 'fake-sdp' },
    });
    const offerEvent = await bobGetsOffer;
    expect(offerEvent.sdp.sdp).toBe('fake-sdp');
    expect(offerEvent.from).toBe(ids.alice);

    const bobGetsEnd = waitFor<{ status: string }>(bobSocket, 'callEnded');
    const endAck = await new Promise<{ status: string }>((resolve) =>
      aliceSocket.emit('callEnd', { callId: incoming.callId }, resolve),
    );
    expect((await bobGetsEnd).status).toBe('ENDED');
    expect(endAck.status).toBe('ENDED');

    aliceSocket.disconnect();
    bobSocket.disconnect();
  });

  it('marks a call MISSED when the caller ends it before the callee answers', async () => {
    const aliceSocket = connect(tokens.alice);
    const bobSocket = connect(tokens.bob);
    await Promise.all([
      waitFor(aliceSocket, 'connect'),
      waitFor(bobSocket, 'connect'),
    ]);

    const bobIncoming = waitFor<{ callId: string }>(bobSocket, 'incomingCall');
    const invite = await new Promise<{ callId: string }>((resolve) =>
      aliceSocket.emit(
        'callInvite',
        { conversationId, type: 'VOICE' },
        resolve,
      ),
    );
    await bobIncoming;

    const bobGetsMissed = waitFor<{ status: string }>(bobSocket, 'callEnded');
    aliceSocket.emit('callEnd', { callId: invite.callId });
    expect((await bobGetsMissed).status).toBe('MISSED');

    aliceSocket.disconnect();
    bobSocket.disconnect();
  });

  it('rejects a second invite while one is already ringing, with the real error message (not "Internal server error")', async () => {
    const aliceSocket = connect(tokens.alice);
    const bobSocket = connect(tokens.bob);
    await Promise.all([
      waitFor(aliceSocket, 'connect'),
      waitFor(bobSocket, 'connect'),
    ]);

    const bobIncoming = waitFor<{ callId: string }>(bobSocket, 'incomingCall');
    const invite = await new Promise<{ callId: string }>((resolve) =>
      aliceSocket.emit(
        'callInvite',
        { conversationId, type: 'VOICE' },
        resolve,
      ),
    );
    await bobIncoming;

    const error = await emitExpectingException(aliceSocket, 'callInvite', {
      conversationId,
      type: 'VOICE',
    });
    expect(error.status).toBe(400);
    expect(error.message).toContain('ongoing call');

    await new Promise((resolve) =>
      aliceSocket.emit('callEnd', { callId: invite.callId }, resolve),
    );
    aliceSocket.disconnect();
    bobSocket.disconnect();
  });

  it('rejects accepting a call you are not part of, with the real error message', async () => {
    const outsider = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `call-outsider-${suffix}@example.com`,
        password,
        firstName: 'Out',
        lastName: 'Sider',
      });
    const outsiderToken = (outsider.body as AuthResponseDto).accessToken;

    const aliceSocket = connect(tokens.alice);
    const bobSocket = connect(tokens.bob);
    const outsiderSocket = connect(outsiderToken);
    await Promise.all([
      waitFor(aliceSocket, 'connect'),
      waitFor(bobSocket, 'connect'),
      waitFor(outsiderSocket, 'connect'),
    ]);

    const bobIncoming = waitFor<{ callId: string }>(bobSocket, 'incomingCall');
    const invite = await new Promise<{ callId: string }>((resolve) =>
      aliceSocket.emit(
        'callInvite',
        { conversationId, type: 'VOICE' },
        resolve,
      ),
    );
    await bobIncoming;

    const error = await emitExpectingException(outsiderSocket, 'callAccept', {
      callId: invite.callId,
    });
    expect(error.status).toBe(403);
    expect(error.message).toContain('not part of this call');

    await new Promise((resolve) =>
      aliceSocket.emit('callEnd', { callId: invite.callId }, resolve),
    );
    aliceSocket.disconnect();
    bobSocket.disconnect();
    outsiderSocket.disconnect();
    await prisma.user.deleteMany({
      where: { email: `call-outsider-${suffix}@example.com` },
    });
  });

  it('ends a ringing call and notifies the callee when the caller disconnects mid-ring', async () => {
    const aliceSocket = connect(tokens.alice);
    const bobSocket = connect(tokens.bob);
    await Promise.all([
      waitFor(aliceSocket, 'connect'),
      waitFor(bobSocket, 'connect'),
    ]);

    const bobIncoming = waitFor<{ callId: string }>(bobSocket, 'incomingCall');
    const invite = await new Promise<{ callId: string }>((resolve) =>
      aliceSocket.emit(
        'callInvite',
        { conversationId, type: 'VOICE' },
        resolve,
      ),
    );
    await bobIncoming;

    // The caller closing the tab / losing network mid-ring, with no
    // explicit callEnd - previously this left the call stuck RINGING
    // forever and silently blocked every future call in the conversation.
    const bobGetsEnd = waitFor<{ callId: string; status: string }>(
      bobSocket,
      'callEnded',
    );
    aliceSocket.disconnect();
    const ended = await bobGetsEnd;
    expect(ended.callId).toBe(invite.callId);
    // Never got past RINGING, so this is a missed call, not an ended one -
    // same convention as endCall() elsewhere.
    expect(ended.status).toBe('MISSED');

    // And the conversation isn't left blocked for a subsequent call.
    const secondAliceSocket = connect(tokens.alice);
    await waitFor(secondAliceSocket, 'connect');
    const secondInvite = await new Promise<{ callId: string }>((resolve) =>
      secondAliceSocket.emit(
        'callInvite',
        { conversationId, type: 'VOICE' },
        resolve,
      ),
    );
    expect(secondInvite.callId).toBeDefined();

    await new Promise((resolve) =>
      secondAliceSocket.emit(
        'callEnd',
        { callId: secondInvite.callId },
        resolve,
      ),
    );
    secondAliceSocket.disconnect();
    bobSocket.disconnect();
  });

  it('ends an already-accepted call as ENDED (not MISSED) when a participant disconnects', async () => {
    const aliceSocket = connect(tokens.alice);
    const bobSocket = connect(tokens.bob);
    await Promise.all([
      waitFor(aliceSocket, 'connect'),
      waitFor(bobSocket, 'connect'),
    ]);

    const bobIncoming = waitFor<{ callId: string }>(bobSocket, 'incomingCall');
    const invite = await new Promise<{ callId: string }>((resolve) =>
      aliceSocket.emit(
        'callInvite',
        { conversationId, type: 'VOICE' },
        resolve,
      ),
    );
    await bobIncoming;

    const aliceAccepted = waitFor(aliceSocket, 'callAccepted');
    bobSocket.emit('callAccept', { callId: invite.callId });
    await aliceAccepted;

    const bobGetsEnd = waitFor<{ callId: string; status: string }>(
      bobSocket,
      'callEnded',
    );
    aliceSocket.disconnect();
    const ended = await bobGetsEnd;
    expect(ended.callId).toBe(invite.callId);
    expect(ended.status).toBe('ENDED');

    bobSocket.disconnect();
  });

  it('reflects calls in REST history with duration tracking', async () => {
    const history = await request(app.getHttpServer())
      .get('/calls')
      .set('Authorization', `Bearer ${tokens.alice}`)
      .expect(200);
    const calls = history.body as CallResponseDto[];

    const ended = calls.find((c) => c.status === 'ENDED');
    expect(ended).toBeDefined();
    expect(ended!.connectedAt).not.toBeNull();
    expect(ended!.durationSeconds).not.toBeNull();

    const missed = calls.find((c) => c.status === 'MISSED');
    expect(missed).toBeDefined();
    expect(missed!.connectedAt).toBeNull();
  });
});
