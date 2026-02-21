-- =============================================
-- PoseVault — Owner Comments Support (Phase 4)
-- Run in Supabase SQL Editor
-- =============================================

-- Allow owner_id as an alternative to viewer_id for gallery owner comments
ALTER TABLE share_comments ALTER COLUMN viewer_id DROP NOT NULL;

ALTER TABLE share_comments
  ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- Ensure every comment has either a viewer or an owner
ALTER TABLE share_comments
  ADD CONSTRAINT comment_author_check
  CHECK (viewer_id IS NOT NULL OR owner_id IS NOT NULL);

-- Owners can insert comments on their own galleries
CREATE POLICY "Owners can add comments on their galleries"
  ON share_comments
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
    )
  );
