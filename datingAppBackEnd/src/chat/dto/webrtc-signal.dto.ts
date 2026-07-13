import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsUUID } from 'class-validator';

export class WebrtcSdpDto {
  @ApiProperty()
  @IsUUID()
  callId: string;

  @ApiProperty({ description: 'RTCSessionDescriptionInit' })
  @IsObject()
  sdp: Record<string, unknown>;
}

export class WebrtcIceCandidateDto {
  @ApiProperty()
  @IsUUID()
  callId: string;

  @ApiProperty({ description: 'RTCIceCandidateInit' })
  @IsObject()
  candidate: Record<string, unknown>;
}
