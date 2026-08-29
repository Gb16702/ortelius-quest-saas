CREATE TYPE "public"."fragility_type" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('draft', 'pending', 'quoted', 'rejected', 'cancelled', 'quote_accepted');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('cargo', 'storage', 'logistics', 'port');--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargo_details" (
	"id" text PRIMARY KEY NOT NULL,
	"weight" integer,
	"volume" integer,
	"dimensions_id" text,
	"pallet_count" integer,
	"fragility" "fragility_type",
	"options" json
);
--> statement-breakpoint
CREATE TABLE "dimensions" (
	"id" text PRIMARY KEY NOT NULL,
	"length" integer,
	"width" integer,
	"height" integer
);
--> statement-breakpoint
CREATE TABLE "request" (
	"id" text PRIMARY KEY NOT NULL,
	"req_number" text,
	"requester_id" text,
	"categories" json,
	"services" json,
	"extra_services" json,
	"cargo_details_id" text,
	"comments" text,
	"documents" json,
	"status" "request_status" DEFAULT 'draft' NOT NULL,
	"from_date" timestamp NOT NULL,
	"to_date" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "request_req_number_unique" UNIQUE("req_number")
);
--> statement-breakpoint
CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "service_type" NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cargo_details" ADD CONSTRAINT "cargo_details_dimensions_id_dimensions_id_fk" FOREIGN KEY ("dimensions_id") REFERENCES "public"."dimensions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request" ADD CONSTRAINT "request_cargo_details_id_cargo_details_id_fk" FOREIGN KEY ("cargo_details_id") REFERENCES "public"."cargo_details"("id") ON DELETE cascade ON UPDATE no action;