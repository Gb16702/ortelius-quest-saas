-- Migration: Enforce single organization per user
-- Add unique constraint on user_id to ensure one user can only be in one organization

ALTER TABLE "member" ADD CONSTRAINT "member_user_id_unique" UNIQUE("user_id");
