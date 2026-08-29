export type SubscriptionSeatRecord = {
  id: string
  seats: string | null
  billingModel: string | null
  stripeSubscriptionId: string | null
}

export type SeatUpdateResult = {
  success: boolean
  newSeatCount: number
  prorationAmount?: number
  error?: string
}

export type SeatSyncDirection = 'increase' | 'decrease' | 'none'

export function parseSeatCount(seats: string | null | undefined): number {
  return Number.parseInt(seats || '0', 10)
}

export function buildNoActiveSubscriptionSeatResult(message = 'No active subscription found') {
  return {
    success: false,
    newSeatCount: 0,
    error: message,
  } satisfies SeatUpdateResult
}

export function buildLegacySubscriptionSeatResult(subscription: SubscriptionSeatRecord) {
  return {
    success: true,
    newSeatCount: parseSeatCount(subscription.seats),
    error: 'Legacy subscription - seat update skipped',
  } satisfies SeatUpdateResult
}

export function buildMissingStripeSubscriptionSeatResult() {
  return {
    success: false,
    newSeatCount: 0,
    error: 'No Stripe subscription ID found',
  } satisfies SeatUpdateResult
}

export function isFixedPriceSubscription(subscription: SubscriptionSeatRecord): boolean {
  return subscription.billingModel === 'fixed-price'
}

export function calculateSeatTarget(
  memberCount: number,
  direction: Exclude<SeatSyncDirection, 'none'>
) {
  return direction === 'decrease' ? Math.max(1, memberCount) : memberCount
}

export function determineSeatSyncDirection(
  memberCount: number,
  subscription: SubscriptionSeatRecord
): SeatSyncDirection {
  const currentSeats = parseSeatCount(subscription.seats)
  if (memberCount > currentSeats) return 'increase'
  if (memberCount < currentSeats) return 'decrease'
  return 'none'
}

export function buildSeatUpdateSuccess(newSeatCount: number): SeatUpdateResult {
  return {
    success: true,
    newSeatCount,
    prorationAmount: 0,
  }
}

export function buildSeatUpdateError(error: unknown): SeatUpdateResult {
  return {
    success: false,
    newSeatCount: 0,
    error: error instanceof Error ? error.message : 'Unknown error',
  }
}
