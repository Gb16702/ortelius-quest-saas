ALTER TABLE "organization" ADD COLUMN "subdomain" text;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_subdomain_unique" UNIQUE("subdomain");