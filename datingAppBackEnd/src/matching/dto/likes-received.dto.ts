import { ApiProperty } from '@nestjs/swagger';
import { SwipeAction } from '@prisma/client';
import { PhotoResponseDto } from '../../profiles/dto/photo-response.dto';

export class LikeReceivedItemDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty({ type: [PhotoResponseDto] })
  photos: PhotoResponseDto[];

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ enum: SwipeAction })
  action: SwipeAction;

  @ApiProperty()
  likedAt: Date;
}

export class LikesReceivedDto {
  @ApiProperty({
    description: 'Total number of people who liked you and are not yet matched',
  })
  count: number;

  @ApiProperty({
    description:
      'Whether the full profile list below is populated (premium) or just the count (free)',
  })
  isPremium: boolean;

  @ApiProperty({ type: [LikeReceivedItemDto] })
  likes: LikeReceivedItemDto[];
}
