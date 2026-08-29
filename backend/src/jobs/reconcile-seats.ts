import { eq, or } from 'drizzle-orm'
import { subscriptionApplicationService } from '../domains/subscription/subscription.application'
import { db } from '../infrastructure/database'
import { subscription } from '../infrastructure/database/db/schemas/auth-schema'

export async function reconcileAllSeats() {
  const subscriptions = await db
    .select()
    .from(subscription)
    .where(or(eq(subscription.status, 'active'), eq(subscription.status, 'trialing')))

  let reconciled = 0
  let errors = 0
  const errorDetails: Array<{ organizationId: string; error: string }> = []

  for (const sub of subscriptions) {
    try {
      const result = await subscriptionApplicationService.reconcileSeats(sub.referenceId)

      if (result.success) {
        reconciled++
      } else {
        errors++
        const errorMsg = result.error || 'Unknown error'
        errorDetails.push({
          organizationId: sub.referenceId,
          error: errorMsg,
        })
      }
    } catch (error) {
      errors++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errorDetails.push({
        organizationId: sub.referenceId,
        error: errorMsg,
      })
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return {
    total: subscriptions.length,
    reconciled,
    errors,
    errorDetails,
  }
}

if (import.meta.main) {
  reconcileAllSeats()
    .then((result) => {
      process.exit(result.errors > 0 ? 1 : 0)
    })
    .catch(() => {
      process.exit(1)
    })
}
