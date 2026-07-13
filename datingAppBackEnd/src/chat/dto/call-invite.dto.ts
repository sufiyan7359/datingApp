import { ApiProperty } from '@nestjs/swagger';
import { CallType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CallInviteDto {
  @ApiProperty()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ enum: CallType })
  @IsEnum(CallType)
  type: CallType;
}
