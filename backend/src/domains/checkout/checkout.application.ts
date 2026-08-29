import type {
  CheckoutOrganizationResult,
  CompleteCheckoutInput,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  StartFreeTrialInput,
  ValidateInviteEmailInput,
  ValidateInviteEmailResult,
} from './application/checkout-models'
import { getCheckoutUseCases } from './infrastructure/checkout-use-cases'

export class CheckoutApplicationService {
  async validateInviteEmail(input: ValidateInviteEmailInput): Promise<ValidateInviteEmailResult> {
    const useCases = await getCheckoutUseCases()
    return await useCases.validateInviteEmail.execute(input)
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
    const useCases = await getCheckoutUseCases()
    return await useCases.createSubscription.execute(input)
  }

  async confirmSubscription(subscriptionId: string, paymentIntentId: string) {
    const useCases = await getCheckoutUseCases()
    return await useCases.confirmSubscription.execute(subscriptionId, paymentIntentId)
  }

  async startFreeTrial(input: StartFreeTrialInput): Promise<CheckoutOrganizationResult> {
    const useCases = await getCheckoutUseCases()
    return await useCases.startFreeTrial.execute(input)
  }

  async completeCheckout(input: CompleteCheckoutInput): Promise<CheckoutOrganizationResult> {
    const useCases = await getCheckoutUseCases()
    return await useCases.completeCheckout.execute(input)
  }
}

export const checkoutApplicationService = new CheckoutApplicationService()
