import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class MessageIdDto {
  @ApiProperty()
  @IsUUID()
  messageId: string;
}
