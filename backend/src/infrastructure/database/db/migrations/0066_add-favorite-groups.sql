ALTER TYPE "favorite_entity_type" ADD VALUE IF NOT EXISTS 'conversation';

CREATE TABLE "favorite_group" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "name" text NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "favorite_group"
  ADD CONSTRAINT "favorite_group_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "favorite_group"
  ADD CONSTRAINT "favorite_group_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organization"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX "favorite_group_user_org_position_idx"
  ON "favorite_group" ("user_id", "organization_id", "position");

CREATE TABLE "favorite_placement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "organization_id" text NOT NULL,
  "entity_type" "favorite_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "group_id" uuid,
  "position" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "favorite_placement_user_entity_unique"
    UNIQUE ("user_id", "organization_id", "entity_type", "entity_id")
);

ALTER TABLE "favorite_placement"
  ADD CONSTRAINT "favorite_placement_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "favorite_placement"
  ADD CONSTRAINT "favorite_placement_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "organization"("id")
  ON DELETE cascade ON UPDATE no action;

ALTER TABLE "favorite_placement"
  ADD CONSTRAINT "favorite_placement_group_id_favorite_group_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "favorite_group"("id")
  ON DELETE set null ON UPDATE no action;

CREATE INDEX "favorite_placement_user_org_group_position_idx"
  ON "favorite_placement" ("user_id", "organization_id", "group_id", "position");
