import {
  CompleteCheckoutUseCase,
  ConfirmSubscriptionUseCase,
  CreateSubscriptionUseCase,
  StartFreeTrialUseCase,
  ValidateInviteEmailUseCase,
} from '../application/checkout-use-cases'
import type { CheckoutUseCaseDependencies } from '../application/ports'
import { DrizzleCheckoutRepository } from './checkout.repository'
import { MessagingCheckoutConversationAdapter } from './checkout-conversation.adapter'
import { EnvCheckoutPlanPriceAdapter } from './checkout-plan-prices'
import { NetworkCheckoutSlugAdapter } from './checkout-slug.adapter'
import { StripeCheckoutBillingAdapter } from './checkout-stripe.adapter'
import { CryptoCheckoutIdAdapter, SystemCheckoutClockAdapter } from './checkout-system.adapter'

export interface CheckoutUseCaseContainer {
  validateInviteEmail: ValidateInviteEmailUseCase
  createSubscription: CreateSubscriptionUseCase
  confirmSubscription: ConfirmSubscriptionUseCase
  startFreeTrial: StartFreeTrialUseCase
  completeCheckout: CompleteCheckoutUseCase
}

let checkoutUseCases: CheckoutUseCaseContainer | null = null

export async function getCheckoutUseCases(): Promise<CheckoutUseCaseContainer> {
  if (checkoutUseCases) return checkoutUseCases

  const deps: CheckoutUseCaseDependencies = {
    plans: new EnvCheckoutPlanPriceAdapter(),
    billing: new StripeCheckoutBillingAdapter(),
    persistence: new DrizzleCheckoutRepository(),
    slugs: new NetworkCheckoutSlugAdapter(),
    conversations: new MessagingCheckoutConversationAdapter(),
    ids: new CryptoCheckoutIdAdapter(),
    clock: new SystemCheckoutClockAdapter(),
  }

  checkoutUseCases = {
    validateInviteEmail: new ValidateInviteEmailUseCase(deps),
    createSubscription: new CreateSubscriptionUseCase(deps),
    confirmSubscription: new ConfirmSubscriptionUseCase(deps),
    startFreeTrial: new StartFreeTrialUseCase(deps),
    completeCheckout: new CompleteCheckoutUseCase(deps),
  }

  return checkoutUseCases
}
