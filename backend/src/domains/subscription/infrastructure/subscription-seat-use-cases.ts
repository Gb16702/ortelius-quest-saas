import { SyncSubscriptionSeatsUseCase } from '../application/subscription-seats.use-cases'

export interface SubscriptionSeatUseCaseContainer {
  syncSeats: SyncSubscriptionSeatsUseCase
}

let subscriptionSeatUseCases: SubscriptionSeatUseCaseContainer | null = null

export async function getSubscriptionSeatUseCases(): Promise<SubscriptionSeatUseCaseContainer> {
  if (subscriptionSeatUseCases) return subscriptionSeatUseCases

  const [
    { DrizzleSubscriptionSeatRepository },
    { StripeSubscriptionSeatAdapter },
    { ActivitySubscriptionAdapter },
  ] = await Promise.all([
    import('./subscription-seat.repository'),
    import('./stripe-subscription-seat.adapter'),
    import('./subscription-activity.adapter'),
  ])

  const subscriptions = new DrizzleSubscriptionSeatRepository()
  const stripeSeats = new StripeSubscriptionSeatAdapter()
  const activity = new ActivitySubscriptionAdapter()

  subscriptionSeatUseCases = {
    syncSeats: new SyncSubscriptionSeatsUseCase(subscriptions, stripeSeats, activity),
  }

  return subscriptionSeatUseCases
}
