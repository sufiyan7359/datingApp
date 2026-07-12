import { ApiProperty } from '@nestjs/swagger';

export class SwipeLimitsDto {
  @ApiProperty()
  likesRemaining: number;

  @ApiProperty()
  superLikesRemaining: number;

  @ApiProperty()
  undosRemaining: number;

  @ApiProperty()
  boostsRemaining: number;
}
