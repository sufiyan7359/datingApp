import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  suspendedUsers: number;

  @ApiProperty()
  newUsersLast7Days: number;

  @ApiProperty()
  totalMatches: number;

  @ApiProperty()
  totalMessages: number;

  @ApiProperty()
  premiumSubscribers: number;

  @ApiProperty({
    description: 'Sum of priceCents across currently active subscriptions',
  })
  activeSubscriptionRevenueCents: number;

  @ApiProperty()
  pendingReports: number;

  @ApiProperty()
  totalReports: number;

  @ApiProperty()
  pendingVerifications: number;

  @ApiProperty()
  verifiedUsers: number;
}
