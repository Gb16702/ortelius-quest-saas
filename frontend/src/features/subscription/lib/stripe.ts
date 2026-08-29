import { loadStripe, type Stripe } from "@stripe/stripe-js"
import { publicEnv } from "@/shared/config/env"

const publishableKey = publicEnv.STRIPE_PUBLISHABLE_KEY

export const stripePromise: Promise<Stripe | null> = publishableKey
    ? loadStripe(publishableKey)
    : Promise.resolve(null)
