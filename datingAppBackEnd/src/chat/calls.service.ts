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
      throw new BadRequestException(
        'There is already an ongoing call in this conversation',
      );
    }

    const call = await this.prisma.call.create({
      data: { conversationId, callerId, calleeId, type },
    });

    return { call, calleeId };
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
