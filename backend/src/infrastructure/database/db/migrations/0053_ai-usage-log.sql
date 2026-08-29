CREATE TABLE IF NOT EXISTS "ai_usage_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "feature" text NOT NULL,
  "model" text NOT NULL,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "total_tokens" integer,
  "duration_ms" integer,
  "success" boolean NOT NULL DEFAULT true,
  "error" text,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_feature_created"
  ON "ai_usage_log" ("feature", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_created"
  ON "ai_usage_log" ("created_at" DESC);
