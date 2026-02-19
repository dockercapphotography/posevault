-- =============================================
-- PoseVault — Share Uploads (Phase 3)
-- Run in Supabase SQL Editor
-- =============================================

-- =============================================
-- TABLE: share_uploads
-- =============================================
CREATE TABLE share_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  original_filename TEXT,
  viewer_id UUID NOT NULL REFERENCES share_viewers(id) ON DELETE CASCADE,
  approved BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_size BIGINT DEFAULT 0
);

-- If table already exists, add the column:
-- ALTER TABLE share_uploads ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

CREATE INDEX idx_share_uploads_gallery ON share_uploads(shared_gallery_id);
CREATE INDEX idx_share_uploads_viewer ON share_uploads(viewer_id);
CREATE INDEX idx_share_uploads_pending ON share_uploads(shared_gallery_id, approved) WHERE approved = false;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE share_uploads ENABLE ROW LEVEL SECURITY;

-- Viewers can insert their own uploads
CREATE POLICY "Viewers can upload images"
  ON share_uploads
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read uploads (visibility filtering done in app logic based on approval status)
CREATE POLICY "Anyone can read uploads"
  ON share_uploads
  FOR SELECT
  USING (true);

-- Gallery owners can update uploads (approve/reject)
CREATE POLICY "Owners can update uploads"
  ON share_uploads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = share_uploads.shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );

-- Gallery owners can delete uploads
CREATE POLICY "Owners can delete uploads"
  ON share_uploads
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shared_galleries sg
      WHERE sg.id = share_uploads.shared_gallery_id
      AND sg.owner_id = auth.uid()
    )
  );
