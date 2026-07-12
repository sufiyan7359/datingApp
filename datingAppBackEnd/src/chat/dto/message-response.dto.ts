import { ApiProperty } from '@nestjs/swagger';
import { Message, MessageReaction, MessageType } from '@prisma/client';

export class ReactionSummaryDto {
  @ApiProperty()
  emoji: string;

  @ApiProperty()
  userId: string;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty({ enum: MessageType })
  type: MessageType;

  @ApiProperty({ nullable: true })
  content: string | null;

  @ApiProperty({ nullable: true })
  mediaUrl: string | null;

  @ApiProperty({ nullable: true })
  replyToId: string | null;

  @ApiProperty()
  isPinned: boolean;

  @ApiProperty({ nullable: true })
  deliveredAt: Date | null;

  @ApiProperty({ nullable: true })
  readAt: Date | null;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [ReactionSummaryDto] })
  reactions: ReactionSummaryDto[];

  static fromEntity(
    message: Message & { reactions?: MessageReaction[] },
  ): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = message.id;
    dto.conversationId = message.conversationId;
    dto.senderId = message.senderId;
    dto.type = message.type;
    dto.content = message.deletedAt ? null : message.content;
    dto.mediaUrl = message.deletedAt ? null : message.mediaUrl;
    dto.replyToId = message.replyToId;
    dto.isPinned = message.isPinned;
    dto.deliveredAt = message.deliveredAt;
    dto.readAt = message.readAt;
    dto.deletedAt = message.deletedAt;
    dto.createdAt = message.createdAt;
    dto.reactions = (message.reactions ?? []).map((r) => ({
      emoji: r.emoji,
      userId: r.userId,
    }));
    return dto;
  }
}
