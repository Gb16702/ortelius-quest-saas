CREATE TABLE "message_read" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_read" ADD CONSTRAINT "message_read_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read" ADD CONSTRAINT "message_read_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_message_read_message_user" ON "message_read" USING btree ("message_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_message_read_user_message" ON "message_read" USING btree ("user_id","message_id");--> statement-breakpoint
CREATE INDEX "unique_message_user_read" ON "message_read" USING btree ("message_id","user_id");