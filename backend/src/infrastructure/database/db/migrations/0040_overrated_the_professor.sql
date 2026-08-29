ALTER TABLE "organization_services" ADD COLUMN "price" integer;--> statement-breakpoint
ALTER TABLE "organization_services" ADD COLUMN "currency" text DEFAULT 'EUR';