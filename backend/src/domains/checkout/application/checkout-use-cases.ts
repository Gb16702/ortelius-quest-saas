import {
  normalizeCheckoutEmail,
  trialDaysForCheckoutSubscription,
  trialDaysForFreeTrial,
  validateInviteEmailDecision,
} from '../domain'
import type {
  CheckoutOrganizationResult,
  CompleteCheckoutInput,
  ConfirmSubscriptionResult,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  StartFreeTrialInput,
  ValidateInviteEmailInput,
  ValidateInviteEmailResult,
} from './checkout-models'
import type { CheckoutUseCaseDependencies } from './ports'

export class CheckoutSlugError extends Error {
  constructor(
    message: string,
    readonly errorCode: string,
    readonly status: 400 | 409 = 400
  ) {
    super(message)
    this.name = 'CheckoutSlugError'
  }
}

export class ValidateInviteEmailUseCase {
  constructor(private readonly deps: CheckoutUseCaseDependencies) {}

  async execute(input: ValidateInviteEmailInput): Promise<ValidateInviteEmailResult> {
    const normalizedEmail = normalizeCheckoutEmail(input.email)
    const existingUserId = await this.deps.persistence.findUserIdByEmail(normalizedEmail)
    const alreadyHasOrganization = existingUserId
      ? await this.deps.persistence.userHasOrganizationMembership(existingUserId)
      : false

    return validateInviteEmailDecision({
      email: normalizedEmail,
      currentUserEmail: input.currentUserEmail,
      invitedUserAlreadyHasOrganization: alreadyHasOrganization,
    })
  }
}

export class CreateSubscriptionUseCase {
  constructor(private readonly deps: CheckoutUseCaseDependencies) {}

  async execute(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
    console.log('createSubscription input:', {
      plan: input.plan,
      planType: typeof input.plan,
      annual: input.annual,
      initialSeats: input.initialSeats,
      knownPlans: ['starter', 'professional', 'enterprise'],
    })

    const planPrices = this.deps.plans.getPlanPrice(input.plan)
    if (!planPrices && !input.priceId) {
      throw new Error(`Invalid plan: ${input.plan}`)
    }

    const priceId =
      input.priceId ||
      (input.annual && planPrices?.annual ? planPrices.annual : planPrices?.monthly)
    const trialDays = trialDaysForCheckoutSubscription(input.plan)
    const initialSeats = input.initialSeats || 1

    console.log('createSubscription calculated:', {
      priceId,
      trialDays,
      initialSeats,
      annual: input.annual,
    })

    if (!priceId) {
      throw new Error(`Invalid plan: ${input.plan}`)
    }

    await this.assertRequestedSlugAvailable(input.organizationSlug)

    return await this.deps.billing.createSubscription({
      customerEmail: input.email,
      customerName: input.fullName,
      organizationName: input.organizationName,
      organizationSlug: input.organizationSlug,
      plan: input.plan,
      priceId,
      initialSeats,
      trialDays,
    })
  }

  private async assertRequestedSlugAvailable(requestedSlug?: string): Promise<void> {
    if (!requestedSlug) {
      return
    }

    const slug = requestedSlug.trim()
    const validation = this.deps.slugs.validateSlug(slug)
    if (!validation.valid) {
      throw new CheckoutSlugError(validation.error, validation.errorCode)
    }

    if (!(await this.deps.slugs.isSlugAvailable(slug))) {
      throw new CheckoutSlugError('Organization slug is already taken', 'SUBDOMAIN_TAKEN', 409)
    }
  }
}

export class ConfirmSubscriptionUseCase {
  constructor(private readonly deps: CheckoutUseCaseDependencies) {}

  async execute(
    subscriptionId: string,
    _paymentIntentId: string
  ): Promise<ConfirmSubscriptionResult> {
    return await this.deps.billing.retrieveSubscription(subscriptionId)
  }
}

export class StartFreeTrialUseCase {
  constructor(private readonly deps: CheckoutUseCaseDependencies) {}

