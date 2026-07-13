import { ApiProperty } from '@nestjs/swagger';
import { Role, SubscriptionTier, User } from '@prisma/client';

export class AdminUserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: SubscriptionTier })
  subscriptionTier: SubscriptionTier;

  @ApiProperty()
  onboardingCompleted: boolean;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  reportsReceivedCount: number;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(
    user: User & {
      profile: {
        onboardingCompleted: boolean;
        verificationStatus: string;
      } | null;
    },
    subscriptionTier: SubscriptionTier,
    reportsReceivedCount: number,
  ): AdminUserSummaryDto {
    const dto = new AdminUserSummaryDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.isActive = user.isActive;
    dto.role = user.role;
    dto.subscriptionTier = subscriptionTier;
    dto.onboardingCompleted = user.profile?.onboardingCompleted ?? false;
    dto.isVerified = user.profile?.verificationStatus === 'APPROVED';
    dto.reportsReceivedCount = reportsReceivedCount;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
