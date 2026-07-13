import { ApiProperty } from '@nestjs/swagger';
import { Call, CallStatus, CallType } from '@prisma/client';

export class CallResponseDto {
  @ApiProperty()
  callId: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  otherUserId: string;

  @ApiProperty()
  otherFirstName: string;

  @ApiProperty({ enum: CallType })
  type: CallType;

  @ApiProperty({ enum: CallStatus })
  status: CallStatus;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty({ nullable: true })
  connectedAt: Date | null;

  @ApiProperty({ nullable: true })
  endedAt: Date | null;

  @ApiProperty({
    nullable: true,
    description:
      'Duration in seconds, only set once the call has ended and was connected',
  })
  durationSeconds: number | null;

  static fromEntity(
    call: Call,
    otherUserId: string,
    otherFirstName: string,
  ): CallResponseDto {
    const dto = new CallResponseDto();
    dto.callId = call.id;
    dto.conversationId = call.conversationId;
    dto.otherUserId = otherUserId;
    dto.otherFirstName = otherFirstName;
    dto.type = call.type;
    dto.status = call.status;
    dto.startedAt = call.startedAt;
    dto.connectedAt = call.connectedAt;
    dto.endedAt = call.endedAt;
    dto.durationSeconds =
      call.connectedAt && call.endedAt
        ? Math.round(
            (call.endedAt.getTime() - call.connectedAt.getTime()) / 1000,
          )
        : null;
    return dto;
  }
}