  async execute(input: StartFreeTrialInput): Promise<CheckoutOrganizationResult> {
    await this.ensureUserHasNoOrganization(input.userId)

    const trialDays = trialDaysForFreeTrial(input.plan)
    if (trialDays === 0) {
      throw new Error(`Plan ${input.plan} does not have a free trial`)
    }

    const planPrices = this.deps.plans.getPlanPrice(input.plan)
    if (!planPrices) {
      throw new Error(`Invalid plan: ${input.plan}`)
    }

    const stripeSubscription = await this.deps.billing.createCardlessTrialSubscription({
      ...input,
      priceId: planPrices.monthly,
      trialDays,
    })

    await this.deps.persistence.updateUserStripeCustomerId(
      input.userId,
      stripeSubscription.customerId
    )

    const organization = await this.createOrganizationWithOwner({
      organizationName: input.organizationName,
      organizationSlug: input.organizationSlug,
      userId: input.userId,
      stripeCustomerId: stripeSubscription.customerId,
    })

    await this.deps.billing.updateCustomerMetadata(stripeSubscription.customerId, {
      organizationName: input.organizationName,
      ...(input.organizationSlug ? { organizationSlug: input.organizationSlug } : {}),
      plan: input.plan,
      userId: input.userId,
      organizationId: organization.organizationId,
    })

    await this.createTeamConversation(organization.organizationId, input.userId)

    const now = this.deps.clock.now()
    await this.deps.persistence.createSubscriptionRecord({
      id: this.deps.ids.randomId(),
      plan: input.plan,
      referenceId: organization.organizationId,
      stripeCustomerId: stripeSubscription.customerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      seats: '1',
      billingModel: 'per-seat',
      periodStart: epochSecondsToDate(stripeSubscription.currentPeriodStart),
      periodEnd: epochSecondsToDate(stripeSubscription.currentPeriodEnd),
      trialStart: epochSecondsToDate(stripeSubscription.trialStart),
      trialEnd: epochSecondsToDate(stripeSubscription.trialEnd),
      createdAt: now,
      updatedAt: now,
    })

    await this.deps.billing.updateSubscriptionMetadata(stripeSubscription.id, {
      ...stripeSubscription.metadata,
      organizationId: organization.organizationId,
    })

    return { ...organization, checkoutId: stripeSubscription.id }
  }

  private async ensureUserHasNoOrganization(userId: string): Promise<void> {
    if (await this.deps.persistence.userHasOrganizationMembership(userId)) {
      throw new Error('You are already a member of an organization')
    }
  }

  private async createOrganizationWithOwner(input: {
    organizationName: string
    organizationSlug?: string
    userId: string
    stripeCustomerId: string
  }): Promise<CheckoutOrganizationResult> {
    const slug = await this.resolveSlug(input.organizationName, input.organizationSlug)
    const organizationId = this.deps.ids.randomId()
    const now = this.deps.clock.now()

    await this.deps.persistence.createOrganization({
      id: organizationId,
      name: input.organizationName,
      slug,
      stripeCustomerId: input.stripeCustomerId,
      createdAt: now,
    })

    await this.deps.persistence.createOwnerMembership({
      id: this.deps.ids.randomId(),
      organizationId,
      userId: input.userId,
      createdAt: now,
    })

    return { organizationId, slug }
  }

  private async nextAvailableSlug(organizationName: string): Promise<string> {
    const baseSlug = this.deps.slugs.generateSlug(organizationName)
    let slug = baseSlug
    let counter = 1

    while (!(await this.deps.slugs.isSlugAvailable(slug))) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  private async resolveSlug(organizationName: string, requestedSlug?: string): Promise<string> {
    if (!requestedSlug) {
      return await this.nextAvailableSlug(organizationName)
    }

    const slug = requestedSlug.trim()
    const validation = this.deps.slugs.validateSlug(slug)
    if (!validation.valid) {
      throw new CheckoutSlugError(validation.error, validation.errorCode)
    }

    if (!(await this.deps.slugs.isSlugAvailable(slug))) {
      throw new CheckoutSlugError('Organization slug is already taken', 'SUBDOMAIN_TAKEN', 409)
    }

    return slug
  }

  private async createTeamConversation(organizationId: string, userId: string): Promise<void> {
    try {
      await this.deps.conversations.createTeamConversation(organizationId, userId)
    } catch (error) {
      console.error('Failed to create team chat for organization:', error)
    }
  }
}

export class CompleteCheckoutUseCase {
  constructor(private readonly deps: CheckoutUseCaseDependencies) {}

