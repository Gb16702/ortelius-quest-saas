import { env } from '../../../infrastructure/config/environment'
import type { CheckoutPlanPrice } from '../application/checkout-models'
import type { CheckoutPlanPricePort } from '../application/ports'

const PLAN_PRICE_MAP: Record<string, CheckoutPlanPrice> = {
  starter: {
    monthly: env.STRIPE_PRICE_STARTER_MONTHLY,
    annual: env.STRIPE_PRICE_STARTER_ANNUAL,
  },
  professional: {
    monthly: env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    annual: env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
  },
  enterprise: {
    monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    annual: env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  },
}

export class EnvCheckoutPlanPriceAdapter implements CheckoutPlanPricePort {
  getPlanPrice(plan: string): CheckoutPlanPrice | undefined {
    return PLAN_PRICE_MAP[plan]
  }
}
