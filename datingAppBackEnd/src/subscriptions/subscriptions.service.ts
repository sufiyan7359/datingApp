import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromoCode, Subscription, SubscriptionTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionStatusDto } from './dto/subscription-status.dto';
import { PlanDto } from './dto/plan.dto';
import { PromoValidationDto } from './dto/promo-validation.dto';
import {
  BILLING_CYCLE_DAYS,
  SUBSCRIPTION_PRICING,
} from './subscriptions.constants';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * Returns the caller's currently active subscription row, lazily flipping
   * it to EXPIRED if its expiry has passed. Returns null for FREE tier.
   */
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { expiresAt: 'desc' },
    });
    if (!subscription) {
      return null;
    }
    if (subscription.expiresAt.getTime() <= Date.now()) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });
      return null;
    }
    return subscription;
  }

  async getCurrentTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.getActiveSubscription(userId);
    return subscription?.tier ?? 'FREE';
  }

  async getMe(userId: string): Promise<SubscriptionStatusDto> {
    const subscription = await this.getActiveSubscription(userId);
    return SubscriptionStatusDto.fromEntity(subscription);
  }

  listPlans(): PlanDto[] {
    const plans: PlanDto[] = [];
    for (const tier of ['GOLD', 'PLATINUM'] as const) {
      for (const billingCycle of Object.keys(
        BILLING_CYCLE_DAYS,
      ) as (keyof typeof BILLING_CYCLE_DAYS)[]) {
        plans.push({
          tier,
          billingCycle,
          priceCents: SUBSCRIPTION_PRICING[tier][billingCycle],
          durationDays: BILLING_CYCLE_DAYS[billingCycle],
        });
      }
    }
    return plans;
  }

  async validatePromo(code: string): Promise<PromoValidationDto> {
    const promo = await this.findValidPromo(code);
    return { valid: !!promo, discountPercent: promo?.discountPercent ?? 0 };
  }

  /**
   * Activates a paid tier immediately. IMPORTANT: no payment is actually
   * collected here - there is no Stripe/Razorpay integration yet (deferred,
   * needs real API credentials). This exists so the rest of the app (tier
   * gating, premium features) can be built and tested now; swap this method's
   * body for a real checkout-session + webhook flow once credentials exist.
   */
  async subscribe(
    userId: string,
    dto: SubscribeDto,
  ): Promise<SubscriptionStatusDto> {
    let promo: PromoCode | null = null;
    if (dto.promoCode) {
      promo = await this.findValidPromo(dto.promoCode);
      if (!promo) {
        throw new BadRequestException('Invalid or expired promo code');
      }
      const alreadyUsed = await this.prisma.subscription.findFirst({
        where: { userId, promoCodeId: promo.id },
      });
      if (alreadyUsed) {
        throw new BadRequestException('You have already used this promo code');
      }
    }

    const basePrice = SUBSCRIPTION_PRICING[dto.tier][dto.billingCycle];
    const priceCents = promo
      ? Math.round((basePrice * (100 - promo.discountPercent)) / 100)
      : basePrice;
    const durationDays = BILLING_CYCLE_DAYS[dto.billingCycle];
    const expiresAt = new Date(Date.now() + durationDays * 86_400_000);

    const subscription = await this.prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });
      if (promo) {
        await tx.promoCode.update({
          where: { id: promo.id },
          data: { redemptionCount: { increment: 1 } },
        });
      }
      return tx.subscription.create({
        data: {
          userId,
          tier: dto.tier,
          billingCycle: dto.billingCycle,
          priceCents,
          expiresAt,
          promoCodeId: promo?.id,
        },
      });
    });
    await this.analytics.track(userId, 'SUBSCRIPTION_PURCHASED', {
      tier: dto.tier,
      billingCycle: dto.billingCycle,
      priceCents,
    });

    return SubscriptionStatusDto.fromEntity(subscription);
  }

  async cancelAutoRenew(userId: string): Promise<SubscriptionStatusDto> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('You do not have an active subscription');
    }
    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { autoRenew: false },
    });
    return SubscriptionStatusDto.fromEntity(updated);
  }

  private async findValidPromo(code: string): Promise<PromoCode | null> {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!promo || !promo.isActive) {
      return null;
    }
    if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    if (
      promo.maxRedemptions !== null &&
      promo.redemptionCount >= promo.maxRedemptions
    ) {
      return null;
    }
    return promo;
  }
}
