-- =============================================
-- PoseVault — Notifications & Activity (Phase 5)
-- Run in Supabase SQL Editor
-- =============================================

-- =============================================
-- TABLE: notifications
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('view', 'favorite', 'upload_pending', 'comment', 'share_expired')),
  message TEXT NOT NULL,
  viewer_id UUID REFERENCES share_viewers(id) ON DELETE SET NULL,
  image_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_gallery ON notifications(shared_gallery_id);
CREATE INDEX idx_notifications_created ON notifications(user_id, created_at DESC);

-- =============================================
-- TABLE: notification_preferences
-- =============================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_gallery_id UUID REFERENCES shared_galleries(id) ON DELETE CASCADE,
  notify_on_view BOOLEAN NOT NULL DEFAULT false,
  notify_on_favorite BOOLEAN NOT NULL DEFAULT true,
  notify_on_upload BOOLEAN NOT NULL DEFAULT true,
  notify_on_comment BOOLEAN NOT NULL DEFAULT true,
  notify_on_expiry BOOLEAN NOT NULL DEFAULT true,
  quiet_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, shared_gallery_id)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications: owners can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Notifications: owners can update their own (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notifications: owners can delete their own
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Notifications: anyone can insert (edge function uses service role, but
-- we also allow anon insert so viewer actions can create notifications)
CREATE POLICY "Anyone can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Notification preferences: users can manage their own
CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notification preferences: allow anon read for checking prefs during notification creation
CREATE POLICY "Anyone can read notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (true);
