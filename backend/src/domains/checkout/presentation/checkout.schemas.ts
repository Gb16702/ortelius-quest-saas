import { z } from 'zod'

export const createSubscriptionSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  organizationName: z.string().min(1),
  organizationSlug: z.string().min(1).optional(),
  plan: z.string().min(1),
  priceId: z.string().optional(),
  annual: z.boolean().optional(),
  initialSeats: z.number().int().positive().optional(),
})

export const confirmSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  paymentIntentId: z.string().min(1),
})

export const validateInviteEmailSchema = z.object({
  email: z.string().email(),
})

export const startTrialSchema = z.object({
  organizationName: z.string().min(1),
  organizationSlug: z.string().min(1).optional(),
  plan: z.string().min(1),
})

export const completeCheckoutSchema = z.union([
  z.object({
    checkoutId: z.string().min(1),
    organizationName: z.string().min(1).optional(),
    organizationSlug: z.string().min(1).optional(),
  }),
  z.object({
    stripeSubscriptionId: z.string().min(1),
    organizationName: z.string().min(1).optional(),
    organizationSlug: z.string().min(1).optional(),
  }),
])
