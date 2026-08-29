CREATE TABLE IF NOT EXISTS "subscription_cancellation_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" text,
	"feedback" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscription_cancellation_feedback" ADD CONSTRAINT "subscription_cancellation_feedback_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
