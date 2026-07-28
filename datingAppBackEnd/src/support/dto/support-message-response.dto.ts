import { ApiProperty } from '@nestjs/swagger';
import { SupportMessage } from '@prisma/client';

export class SupportMessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  threadId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty()
  isFromAdmin: boolean;

  @ApiProperty()
  content: string;

  @ApiProperty({ nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(message: SupportMessage): SupportMessageResponseDto {
    const dto = new SupportMessageResponseDto();
    dto.id = message.id;
    dto.threadId = message.threadId;
    dto.senderId = message.senderId;
    dto.isFromAdmin = message.isFromAdmin;
    dto.content = message.content;
    dto.readAt = message.readAt;
    dto.createdAt = message.createdAt;
    return dto;
  }
}
