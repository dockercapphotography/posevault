-- =============================================
-- PoseVault — Share Favorites (Phase 2)
-- Run in Supabase SQL Editor
-- =============================================

-- =============================================
-- TABLE: share_favorites
-- =============================================
CREATE TABLE share_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  image_id BIGINT NOT NULL,
  viewer_id UUID NOT NULL REFERENCES share_viewers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shared_gallery_id, image_id, viewer_id)
);

CREATE INDEX idx_share_favorites_gallery ON share_favorites(shared_gallery_id);
CREATE INDEX idx_share_favorites_viewer ON share_favorites(viewer_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE share_favorites ENABLE ROW LEVEL SECURITY;

-- Viewers can insert their own favorites
CREATE POLICY "Viewers can add favorites"
  ON share_favorites
  FOR INSERT
  WITH CHECK (true);

-- Viewers can delete their own favorites
CREATE POLICY "Viewers can remove their own favorites"
  ON share_favorites
  FOR DELETE
  USING (true);

-- Anyone can read favorites (visibility filtering done in app logic)
CREATE POLICY "Anyone can read favorites"
  ON share_favorites
  FOR SELECT
  USING (true);
