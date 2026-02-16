-- =============================================
-- PoseVault — Gallery Sharing (Phase 1)
-- Run in Supabase SQL Editor
-- =============================================

-- =============================================
-- TABLE: shared_galleries
-- =============================================
CREATE TABLE shared_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id BIGINT NOT NULL REFERENCES categories(uid) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  allow_favorites BOOLEAN NOT NULL DEFAULT true,
  allow_uploads BOOLEAN NOT NULL DEFAULT false,
  allow_comments BOOLEAN NOT NULL DEFAULT false,
  require_upload_approval BOOLEAN NOT NULL DEFAULT true,
  favorites_visible_to_others BOOLEAN NOT NULL DEFAULT true,
  max_uploads_per_viewer INTEGER,
  max_upload_size_mb INTEGER NOT NULL DEFAULT 10,
  lock_gallery_contents BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_galleries_token ON shared_galleries(share_token);
CREATE INDEX idx_shared_galleries_owner ON shared_galleries(owner_id);
CREATE INDEX idx_shared_galleries_gallery ON shared_galleries(gallery_id);

-- =============================================
-- TABLE: share_viewers
-- =============================================
CREATE TABLE share_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_viewers_gallery ON share_viewers(shared_gallery_id);
CREATE INDEX idx_share_viewers_session ON share_viewers(session_id);

-- =============================================
-- TABLE: share_access_log
-- =============================================
CREATE TABLE share_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES share_viewers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  image_id BIGINT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_access_log_gallery ON share_access_log(shared_gallery_id);
CREATE INDEX idx_share_access_log_viewer ON share_access_log(viewer_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE shared_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_log ENABLE ROW LEVEL SECURITY;

-- shared_galleries: owners can CRUD their own shares
CREATE POLICY "Owners can manage their shares"
  ON shared_galleries
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- shared_galleries: anyone can read active shares (needed for token lookup by anon viewers)
CREATE POLICY "Anyone can read active shares by token"
  ON shared_galleries
  FOR SELECT
  USING (is_active = true);

-- share_viewers: anyone can insert (name entry gate for anonymous viewers)
CREATE POLICY "Anyone can create a viewer session"
  ON share_viewers
  FOR INSERT
  WITH CHECK (true);

-- share_viewers: anyone can read viewer sessions (needed for session validation)
CREATE POLICY "Anyone can read viewer sessions"
  ON share_viewers
  FOR SELECT
  USING (true);

-- share_access_log: anyone can insert (logging from share viewer)
CREATE POLICY "Anyone can log share access"
  ON share_access_log
  FOR INSERT
  WITH CHECK (true);

-- share_access_log: owners can read logs for their galleries
CREATE POLICY "Owners can read access logs"
  ON share_access_log
  FOR SELECT
  USING (
    shared_gallery_id IN (
      SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
    )
  );
