-- Per-user opt-in for the floating AI Assistant dock (default off).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aiAssistantEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Existing platform superadmins get the assistant enabled; they can still turn it off in profile.
UPDATE "User" SET "aiAssistantEnabled" = true WHERE role = 'superadmin';
