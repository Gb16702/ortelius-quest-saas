CREATE TABLE IF NOT EXISTS "assistant_attachment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action,
  "organization_id" text REFERENCES "organization"("id") ON DELETE set null ON UPDATE no action,
  "conversation_id" uuid REFERENCES "assistant_conversation"("id") ON DELETE set null ON UPDATE no action,
  "message_id" uuid REFERENCES "assistant_message"("id") ON DELETE set null ON UPDATE no action,
  "filename" text NOT NULL,
  "original_name" text NOT NULL,
  "size" integer NOT NULL,
  "mime_type" text NOT NULL,
  "s3_key" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_assistant_attachment_user_created"
  ON "assistant_attachment" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_assistant_attachment_user_org_created"
  ON "assistant_attachment" ("user_id", "organization_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_assistant_attachment_conversation_created"
  ON "assistant_attachment" ("conversation_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_assistant_attachment_message"
  ON "assistant_attachment" ("message_id");

CREATE TABLE IF NOT EXISTS "assistant_message_attachment" (
  "message_id" uuid NOT NULL REFERENCES "assistant_message"("id") ON DELETE cascade ON UPDATE no action,
  "attachment_id" uuid NOT NULL REFERENCES "assistant_attachment"("id") ON DELETE cascade ON UPDATE no action,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "assistant_message_attachment_pk" PRIMARY KEY ("message_id", "attachment_id")
);

CREATE INDEX IF NOT EXISTS "idx_assistant_message_attachment_attachment"
  ON "assistant_message_attachment" ("attachment_id");
