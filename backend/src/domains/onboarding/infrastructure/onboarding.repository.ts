import { and, eq, or } from 'drizzle-orm'
import Stripe from 'stripe'
import { env } from '../../../infrastructure/config/environment'
import { db } from '../../../infrastructure/database'
import {
  member,
  organization,
  subscription,
} from '../../../infrastructure/database/db/schemas/auth-schema'
import {
  generateSlug,
  isSlugAvailable,
  validateSlug,
} from '../../../infrastructure/networking/slug.service'
import type {
  OnboardingStepStatus,
  OrganizationNameAvailability,
  PlanPrice,
  SubscriptionPlan,
} from '../application/onboarding-models'
import type { OnboardingRepositoryPort } from '../application/ports'

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

const FEATURE_LABELS: Record<string, string> = {
  unlimitedRequests: 'Unlimited requests',
  requestManagement: 'Request management',
  quoteManagement: 'Quote management',
  invoiceGeneration: 'Invoice generation',
  showcasePage: 'Showcase page',
  documentUpload: 'Document upload',
  bulkOperations: 'Bulk operations',
  colorThemes: 'Theme presets',
  basicDashboard: 'Analytics dashboard',
  advancedAnalytics: 'Advanced analytics & reports',
  memberPerformance: 'Member performance tracking',
  graphqlMetrics: 'GraphQL metrics',
  dataExports: 'Data exports',
  clientChat: 'Chat with clients',
  teamChat: 'Team chat',
  voipCalls: 'Voice calls',
  callTranscription: 'Call transcription',
  branding: 'Custom branding',
  subdomain: 'Custom subdomain',
  csvExport: 'CSV exports',
  pdfExport: 'PDF exports',
  activityLog: 'Activity log',
  pricingIntelligence: 'Pricing intelligence',
}

const PLAN_META: Record<string, { displayName: string; tagline: string }> = {
  starter: {
    displayName: 'Starter',
    tagline: 'For small teams getting started',
  },
  professional: {
    displayName: 'Professional',
    tagline: 'For growing teams that need more',
  },
  enterprise: {
    displayName: 'Enterprise',
    tagline: 'For organizations with advanced needs',
  },
}

