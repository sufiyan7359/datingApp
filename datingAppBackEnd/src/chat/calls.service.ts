import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CallType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from './conversations.service';
import { BlocksService } from '../safety/blocks.service';
import { CallResponseDto } from './dto/call-response.dto';

// A call that's been RINGING longer than this never got a response and is
// treated as abandoned rather than genuinely ongoing - the caller closing
// the tab, losing network, or navigating away mid-ring leaves nothing to
// transition it out of RINGING, so without this window it would block
// every future call in that conversation forever (this is also covered
// more directly by endCallsForDisconnectedUser below; this is the
// fallback for when disconnection itself was never observed, e.g. the
// process died without a clean socket close).
const STALE_RINGING_MS = 60_000;

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly blocks: BlocksService,
  ) {}

  async inviteCall(callerId: string, conversationId: string, type: CallType) {
    const conversation =
      await this.conversationsService.getAuthorizedConversation(
        conversationId,
        callerId,
      );
    const calleeId = this.conversationsService.otherUserId(
      conversation,
      callerId,
    );

    if (await this.blocks.isBlockedEitherDirection(callerId, calleeId)) {
      throw new ForbiddenException('You cannot call this user');
    }

    const ongoing = await this.prisma.call.findFirst({
      where: { conversationId, status: { in: ['RINGING', 'ACTIVE'] } },
    });
    if (ongoing) {
      const isStaleRinging =
        ongoing.status === 'RINGING' &&
        Date.now() - ongoing.startedAt.getTime() > STALE_RINGING_MS;
      if (!isStaleRinging) {
        throw new BadRequestException(
          'There is already an ongoing call in this conversation',
        );
      }
      await this.prisma.call.update({
        where: { id: ongoing.id },
        data: { status: 'MISSED', endedAt: new Date() },
      });
    }

    const call = await this.prisma.call.create({
      data: { conversationId, callerId, calleeId, type },
    });

    return { call, calleeId };
  }

  /**
   * Called from ChatGateway.handleDisconnect when a user's last socket
   * drops. Without this, a caller who closes the tab / loses network mid-
   * ring or mid-call leaves that call stuck in RINGING/ACTIVE forever (see
   * STALE_RINGING_MS above for the RINGING half of this same gap) - the
   * other party's UI would show "Ringing…"/"In call" indefinitely with no
   * way to know the other side is gone.
   */
  async endCallsForDisconnectedUser(
    userId: string,
  ): Promise<Array<{ callId: string; otherUserId: string; status: string }>> {
    const openCalls = await this.prisma.call.findMany({
      where: {
        status: { in: ['RINGING', 'ACTIVE'] },
        OR: [{ callerId: userId }, { calleeId: userId }],
      },
    });
    if (openCalls.length === 0) return [];

    // Same convention as endCall(): a call that never got past RINGING was
    // never connected, so it's a MISSED call rather than an ENDED one.
    await Promise.all(
      openCalls.map((call) =>
        this.prisma.call.update({
          where: { id: call.id },
          data: {
            status: call.status === 'RINGING' ? 'MISSED' : 'ENDED',
            endedAt: new Date(),
          },
        }),
      ),
    );

    return openCalls.map((call) => ({
      callId: call.id,
      otherUserId: call.callerId === userId ? call.calleeId : call.callerId,
      status: call.status === 'RINGING' ? 'MISSED' : 'ENDED',
    }));
  }

  private async getCallForParticipant(callId: string, userId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) {
      throw new NotFoundException('Call not found');
    }
    if (call.callerId !== userId && call.calleeId !== userId) {
      throw new ForbiddenException('You are not part of this call');
    }
    return call;
  }

  async acceptCall(userId: string, callId: string) {
    const call = await this.getCallForParticipant(callId, userId);
    if (call.calleeId !== userId) {
      throw new ForbiddenException('Only the callee can accept a call');
    }
    if (call.status !== 'RINGING') {
      throw new BadRequestException('This call is no longer ringing');
    }

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: { status: 'ACTIVE', connectedAt: new Date() },
    });
    return { call: updated, otherUserId: call.callerId };
  }

  async declineCall(userId: string, callId: string) {
    const call = await this.getCallForParticipant(callId, userId);
    if (call.calleeId !== userId) {
      throw new ForbiddenException('Only the callee can decline a call');
    }
    if (call.status !== 'RINGING') {
      throw new BadRequestException('This call is no longer ringing');
    }

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: { status: 'DECLINED', endedAt: new Date() },
    });
    return { call: updated, otherUserId: call.callerId };
  }

  async endCall(userId: string, callId: string) {
    const call = await this.getCallForParticipant(callId, userId);
    if (
      call.status === 'ENDED' ||
      call.status === 'MISSED' ||
      call.status === 'DECLINED'
    ) {
      return {
        call,
        otherUserId: call.callerId === userId ? call.calleeId : call.callerId,
      };
    }

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: call.status === 'RINGING' ? 'MISSED' : 'ENDED',
        endedAt: new Date(),
      },
    });
    const otherUserId =
      call.callerId === userId ? call.calleeId : call.callerId;
    return { call: updated, otherUserId };
  }

  async relayTargetFor(callId: string, senderId: string): Promise<string> {
    const call = await this.getCallForParticipant(callId, senderId);
    return call.callerId === senderId ? call.calleeId : call.callerId;
  }

  async listCalls(userId: string): Promise<CallResponseDto[]> {
    const calls = await this.prisma.call.findMany({
      where: { OR: [{ callerId: userId }, { calleeId: userId }] },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    const otherUserIds = calls.map((c) =>
      c.callerId === userId ? c.calleeId : c.callerId,
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: otherUserIds } },
      select: { id: true, firstName: true },
    });
    const nameByUserId = new Map(users.map((u) => [u.id, u.firstName]));

    return calls.map((call) => {
      const otherUserId =
        call.callerId === userId ? call.calleeId : call.callerId;
      return CallResponseDto.fromEntity(
        call,
        otherUserId,
        nameByUserId.get(otherUserId) ?? '',
      );
    });
  }
}
