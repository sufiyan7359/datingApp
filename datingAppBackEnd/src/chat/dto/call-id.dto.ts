import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CallIdDto {
  @ApiProperty()
  @IsUUID()
  callId: string;
}
