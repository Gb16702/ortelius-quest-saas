CREATE TABLE "anonymous_user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "anonymous_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conversation" ALTER COLUMN "requester_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "anonymous_requester_id" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_anonymous_requester_id_anonymous_user_id_fk" FOREIGN KEY ("anonymous_requester_id") REFERENCES "public"."anonymous_user"("id") ON DELETE cascade ON UPDATE no action;