import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from './conversations.service';
import { PresenceService } from './presence.service';
import { BlocksService } from '../safety/blocks.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';

const MESSAGE_INCLUDE = { reactions: true } as const;
const HISTORY_PAGE_SIZE = 30;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly presence: PresenceService,
    private readonly blocks: BlocksService,
  ) {}

  async sendMessage(
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const conversation =
      await this.conversationsService.getAuthorizedConversation(
        dto.conversationId,
        senderId,
      );

    const otherUserId = this.conversationsService.otherUserId(
      conversation,
      senderId,
    );
    if (await this.blocks.isBlockedEitherDirection(senderId, otherUserId)) {
      throw new ForbiddenException('You cannot message this user');
    }

    if (dto.replyToId) {
      const replyTarget = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
      });
      if (!replyTarget || replyTarget.conversationId !== dto.conversationId) {
        throw new BadRequestException(
          'Cannot reply to a message outside this conversation',
        );
      }
    }

    const recipientOnline = this.presence.isOnline(otherUserId);

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId,
        type: dto.type ?? 'TEXT',
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        replyToId: dto.replyToId,
        deliveredAt: recipientOnline ? new Date() : null,
      },
      include: MESSAGE_INCLUDE,
    });

    return MessageResponseDto.fromEntity(message);
  }

  async markDelivered(messageId: string): Promise<MessageResponseDto> {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { deliveredAt: new Date() },
      include: MESSAGE_INCLUDE,
    });
    return MessageResponseDto.fromEntity(message);
  }

  async markRead(
    userId: string,
    conversationId: string,
    upToMessageId: string,
  ): Promise<string[]> {
    await this.conversationsService.getAuthorizedConversation(
      conversationId,
      userId,
    );

    const upToMessage = await this.prisma.message.findUnique({
      where: { id: upToMessageId },
    });
    if (!upToMessage || upToMessage.conversationId !== conversationId) {
      throw new BadRequestException('Message not found in this conversation');
    }

    const toMark = await this.prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
        createdAt: { lte: upToMessage.createdAt },
      },
      select: { id: true },
    });

    await this.prisma.message.updateMany({
      where: { id: { in: toMark.map((m) => m.id) } },
      data: { readAt: new Date() },
    });

    return toMark.map((m) => m.id);
  }

  async deleteMessage(
    userId: string,
    messageId: string,
  ): Promise<{ conversationId: string }> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null, mediaUrl: null },
    });

    return { conversationId: message.conversationId };
  }

  async reactToMessage(
    userId: string,
    messageId: string,
    emoji: string,
  ): Promise<{ conversationId: string; added: boolean }> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.conversationsService.getAuthorizedConversation(
      message.conversationId,
      userId,
    );

    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
      return { conversationId: message.conversationId, added: false };
    }

    await this.prisma.messageReaction.create({
      data: { messageId, userId, emoji },
    });
    return { conversationId: message.conversationId, added: true };
  }

  async togglePin(
    userId: string,
    messageId: string,
    pinned: boolean,
  ): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    await this.conversationsService.getAuthorizedConversation(
      message.conversationId,
      userId,
    );

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: pinned },
      include: MESSAGE_INCLUDE,
    });
    return MessageResponseDto.fromEntity(updated);
  }

  async listPinned(
    userId: string,
    conversationId: string,
  ): Promise<MessageResponseDto[]> {
    await this.conversationsService.getAuthorizedConversation(
      conversationId,
      userId,
    );
    const messages = await this.prisma.message.findMany({
      where: { conversationId, isPinned: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: MESSAGE_INCLUDE,
    });
    return messages.map((m) => MessageResponseDto.fromEntity(m));
  }

  async listMessages(
    userId: string,
    conversationId: string,
    before?: string,
  ): Promise<MessageResponseDto[]> {
    await this.conversationsService.getAuthorizedConversation(
      conversationId,
      userId,
    );

    const cursorMessage = before
      ? await this.prisma.message.findUnique({ where: { id: before } })
      : null;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(cursorMessage
          ? { createdAt: { lt: cursorMessage.createdAt } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_PAGE_SIZE,
      include: MESSAGE_INCLUDE,
    });

    return messages.reverse().map((m) => MessageResponseDto.fromEntity(m));
  }

  async searchMessages(
    userId: string,
    conversationId: string,
    query: string,
  ): Promise<MessageResponseDto[]> {
    await this.conversationsService.getAuthorizedConversation(
      conversationId,
      userId,
    );

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        content: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: MESSAGE_INCLUDE,
    });

    return messages.map((m) => MessageResponseDto.fromEntity(m));
  }
}
