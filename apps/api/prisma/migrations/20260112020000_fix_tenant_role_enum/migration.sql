-- Fix TenantRole enum: remove 'superadmin', add 'viewer' if needed
-- This migration handles the case where the enum was created with 'superadmin' instead of 'viewer'

-- Step 1: Convert any TenantMembership records with 'superadmin' role to 'tenantadmin'
UPDATE "TenantMembership" 
SET role = 'tenantadmin'::"TenantRole"
WHERE EXISTS (
  SELECT 1 FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'TenantRole' 
  AND e.enumlabel = 'superadmin'
) AND role::text = 'superadmin';

-- Step 2: Remove 'superadmin' from enum if it exists
-- We check first, then drop (DROP VALUE doesn't support IF EXISTS)
DO $$
DECLARE
  superadmin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TenantRole' 
    AND e.enumlabel = 'superadmin'
  ) INTO superadmin_exists;
  
  IF superadmin_exists THEN
    EXECUTE 'ALTER TYPE "TenantRole" DROP VALUE ''superadmin''';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If it fails, ignore (probably doesn't exist or is in use)
    NULL;
END $$;

-- Step 3: Add 'viewer' if it doesn't exist
-- We check first, then add conditionally using EXECUTE
DO $$
DECLARE
  viewer_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TenantRole' 
    AND e.enumlabel = 'viewer'
  ) INTO viewer_exists;
  
  IF NOT viewer_exists THEN
    -- Execute ALTER TYPE inside DO block using EXECUTE
    EXECUTE 'ALTER TYPE "TenantRole" ADD VALUE ''viewer''';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- If it already exists, ignore
    NULL;
  WHEN OTHERS THEN
    -- If it fails for other reasons, ignore
    NULL;
END $$;
