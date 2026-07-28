import { ApiProperty } from '@nestjs/swagger';
import {
  SupportMessage,
  SupportThread,
  SupportThreadStatus,
  User,
} from '@prisma/client';
import { SupportMessageResponseDto } from './support-message-response.dto';

export class SupportThreadResponseDto {
  @ApiProperty()
  threadId: string;

  @ApiProperty({ enum: SupportThreadStatus })
  status: SupportThreadStatus;

  @ApiProperty({
    description: "Unread count from the requesting side's perspective",
  })
  unreadCount: number;

  @ApiProperty({ type: [SupportMessageResponseDto] })
  messages: SupportMessageResponseDto[];

  static build(
    thread: SupportThread,
    messages: SupportMessage[],
    unreadCount: number,
  ): SupportThreadResponseDto {
    const dto = new SupportThreadResponseDto();
    dto.threadId = thread.id;
    dto.status = thread.status;
    dto.unreadCount = unreadCount;
    dto.messages = messages.map((m) =>
      SupportMessageResponseDto.fromEntity(m),
    );
    return dto;
  }
}

export class AdminSupportThreadSummaryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  lastMessage: string | null;

  @ApiProperty()
  lastMessageAt: Date;

  @ApiProperty()
  unreadForAdmin: number;

  @ApiProperty({ enum: SupportThreadStatus })
  status: SupportThreadStatus;

  static fromEntity(
    thread: SupportThread & {
      user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
      messages: Pick<SupportMessage, 'content'>[];
    },
  ): AdminSupportThreadSummaryDto {
    const dto = new AdminSupportThreadSummaryDto();
    dto.userId = thread.user.id;
    dto.firstName = thread.user.firstName;
    dto.lastName = thread.user.lastName;
    dto.email = thread.user.email;
    dto.lastMessage = thread.messages[0]?.content ?? null;
    dto.lastMessageAt = thread.lastMessageAt;
    dto.unreadForAdmin = thread.unreadForAdmin;
    dto.status = thread.status;
    return dto;
  }
}

export class AdminSupportThreadsPageDto {
  @ApiProperty({ type: [AdminSupportThreadSummaryDto] })
  results: AdminSupportThreadSummaryDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}
