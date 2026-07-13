import { BillingCycle, SubscriptionTier } from '@prisma/client';

export const BILLING_CYCLE_DAYS: Record<BillingCycle, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

// Prices in cents (USD). No real payment processor is wired up yet, so these
// are only used to compute the entitlement price shown to the user and stored
// on the Subscription row - see subscriptions.service.ts.
export const SUBSCRIPTION_PRICING: Record<
  'GOLD' | 'PLATINUM',
  Record<BillingCycle, number>
> = {
  GOLD: { MONTHLY: 1999, QUARTERLY: 4999, YEARLY: 14999 },
  PLATINUM: { MONTHLY: 3499, QUARTERLY: 8999, YEARLY: 27999 },
};

// Sentinel used instead of Infinity so limits stay a plain `number` (and
// therefore JSON-safe) everywhere. Callers should check against this value
// rather than relying on the raw magnitude.
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

export interface TierLimits {
  likes: number;
  superLikes: number;
  undos: number;
  boosts: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  FREE: { likes: 50, superLikes: 1, undos: 3, boosts: 1 },
  GOLD: { likes: UNLIMITED, superLikes: 5, undos: UNLIMITED, boosts: 1 },
  PLATINUM: { likes: UNLIMITED, superLikes: 10, undos: UNLIMITED, boosts: 3 },
};

export const BOOST_DURATION_MINUTES = 30;
