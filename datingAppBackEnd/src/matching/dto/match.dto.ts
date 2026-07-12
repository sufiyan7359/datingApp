import { ApiProperty } from '@nestjs/swagger';
import { PhotoResponseDto } from '../../profiles/dto/photo-response.dto';

export class MatchDto {
  @ApiProperty()
  matchId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ type: [PhotoResponseDto] })
  photos: PhotoResponseDto[];

  @ApiProperty()
  matchedAt: Date;
}
