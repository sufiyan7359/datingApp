import { ApiProperty } from '@nestjs/swagger';
import { SwipeAction } from '@prisma/client';
import { MatchDto } from './match.dto';

export class SwipeResultDto {
  @ApiProperty()
  targetUserId: string;

  @ApiProperty({ enum: SwipeAction })
  action: SwipeAction;

  @ApiProperty()
  isMatch: boolean;

  @ApiProperty({ type: MatchDto, nullable: true })
  match: MatchDto | null;
}
