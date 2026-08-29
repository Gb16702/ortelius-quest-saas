import "dotenv/config";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import Stripe from "stripe";
import { env } from "../src/infrastructure/config/environment";
import { db } from "../src/infrastructure/database";
import {
  member,
  subscription,
} from "../src/infrastructure/database/db/schemas/auth-schema";

const DRY_RUN = process.argv.includes("--dry-run");

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
});

interface MigrationStats {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

async function getMemberCount(organizationId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(member)
    .where(eq(member.organizationId, organizationId));

  const count = Number(result[0]?.count) || 0;
  return Math.max(1, count);
}

async function migrateSubscription(
  sub: typeof subscription.$inferSelect,
  stats: MigrationStats,
): Promise<void> {
  const organizationId = sub.referenceId;
  const stripeSubscriptionId = sub.stripeSubscriptionId;

  if (!stripeSubscriptionId) {
    console.warn(
      `[skip] subscription ${sub.id} (org ${organizationId}) has no stripeSubscriptionId`,
    );
    stats.skipped += 1;
    return;
  }

  try {
    const memberCount = await getMemberCount(organizationId);

    const stripeSub =
      await stripeClient.subscriptions.retrieve(stripeSubscriptionId);

    const item = stripeSub.items.data[0];
    if (!item) {
      console.warn(
        `[skip] stripe subscription ${stripeSubscriptionId} (org ${organizationId}) has no items`,
      );
      stats.skipped += 1;
      return;
    }

    const oldQuantity = item.quantity ?? 0;

    console.log(
      `[${DRY_RUN ? "dry-run" : "apply"}] org ${organizationId} | sub ${sub.id} | stripe ${stripeSubscriptionId} | item ${item.id} | members ${memberCount} | quantity ${oldQuantity} → ${memberCount}`,
    );

    if (DRY_RUN) {
      stats.succeeded += 1;
      return;
    }

    await stripeClient.subscriptions.update(stripeSubscriptionId, {
      items: [{ id: item.id, quantity: memberCount }],
      proration_behavior: "create_prorations",
    });

    await db
      .update(subscription)
      .set({
        seats: String(memberCount),
        billingModel: "per-seat",
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, sub.id));

    console.log(
      `[ok] org ${organizationId} migrated: quantity ${oldQuantity} → ${memberCount}, billingModel fixed-price → per-seat`,
    );
    stats.succeeded += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[error] org ${organizationId} (sub ${sub.id}, stripe ${stripeSubscriptionId}): ${message}`,
    );
    stats.failed += 1;
  }
}

async function migrateFixedPriceToPerSeat(): Promise<void> {
  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}Migrating fixed-price subscriptions to per-seat...\n`,
  );

  const candidates = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.billingModel, "fixed-price"),
        inArray(subscription.status, ["active", "trialing", "past_due"]),
        isNotNull(subscription.stripeSubscriptionId),
      ),
    );

  console.log(`Found ${candidates.length} subscription(s) to migrate.\n`);

  const stats: MigrationStats = {
    total: candidates.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  };

  for (const sub of candidates) {
    await migrateSubscription(sub, stats);
  }

  console.log("\n=== Summary ===");
  console.log(`  Total processed: ${stats.total}`);
  console.log(`  Succeeded:       ${stats.succeeded}`);
  console.log(`  Skipped:         ${stats.skipped}`);
  console.log(`  Failed:          ${stats.failed}`);

  if (DRY_RUN) {
    console.log(
      `\n[DRY RUN] No changes were applied. Re-run without --dry-run to apply.`,
    );
  }
}

migrateFixedPriceToPerSeat()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
