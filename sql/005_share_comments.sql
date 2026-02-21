-- =============================================
-- PoseVault — Share Comments (Phase 4)
-- Run in Supabase SQL Editor
-- =============================================

-- =============================================
-- TABLE: share_comments
-- =============================================
CREATE TABLE share_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL,
  viewer_id UUID NOT NULL REFERENCES share_viewers(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_comments_gallery ON share_comments(shared_gallery_id);
CREATE INDEX idx_share_comments_image ON share_comments(shared_gallery_id, image_id);
CREATE INDEX idx_share_comments_viewer ON share_comments(viewer_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE share_comments ENABLE ROW LEVEL SECURITY;

-- Viewers can add comments (if allow_comments is true on the shared gallery)
CREATE POLICY "Viewers can add comments"
  ON share_comments
  FOR INSERT
  WITH CHECK (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE allow_comments = true AND is_active = true
    )
  );

-- Anyone can read comments on active shared galleries
CREATE POLICY "Anyone can read comments"
  ON share_comments
  FOR SELECT
  USING (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE is_active = true
    )
  );

-- Viewers can delete their own comments
CREATE POLICY "Viewers can delete own comments"
  ON share_comments
  FOR DELETE
  USING (
    viewer_id IN (
      SELECT id FROM share_viewers WHERE session_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Gallery owners can delete any comment on their galleries
CREATE POLICY "Owners can delete comments on their galleries"
  ON share_comments
  FOR DELETE
  USING (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
    )
  );
