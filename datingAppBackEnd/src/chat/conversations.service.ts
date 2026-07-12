import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from './presence.service';
import { PhotoResponseDto } from '../profiles/dto/photo-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  /** Verifies the user is a participant and returns the conversation with its match. */
  async getAuthorizedConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (
      conversation.match.userAId !== userId &&
      conversation.match.userBId !== userId
    ) {
      throw new ForbiddenException('You are not part of this conversation');
    }
    return conversation;
  }

  otherUserId(
    conversation: { match: { userAId: string; userBId: string } },
    userId: string,
  ): string {
    return conversation.match.userAId === userId
      ? conversation.match.userBId
      : conversation.match.userAId;
  }

  async listConversations(userId: string): Promise<ConversationResponseDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { match: { OR: [{ userAId: userId }, { userBId: userId }] } },
      include: {
        match: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { reactions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const otherUserIds = conversations.map((c) => this.otherUserId(c, userId));
    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: otherUserIds } },
      include: { photos: true, user: { select: { firstName: true } } },
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));

    const unreadCounts = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
        senderId: { not: userId },
        readAt: null,
        deletedAt: null,
      },
      _count: true,
    });
    const unreadByConversation = new Map(
      unreadCounts.map((u) => [u.conversationId, u._count]),
    );

    return conversations.map((conversation) => {
      const otherId = this.otherUserId(conversation, userId);
      const profile = profileByUserId.get(otherId);
      const lastMessage = conversation.messages[0];

      return {
        conversationId: conversation.id,
        otherUserId: otherId,
        otherFirstName: profile?.user.firstName ?? '',
        otherPhotos: (profile?.photos ?? [])
          .sort((a, b) => a.order - b.order)
          .map((p) => PhotoResponseDto.fromEntity(p)),
        otherIsOnline: this.presence.isOnline(otherId),
        lastMessage: lastMessage
          ? MessageResponseDto.fromEntity(lastMessage)
          : null,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
      };
    });
  }
}
