-- =============================================
-- PoseVault — Fix notification_preferences unique constraint
-- Run in Supabase SQL Editor
-- =============================================
-- Problem: UNIQUE(user_id, shared_gallery_id) does not prevent
-- duplicate rows when shared_gallery_id IS NULL because in
-- PostgreSQL NULL != NULL. This caused global preferences to
-- create a new row on every toggle instead of updating.
-- =============================================

-- Step 1: Remove duplicate global preference rows, keeping only the most recent
DELETE FROM notification_preferences a
USING notification_preferences b
WHERE a.user_id = b.user_id
  AND a.shared_gallery_id IS NULL
  AND b.shared_gallery_id IS NULL
  AND a.updated_at < b.updated_at;

-- Step 2: Also handle ties (same updated_at) by keeping the row with the smaller id
DELETE FROM notification_preferences a
USING notification_preferences b
WHERE a.user_id = b.user_id
  AND a.shared_gallery_id IS NULL
  AND b.shared_gallery_id IS NULL
  AND a.updated_at = b.updated_at
  AND a.id > b.id;

-- Step 3: Drop the old unique constraint that doesn't handle NULLs
ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_user_id_shared_gallery_id_key;

-- Step 4: Create a new unique index that treats NULL shared_gallery_id as a single value
CREATE UNIQUE INDEX notification_prefs_user_gallery_unique
  ON notification_preferences (user_id, COALESCE(shared_gallery_id, '00000000-0000-0000-0000-000000000000'));