  async execute(input: CompleteCheckoutInput): Promise<CheckoutOrganizationResult> {
    const stripeSubscriptionId = input.checkoutId ?? input.stripeSubscriptionId
    if (!stripeSubscriptionId) {
      throw new Error('Checkout id is required')
    }

    const stripeSubscription =
      await this.deps.billing.retrieveCheckoutSubscription(stripeSubscriptionId)

    if (!['active', 'trialing'].includes(stripeSubscription.status)) {
      throw new Error(`Subscription is not active: ${stripeSubscription.status}`)
    }

    const existingOrganizationId = stripeSubscription.metadata?.organizationId
    if (existingOrganizationId) {
      return await this.resolveExistingOrganization(existingOrganizationId, input.userId)
    }

    if (await this.deps.persistence.userHasOrganizationMembership(input.userId)) {
      throw new Error('You are already a member of an organization')
    }

    const organizationName = input.organizationName ?? stripeSubscription.metadata?.organizationName
    if (!organizationName) {
      throw new Error('Organization name is required to complete checkout')
    }

    const plan = stripeSubscription.metadata?.plan || 'starter'
    const stripeCustomerId = stripeSubscription.customerId
    const seats = stripeSubscription.firstItemQuantity || 1
    const billingModel = stripeSubscription.metadata?.billingModel || 'per-seat'

    await this.deps.persistence.updateUserStripeCustomerId(input.userId, stripeCustomerId)

    const organizationSlug = input.organizationSlug ?? stripeSubscription.metadata?.organizationSlug
    const slug = await this.resolveSlug(organizationName, organizationSlug)
    const organizationId = this.deps.ids.randomId()
    const now = this.deps.clock.now()

    await this.deps.persistence.createOrganization({
      id: organizationId,
      name: organizationName,
      slug,
      stripeCustomerId,
      createdAt: now,
    })

    await this.deps.persistence.createOwnerMembership({
      id: this.deps.ids.randomId(),
      organizationId,
      userId: input.userId,
      createdAt: now,
    })

    try {
      await this.deps.conversations.createTeamConversation(organizationId, input.userId)
    } catch (error) {
      console.error('Failed to create team chat for organization:', error)
    }

    const currentPeriodStart =
      stripeSubscription.currentPeriodStart || stripeSubscription.firstItemCurrentPeriodStart
    const currentPeriodEnd =
      stripeSubscription.currentPeriodEnd || stripeSubscription.firstItemCurrentPeriodEnd

    await this.deps.persistence.createSubscriptionRecord({
      id: this.deps.ids.randomId(),
      plan,
      referenceId: organizationId,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      seats: seats.toString(),
      billingModel,
      periodStart: epochSecondsToDate(currentPeriodStart),
      periodEnd: epochSecondsToDate(currentPeriodEnd),
      trialStart: epochSecondsToDate(stripeSubscription.trialStart),
      trialEnd: epochSecondsToDate(stripeSubscription.trialEnd),
      createdAt: now,
      updatedAt: now,
    })

    await this.deps.billing.updateSubscriptionMetadata(stripeSubscription.id, {
      ...stripeSubscription.metadata,
      organizationName,
      ...(organizationSlug ? { organizationSlug } : {}),
      organizationId,
      userId: input.userId,
    })

    return { organizationId, slug }
  }

  private async resolveExistingOrganization(
    organizationId: string,
    userId: string
  ): Promise<CheckoutOrganizationResult> {
    const organization = await this.deps.persistence.findOrganizationById(organizationId)
    if (!organization) {
      throw new Error('Checkout organization not found')
    }

    if (!(await this.deps.persistence.userOwnsOrganization(userId, organizationId))) {
      throw new Error('You are not authorized to complete this checkout')
    }

    return organization
  }

  private async nextAvailableSlug(organizationName: string): Promise<string> {
    const baseSlug = this.deps.slugs.generateSlug(organizationName)
    let slug = baseSlug
    let counter = 1

    while (!(await this.deps.slugs.isSlugAvailable(slug))) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  private async resolveSlug(organizationName: string, requestedSlug?: string): Promise<string> {
    if (!requestedSlug) {
      return await this.nextAvailableSlug(organizationName)
    }

    const slug = requestedSlug.trim()
    const validation = this.deps.slugs.validateSlug(slug)
    if (!validation.valid) {
      throw new CheckoutSlugError(validation.error, validation.errorCode)
    }

    if (!(await this.deps.slugs.isSlugAvailable(slug))) {
      throw new CheckoutSlugError('Organization slug is already taken', 'SUBDOMAIN_TAKEN', 409)
    }

    return slug
  }
}

function epochSecondsToDate(value?: number | null): Date | null {
  return value ? new Date(value * 1000) : null
}
