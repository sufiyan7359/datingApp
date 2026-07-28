import { ApiProperty } from '@nestjs/swagger';
import { PhotoResponseDto } from '../../profiles/dto/photo-response.dto';
import { MessageResponseDto } from './message-response.dto';

export class ConversationResponseDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  otherUserId: string;

  @ApiProperty()
  otherFirstName: string;

  @ApiProperty({ type: [PhotoResponseDto] })
  otherPhotos: PhotoResponseDto[];

  @ApiProperty()
  otherIsVerified: boolean;

  @ApiProperty({ nullable: true })
  otherIsOnline: boolean;

  @ApiProperty({ type: MessageResponseDto, nullable: true })
  lastMessage: MessageResponseDto | null;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  isMuted: boolean;
}
