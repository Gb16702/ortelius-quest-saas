CREATE TABLE "voip_call" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"caller_id" text NOT NULL,
	"call_type" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration" text,
	"status" text DEFAULT 'initiated' NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "voip_call_participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp,
	"left_at" timestamp,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "voip_call" ADD CONSTRAINT "voip_call_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voip_call" ADD CONSTRAINT "voip_call_caller_id_user_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voip_call_participant" ADD CONSTRAINT "voip_call_participant_call_id_voip_call_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."voip_call"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voip_call_participant" ADD CONSTRAINT "voip_call_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_voip_call_participant_call_id" ON "voip_call_participant" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "idx_voip_call_participant_user_id" ON "voip_call_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_voip_call_participant_status" ON "voip_call_participant" USING btree ("status");--> statement-breakpoint
CREATE INDEX "unique_call_user" ON "voip_call_participant" USING btree ("call_id","user_id");