CREATE TABLE IF NOT EXISTS "assistant_sync_action" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "sync_id" integer NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action,
  "organization_id" text REFERENCES "organization"("id") ON DELETE set null ON UPDATE no action,
  "conversation_id" uuid NOT NULL REFERENCES "assistant_conversation"("id") ON DELETE cascade ON UPDATE no action,
  "model_name" text NOT NULL,
  "model_id" text NOT NULL,
  "operation" text NOT NULL,
  "payload" json NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_assistant_sync_action_user_sync"
  ON "assistant_sync_action" ("user_id", "sync_id");

CREATE INDEX IF NOT EXISTS "idx_assistant_sync_action_user_sync"
  ON "assistant_sync_action" ("user_id", "sync_id");

CREATE INDEX IF NOT EXISTS "idx_assistant_sync_action_org_sync"
  ON "assistant_sync_action" ("organization_id", "sync_id");

CREATE INDEX IF NOT EXISTS "idx_assistant_sync_action_conversation_sync"
  ON "assistant_sync_action" ("conversation_id", "sync_id");

WITH "assistant_backfill_events" AS (
  SELECT
    "conversation"."user_id",
    "conversation"."organization_id",
    "conversation"."id" AS "conversation_id",
    'assistant_conversation' AS "model_name",
    "conversation"."id"::text AS "model_id",
    'insert' AS "operation",
    json_build_object(
      'type', 'conversation_created',
      'conversation', json_build_object(
        'id', "conversation"."id"::text,
        'userId', "conversation"."user_id",
        'organizationId', "conversation"."organization_id",
        'title', "conversation"."title",
        'lastRoutePath', "conversation"."last_route_path",
        'createdAt', to_char("conversation"."created_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'updatedAt', to_char("conversation"."updated_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    ) AS "payload",
    "conversation"."created_at" AS "created_at",
    0 AS "sort_order"
  FROM "assistant_conversation" AS "conversation"
  WHERE NOT EXISTS (
    SELECT 1
    FROM "assistant_sync_action" AS "existing_sync"
    WHERE "existing_sync"."user_id" = "conversation"."user_id"
  )

  UNION ALL

  SELECT
    "conversation"."user_id",
    "conversation"."organization_id",
    "message"."conversation_id",
    'assistant_message' AS "model_name",
    "message"."id"::text AS "model_id",
    'insert' AS "operation",
    json_build_object(
      'type', 'message_inserted',
      'message', json_build_object(
        'id', "message"."id"::text,
        'conversationId', "message"."conversation_id"::text,
        'role', "message"."role",
        'content', "message"."content",
        'metadata', "message"."metadata",
        'createdAt', to_char("message"."created_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    ) AS "payload",
    "message"."created_at" AS "created_at",
    10 AS "sort_order"
  FROM "assistant_message" AS "message"
  INNER JOIN "assistant_conversation" AS "conversation"
    ON "conversation"."id" = "message"."conversation_id"
  WHERE NOT EXISTS (
    SELECT 1
    FROM "assistant_sync_action" AS "existing_sync"
    WHERE "existing_sync"."user_id" = "conversation"."user_id"
  )

  UNION ALL

  SELECT
    "action"."user_id",
    "action"."organization_id",
    "action"."conversation_id",
    'assistant_action' AS "model_name",
    "action"."id"::text AS "model_id",
    'insert' AS "operation",
    json_build_object(
      'type', 'action_proposed',
      'action', json_build_object(
        'id', "action"."id"::text,
        'conversationId', "action"."conversation_id"::text,
        'userId', "action"."user_id",
        'organizationId', "action"."organization_id",
        'type', "action"."type",
        'status', "action"."status",
        'title', "action"."title",
        'summary', "action"."summary",
        'buttonLabel', "action"."button_label",
        'riskLevel', "action"."risk_level",
        'requiresConfirmation', "action"."requires_confirmation",
        'payload', "action"."payload",
        'preview', "action"."preview",
        'result', "action"."result",
        'errorMessage', "action"."error_message",
        'expiresAt', to_char("action"."expires_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'confirmedAt', CASE
          WHEN "action"."confirmed_at" IS NULL THEN NULL
          ELSE to_char("action"."confirmed_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        END,
        'executedAt', CASE
          WHEN "action"."executed_at" IS NULL THEN NULL
          ELSE to_char("action"."executed_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        END,
        'cancelledAt', CASE
          WHEN "action"."cancelled_at" IS NULL THEN NULL
          ELSE to_char("action"."cancelled_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        END,
        'createdAt', to_char("action"."created_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'updatedAt', to_char("action"."updated_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    ) AS "payload",
    "action"."created_at" AS "created_at",
    20 AS "sort_order"
  FROM "assistant_action" AS "action"
  WHERE "action"."conversation_id" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "assistant_sync_action" AS "existing_sync"
      WHERE "existing_sync"."user_id" = "action"."user_id"
    )

  UNION ALL

  SELECT
    "conversation"."user_id",
    "conversation"."organization_id",
    "conversation"."id" AS "conversation_id",
    'assistant_conversation' AS "model_name",
    "conversation"."id"::text AS "model_id",
    'delete' AS "operation",
    json_build_object(
      'type', 'conversation_deleted',
      'conversationId', "conversation"."id"::text,
      'deletedAt', to_char("conversation"."deleted_at", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) AS "payload",
    "conversation"."deleted_at" AS "created_at",
    90 AS "sort_order"
  FROM "assistant_conversation" AS "conversation"
  WHERE "conversation"."deleted_at" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "assistant_sync_action" AS "existing_sync"
      WHERE "existing_sync"."user_id" = "conversation"."user_id"
    )
),
"assistant_numbered_backfill_events" AS (
  SELECT
    row_number() OVER (
      PARTITION BY "user_id"
      ORDER BY "created_at" ASC, "sort_order" ASC, "model_name" ASC, "model_id" ASC
    )::integer AS "sync_id",
    "user_id",
    "organization_id",
    "conversation_id",
    "model_name",
    "model_id",
    "operation",
    "payload",
    "created_at"
  FROM "assistant_backfill_events"
)
INSERT INTO "assistant_sync_action" (
  "sync_id",
  "user_id",
  "organization_id",
  "conversation_id",
  "model_name",
  "model_id",
  "operation",
  "payload",
  "created_at"
)
SELECT
  "sync_id",
  "user_id",
  "organization_id",
  "conversation_id",
  "model_name",
  "model_id",
  "operation",
  "payload",
  "created_at"
FROM "assistant_numbered_backfill_events"
ORDER BY "user_id", "sync_id";
