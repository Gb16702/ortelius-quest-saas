CREATE TYPE "favorite_entity_type" AS ENUM ('request', 'quote', 'invoice');

CREATE TABLE "favorite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "entity_type" "favorite_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "organization_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "favorite_user_entity_unique" UNIQUE ("user_id", "entity_type", "entity_id")
);

ALTER TABLE "favorite"
  ADD CONSTRAINT "favorite_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "favorite"
  ADD CONSTRAINT "favorite_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organization"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "favorite_user_created_idx" ON "favorite" ("user_id", "created_at" DESC);
CREATE INDEX "favorite_user_org_idx" ON "favorite" ("user_id", "organization_id");
