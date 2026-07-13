import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from './presence.service';
import { BlocksService } from '../safety/blocks.service';
import { PhotoResponseDto } from '../profiles/dto/photo-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly blocks: BlocksService,
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
    const allConversations = await this.prisma.conversation.findMany({
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

    // Once blocked (in either direction), the thread disappears from both
    // people's conversation lists - it isn't deleted, just hidden.
    const blockedIds = new Set(
      await this.blocks.blockedEitherDirectionIds(userId),
    );
    const conversations = allConversations.filter(
      (c) => !blockedIds.has(this.otherUserId(c, userId)),
    );

    const otherUserIds = conversations.map((c) => this.otherUserId(c, userId));
    const [profiles, mutes] = await Promise.all([
      this.prisma.profile.findMany({
        where: { userId: { in: otherUserIds } },
        include: { photos: true, user: { select: { firstName: true } } },
      }),
      this.prisma.mutedConversation.findMany({
        where: {
          userId,
          conversationId: { in: conversations.map((c) => c.id) },
        },
      }),
    ]);
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));
    const mutedConversationIds = new Set(mutes.map((m) => m.conversationId));

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
        otherIsOnline: profile?.hideOnlineStatus
          ? false
          : this.presence.isOnline(otherId),
        lastMessage: lastMessage
          ? MessageResponseDto.fromEntity(lastMessage)
          : null,
        unreadCount: unreadByConversation.get(conversation.id) ?? 0,
        isMuted: mutedConversationIds.has(conversation.id),
      };
    });
  }

  async setMuted(
    userId: string,
    conversationId: string,
    muted: boolean,
  ): Promise<void> {
    await this.getAuthorizedConversation(conversationId, userId);
    if (muted) {
      await this.prisma.mutedConversation.upsert({
        where: { userId_conversationId: { userId, conversationId } },
        update: {},
        create: { userId, conversationId },
      });
    } else {
      await this.prisma.mutedConversation.deleteMany({
        where: { userId, conversationId },
      });
    }
  }
}
