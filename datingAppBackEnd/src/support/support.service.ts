import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { SupportMessageResponseDto } from './dto/support-message-response.dto';
import {
  AdminSupportThreadsPageDto,
  AdminSupportThreadSummaryDto,
  SupportThreadResponseDto,
} from './dto/support-thread-response.dto';

const MESSAGE_PAGE_SIZE = 200;
// Unique-constraint violation - Prisma's upsert isn't atomic against a
// genuine race (two requests both finding no row and both trying to
// create one), so the loser here just means the winner's row already
// exists - re-reading it is the correct recovery, not a real error.
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
// Foreign-key violation - the userId doesn't correspond to a real user
// (e.g. deleted between page load and action).
const FOREIGN_KEY_VIOLATION = 'P2003';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getOrCreateThread(userId: string) {
    try {
      return await this.prisma.supportThread.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === UNIQUE_CONSTRAINT_VIOLATION) {
          const thread = await this.prisma.supportThread.findUnique({ where: { userId } });
          if (thread) return thread;
        }
        if (err.code === FOREIGN_KEY_VIOLATION) {
          throw new NotFoundException('User not found');
        }
      }
      throw err;
    }
  }

  async getThreadForUser(userId: string): Promise<SupportThreadResponseDto> {
    const thread = await this.getOrCreateThread(userId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_PAGE_SIZE,
    });
    return SupportThreadResponseDto.build(
      thread,
      messages,
      thread.unreadForUser,
    );
  }

  async getThreadForAdmin(
    userId: string,
  ): Promise<SupportThreadResponseDto> {
    const thread = await this.getOrCreateThread(userId);
    const messages = await this.prisma.supportMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: MESSAGE_PAGE_SIZE,
    });
    return SupportThreadResponseDto.build(
      thread,
      messages,
      thread.unreadForAdmin,
    );
  }

  async listThreadsForAdmin(
    page = 1,
    limit = 20,
  ): Promise<AdminSupportThreadsPageDto> {
    const [threads, total] = await Promise.all([
      this.prisma.supportThread.findMany({
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.supportThread.count(),
    ]);

    return {
      results: threads.map((t) => AdminSupportThreadSummaryDto.fromEntity(t)),
      page,
      limit,
      total,
    };
  }

  async sendMessage(
    userId: string,
    senderId: string,
    isFromAdmin: boolean,
    content: string,
  ): Promise<SupportMessageResponseDto> {
    const thread = await this.getOrCreateThread(userId);
    const message = await this.prisma.supportMessage.create({
      data: { threadId: thread.id, senderId, isFromAdmin, content },
    });

    await this.prisma.supportThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: message.createdAt,
        status: 'OPEN',
        ...(isFromAdmin
          ? { unreadForUser: { increment: 1 } }
          : { unreadForAdmin: { increment: 1 } }),
      },
    });

    const dto = SupportMessageResponseDto.fromEntity(message);
    if (isFromAdmin) {
      // The consumer app's socket gateway already joins every authenticated
      // connection to a `user:{id}` room (used today for call invites) - so
      // an admin reply reaches the user live with no new room-join logic.
      this.chatGateway.server.to(`user:${userId}`).emit('supportMessage', dto);
    }
    return dto;
  }

  async markRead(userId: string, asAdmin: boolean): Promise<void> {
    const thread = await this.getOrCreateThread(userId);
    await this.prisma.$transaction([
      this.prisma.supportThread.update({
        where: { id: thread.id },
        data: asAdmin ? { unreadForAdmin: 0 } : { unreadForUser: 0 },
      }),
      this.prisma.supportMessage.updateMany({
        where: {
          threadId: thread.id,
          isFromAdmin: !asAdmin,
          readAt: null,
        },
        data: { readAt: new Date() },
      }),
    ]);
  }
}
