CREATE TABLE "organization_categories" (
	"organization_id" text NOT NULL,
	"category_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "organization_categories_organization_id_category_id_pk" PRIMARY KEY("organization_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "organization_services" (
	"organization_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "organization_services_organization_id_service_id_pk" PRIMARY KEY("organization_id","service_id")
);
--> statement-breakpoint
ALTER TABLE "organization_categories" ADD CONSTRAINT "organization_categories_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_categories" ADD CONSTRAINT "organization_categories_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_services" ADD CONSTRAINT "organization_services_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_services" ADD CONSTRAINT "organization_services_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE cascade ON UPDATE no action;