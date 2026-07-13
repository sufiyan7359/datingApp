import { ApiProperty } from '@nestjs/swagger';
import {
  BillingCycle,
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
} from '@prisma/client';

export class SubscriptionStatusDto {
  @ApiProperty({ enum: SubscriptionTier })
  tier: SubscriptionTier;

  @ApiProperty()
  isPremium: boolean;

  @ApiProperty({ enum: SubscriptionStatus, nullable: true })
  status: SubscriptionStatus | null;

  @ApiProperty({ enum: BillingCycle, nullable: true })
  billingCycle: BillingCycle | null;

  @ApiProperty({ nullable: true })
  priceCents: number | null;

  @ApiProperty({ nullable: true })
  startedAt: Date | null;

  @ApiProperty({ nullable: true })
  expiresAt: Date | null;

  @ApiProperty()
  autoRenew: boolean;

  static fromEntity(subscription: Subscription | null): SubscriptionStatusDto {
    const dto = new SubscriptionStatusDto();
    dto.tier = subscription?.tier ?? 'FREE';
    dto.isPremium = dto.tier !== 'FREE';
    dto.status = subscription?.status ?? null;
    dto.billingCycle = subscription?.billingCycle ?? null;
    dto.priceCents = subscription?.priceCents ?? null;
    dto.startedAt = subscription?.startedAt ?? null;
    dto.expiresAt = subscription?.expiresAt ?? null;
    dto.autoRenew = subscription?.autoRenew ?? false;
    return dto;
  }
}
