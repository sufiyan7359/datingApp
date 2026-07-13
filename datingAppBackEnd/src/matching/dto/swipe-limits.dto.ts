import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier } from '@prisma/client';

export class SwipeLimitsDto {
  @ApiProperty({ enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty()
  likesRemaining: number;

  @ApiProperty()
  likesUnlimited: boolean;

  @ApiProperty()
  superLikesRemaining: number;

  @ApiProperty()
  superLikesUnlimited: boolean;

  @ApiProperty()
  undosRemaining: number;

  @ApiProperty()
  undosUnlimited: boolean;

  @ApiProperty()
  boostsRemaining: number;
}
