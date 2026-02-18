-- =============================================
-- PoseVault — Share Upload Metadata + Favorites Fix
-- Run in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. Add metadata columns to share_uploads
--    Allows owner to favorite, rename, tag, and add notes
--    to viewer-uploaded images (just like gallery images).
-- =============================================

ALTER TABLE share_uploads ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE share_uploads ADD COLUMN display_name TEXT;
ALTER TABLE share_uploads ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE share_uploads ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

-- =============================================
-- 2. Change share_favorites.image_id from BIGINT to TEXT
--    This allows favoriting both gallery images (numeric uid)
--    and viewer uploads (string like "upload-<uuid>").
-- =============================================

ALTER TABLE share_favorites ALTER COLUMN image_id TYPE TEXT USING image_id::TEXT;