export class DrizzleOnboardingRepository implements OnboardingRepositoryPort {
  async getOnboardingStatus(userId: string): Promise<OnboardingStepStatus> {
    const userOrganizations = await db
      .select()
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId))
      .limit(1)

    const accountCreated = true
    const organizationCreated = userOrganizations.length > 0

    let subscriptionActive = false
    let currentStep: OnboardingStepStatus['currentStep'] = 'account'

    if (organizationCreated) {
      const orgId = userOrganizations[0].organization.id

      const activeSubscription = await db
        .select()
        .from(subscription)
        .where(
          and(
            eq(subscription.referenceId, orgId),
            or(eq(subscription.status, 'active'), eq(subscription.status, 'trialing'))
          )
        )
        .limit(1)

      subscriptionActive = activeSubscription.length > 0

      if (subscriptionActive) {
        currentStep = 'completed'
      } else {
        currentStep = 'subscription'
      }
    } else {
      currentStep = 'organization'
    }

    return {
      accountCreated,
      organizationCreated,
      subscriptionActive,
      currentStep,
    }
  }

  async getOrganizationByUserId(userId: string) {
    const result = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        tagline: organization.tagline,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(eq(member.userId, userId))
      .limit(1)

    return result[0] || null
  }

  async getActiveSubscriptionForOrganization(organizationId: string) {
    const result = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, organizationId),
          or(eq(subscription.status, 'active'), eq(subscription.status, 'trialing'))
        )
      )
      .limit(1)

    return result[0] || null
  }

  async hasUserCompletedOnboarding(userId: string): Promise<boolean> {
    const status = await this.getOnboardingStatus(userId)
    return status.currentStep === 'completed'
  }

  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    const planConfigs = [
      {
        name: 'starter',
        priceId: env.STRIPE_PRICE_STARTER_MONTHLY,
        priceIds: {
          monthly: env.STRIPE_PRICE_STARTER_MONTHLY,
          annual: env.STRIPE_PRICE_STARTER_ANNUAL,
        },
        limits: { members: 3 },
        features: [
          { key: 'unlimitedRequests', included: true },
          { key: 'quoteManagement', included: true },
          { key: 'invoiceGeneration', included: true },
          { key: 'clientChat', included: true },
          { key: 'teamChat', included: false },
          { key: 'voipCalls', included: false },
          { key: 'callTranscription', included: false },
          { key: 'colorThemes', included: false },
          { key: 'basicDashboard', included: false },
          { key: 'advancedAnalytics', included: false },
          { key: 'memberPerformance', included: false },
          { key: 'documentUpload', included: true },
          { key: 'bulkOperations', included: true },
          { key: 'dataExports', included: true },
          { key: 'requestManagement', included: true },
          { key: 'showcasePage', included: true },
          { key: 'graphqlMetrics', included: false },
          { key: 'branding', included: true },
          { key: 'subdomain', included: true },
          { key: 'csvExport', included: true },
          { key: 'pdfExport', included: true },
          { key: 'activityLog', included: false },
          { key: 'pricingIntelligence', included: false },
        ],
        freeTrial: { days: 14 },
      },
      {
        name: 'professional',
        priceId: env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
        priceIds: {
          monthly: env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
          annual: env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
        },
        limits: { members: 10 },
        features: [
          { key: 'unlimitedRequests', included: true },
          { key: 'quoteManagement', included: true },
          { key: 'invoiceGeneration', included: true },
          { key: 'clientChat', included: true },
          { key: 'teamChat', included: true },
          { key: 'voipCalls', included: true },
          { key: 'callTranscription', included: true },
          { key: 'colorThemes', included: true },
          { key: 'basicDashboard', included: true },
          { key: 'advancedAnalytics', included: false },
          { key: 'memberPerformance', included: false },
          { key: 'documentUpload', included: true },
          { key: 'bulkOperations', included: true },
          { key: 'dataExports', included: true },
          { key: 'requestManagement', included: true },
          { key: 'showcasePage', included: true },
          { key: 'graphqlMetrics', included: false },
          { key: 'branding', included: true },
          { key: 'subdomain', included: true },
          { key: 'csvExport', included: true },
          { key: 'pdfExport', included: true },
          { key: 'activityLog', included: true },
          { key: 'pricingIntelligence', included: false },
        ],
        freeTrial: { days: 14 },
      },
      {
        name: 'enterprise',
        priceId: env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
        priceIds: {
          monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
          annual: env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
        },
        limits: { members: -1 },
        features: [
          { key: 'unlimitedRequests', included: true },
          { key: 'quoteManagement', included: true },
          { key: 'invoiceGeneration', included: true },
          { key: 'clientChat', included: true },
          { key: 'teamChat', included: true },
          { key: 'voipCalls', included: true },
          { key: 'callTranscription', included: true },
          { key: 'colorThemes', included: true },
          { key: 'basicDashboard', included: true },
          { key: 'advancedAnalytics', included: true },
          { key: 'memberPerformance', included: true },
          { key: 'documentUpload', included: true },
          { key: 'bulkOperations', included: true },
          { key: 'dataExports', included: true },
          { key: 'requestManagement', included: true },
          { key: 'showcasePage', included: true },
          { key: 'graphqlMetrics', included: true },
          { key: 'branding', included: true },
          { key: 'subdomain', included: true },
          { key: 'csvExport', included: true },
          { key: 'pdfExport', included: true },
          { key: 'activityLog', included: true },
          { key: 'pricingIntelligence', included: true },
        ],
        freeTrial: { days: 14 },
      },
    ]

    const allPriceIds = planConfigs
      .flatMap((p) => [p.priceIds.monthly, p.priceIds.annual])
      .filter(Boolean)

    const stripePrices = await Promise.all(
      allPriceIds.map((id) => stripeClient.prices.retrieve(id).catch(() => null))
    )

    const priceMap = new Map<string, Stripe.Price>()
    for (const price of stripePrices) {
      if (price) priceMap.set(price.id, price)
    }

    const toPlanPrice = (stripePrice: Stripe.Price | undefined): PlanPrice => ({
      amount: (stripePrice?.unit_amount ?? 0) / 100,
      currency: (stripePrice?.currency ?? 'eur').toUpperCase(),
    })

    return planConfigs.map((config) => {
      const monthlyPrice = priceMap.get(config.priceIds.monthly)
      const annualPrice = priceMap.get(config.priceIds.annual)
      const meta = PLAN_META[config.name] ?? {
        displayName: config.name,
        tagline: '',
      }

      return {
        ...config,
        displayName: meta.displayName,
        tagline: meta.tagline,
        features: config.features.map((f) => ({
          ...f,
          label: FEATURE_LABELS[f.key] ?? f.key,
        })),
        price: monthlyPrice
          ? {
              amount: (monthlyPrice.unit_amount ?? 0) / 100,
              currency: monthlyPrice.currency.toUpperCase(),
              interval: (monthlyPrice.recurring?.interval ?? 'month') as 'month' | 'year',
            }
          : undefined,
        prices: {
          monthly: toPlanPrice(monthlyPrice),
          annual: toPlanPrice(annualPrice),
        },
      }
    })
  }

  async checkOrganizationNameAvailable(name: string): Promise<OrganizationNameAvailability> {
    const slug = generateSlug(name)

    return await this.checkOrganizationSlugAvailable(slug)
  }

  async checkOrganizationSlugAvailable(slug: string): Promise<OrganizationNameAvailability> {
    const normalizedSlug = slug.trim()
    const validation = validateSlug(normalizedSlug)
    if (!validation.valid) {
      return { available: false, errorCode: validation.errorCode, slug: normalizedSlug }
    }

    const available = await isSlugAvailable(normalizedSlug)

    return {
      available,
      slug: normalizedSlug,
      errorCode: available ? undefined : 'SUBDOMAIN_TAKEN',
    }
  }
}
