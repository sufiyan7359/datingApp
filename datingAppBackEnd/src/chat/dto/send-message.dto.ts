import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { MessageType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiPropertyOptional({ enum: MessageType, default: 'TEXT' })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = 'TEXT';

  @ApiPropertyOptional()
  @ValidateIf((dto: SendMessageDto) => !dto.mediaUrl)
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: SendMessageDto) => !dto.content)
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
