export type SubscriptionTier = 'FREE' | 'GOLD' | 'PLATINUM';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Plan {
  tier: 'GOLD' | 'PLATINUM';
  billingCycle: BillingCycle;
  priceCents: number;
  durationDays: number;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isPremium: boolean;
  status: 'ACTIVE' | 'CANCELED' | 'EXPIRED' | null;
  billingCycle: BillingCycle | null;
  priceCents: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
}

export interface PromoValidation {
  valid: boolean;
  discountPercent: number;
}
