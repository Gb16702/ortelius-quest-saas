import { env } from '../../../infrastructure/config/environment'
import type {
  SubscriptionPlanChangePricingPort,
  SubscriptionPricingPort,
} from '../application/ports'
import type { PlanKey, PlanPrice } from '../domain'

const PRICE_ID_TO_PLAN: Record<string, PlanKey> = {
  [env.STRIPE_PRICE_STARTER_MONTHLY]: 'starter',
  [env.STRIPE_PRICE_STARTER_ANNUAL]: 'starter',
  [env.STRIPE_PRICE_PROFESSIONAL_MONTHLY]: 'professional',
  [env.STRIPE_PRICE_PROFESSIONAL_ANNUAL]: 'professional',
  [env.STRIPE_PRICE_ENTERPRISE_MONTHLY]: 'enterprise',
  [env.STRIPE_PRICE_ENTERPRISE_ANNUAL]: 'enterprise',
}

const PRICE_ID_TO_PLAN_PRICE: Record<string, PlanPrice> = {
  [env.STRIPE_PRICE_STARTER_MONTHLY]: { key: 'starter', interval: 'monthly' },
  [env.STRIPE_PRICE_STARTER_ANNUAL]: { key: 'starter', interval: 'annual' },
  [env.STRIPE_PRICE_PROFESSIONAL_MONTHLY]: { key: 'professional', interval: 'monthly' },
  [env.STRIPE_PRICE_PROFESSIONAL_ANNUAL]: { key: 'professional', interval: 'annual' },
  [env.STRIPE_PRICE_ENTERPRISE_MONTHLY]: { key: 'enterprise', interval: 'monthly' },
  [env.STRIPE_PRICE_ENTERPRISE_ANNUAL]: { key: 'enterprise', interval: 'annual' },
}

export class EnvSubscriptionPricingAdapter
  implements SubscriptionPricingPort, SubscriptionPlanChangePricingPort
{
  resolvePlan(priceId: string): PlanKey | null {
    return PRICE_ID_TO_PLAN[priceId] ?? null
  }

  resolvePlanPrice(priceId: string): PlanPrice | null {
    return PRICE_ID_TO_PLAN_PRICE[priceId] ?? null
  }
}
