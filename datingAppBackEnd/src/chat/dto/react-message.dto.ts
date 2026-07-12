import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class ReactMessageDto {
  @ApiProperty()
  @IsUUID()
  messageId: string;

  @ApiProperty({ example: '❤️' })
  @IsString()
  @MaxLength(8)
  emoji: string;
}
