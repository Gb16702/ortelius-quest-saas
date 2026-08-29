-- VoIP lifecycle persistence + QoS metrics + transcript artifacts
-- Adds the columns the call-lifecycle services need (callee, ended_by, recording, transcript link),
-- normalizes voip_call.status to the lifecycle enum, adds call_metrics for WebRTC QoS samples,
-- and exposes pdf_url / recording_url on transcripts so the summary flow has a stable schema.

-- voip_call: lifecycle columns + status enum normalization
ALTER TABLE "voip_call"
  ADD COLUMN IF NOT EXISTS "callee_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "ended_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "recording_url" text,
  ADD COLUMN IF NOT EXISTS "transcript_id" uuid;

-- Map any legacy 'initiated' / 'active' / unknown statuses to the new enum values.
UPDATE "voip_call" SET "status" = 'pending' WHERE "status" = 'initiated';
UPDATE "voip_call" SET "status" = 'ended' WHERE "status" NOT IN ('pending', 'active', 'ended', 'rejected', 'missed');

ALTER TABLE "voip_call" ALTER COLUMN "status" SET DEFAULT 'pending';

-- transcripts: PDF + recording artifacts produced by the post-call pipeline.
ALTER TABLE "transcripts"
  ADD COLUMN IF NOT EXISTS "pdf_url" text,
  ADD COLUMN IF NOT EXISTS "recording_url" text;

-- call_metrics: per-participant WebRTC QoS samples sent in batches over the WS.
CREATE TABLE IF NOT EXISTS "call_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "call_id" uuid NOT NULL REFERENCES "voip_call"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "timestamp" timestamp NOT NULL,
  "metrics" json NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_call_metrics_call_id" ON "call_metrics"("call_id");
CREATE INDEX IF NOT EXISTS "idx_call_metrics_user_id" ON "call_metrics"("user_id");
CREATE INDEX IF NOT EXISTS "idx_call_metrics_timestamp" ON "call_metrics"("timestamp");
