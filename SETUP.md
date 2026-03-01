# PoseVault — Setup Guide

This guide walks through everything needed to run PoseVault locally and configure the cloud services it depends on.

## Prerequisites

- **Node.js** 18+ and npm
- A **Supabase** account (free tier works)
- A **Cloudflare** account with R2 enabled (free tier works)

## 1. Clone and Install

```bash
git clone https://github.com/dockercapphotogeaphy/posevault.git
cd posevault
npm install
```

## 2. Supabase Setup

### Create a Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon (public) key** from Project Settings → API

### Database Tables

Run the following SQL in the Supabase SQL Editor to create the required tables:

```sql
-- Categories
CREATE TABLE categories (
  uid BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  name VARCHAR NOT NULL,
  notes TEXT DEFAULT '',
  favorite BOOLEAN DEFAULT FALSE,
  private_gallery BOOLEAN DEFAULT FALSE,
  gallery_password TEXT,
  cover_image_uid BIGINT,
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Images
CREATE TABLE images (
  uid BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  name VARCHAR DEFAULT '',
  notes TEXT DEFAULT '',
  favorite BOOLEAN DEFAULT FALSE,
  cover_image BOOLEAN DEFAULT FALSE,
  r2_key TEXT,
  image_size BIGINT DEFAULT 0,
  category_uid BIGINT NOT NULL REFERENCES categories(uid),
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Tags
CREATE TABLE tags (
  uid BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name VARCHAR NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(name, user_id)
);

-- Image-Tag junction
CREATE TABLE image_tags (
  uid BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  image_uid BIGINT NOT NULL REFERENCES images(uid),
  tag_uid BIGINT NOT NULL REFERENCES tags(uid),
  UNIQUE(image_uid, tag_uid)
);

-- Category-Tag junction
CREATE TABLE category_tags (
  uid BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  category_uid BIGINT NOT NULL REFERENCES categories(uid),
  tag_uid BIGINT NOT NULL REFERENCES tags(uid),
  UNIQUE(category_uid, tag_uid)
);

-- User settings (grid preferences, tutorial state, etc.)
CREATE TABLE user_settings (
  uid BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  key VARCHAR NOT NULL,
  value TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(key, user_id)
);

-- Storage tiers (defines available plans)
CREATE TABLE storage_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  storage_bytes BIGINT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tiers
INSERT INTO storage_tiers (name, storage_bytes, description, sort_order, is_default) VALUES
  ('Free',   524288000,    '500 MB — for getting started',          0, true),
  ('Pro',    2147483648,   '2 GB — for active photographers',       1, false),
  ('Studio', 10737418240,  '10 GB — for professional studios',      2, false);

-- User storage tracking
CREATE TABLE user_storage (
  uid BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  current_storage BIGINT DEFAULT 0,
  maximum_storage BIGINT DEFAULT 524288000,  -- 500 MB
  storage_tier INT DEFAULT 1 REFERENCES storage_tiers(id),
  is_admin BOOLEAN DEFAULT FALSE
);
```

### Row Level Security (RLS)

Enable RLS on all tables and add policies so users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_storage ENABLE ROW LEVEL SECURITY;

-- Categories policy
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Images policy
CREATE POLICY "Users can manage own images"
  ON images FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tags policy
CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Image tags policy (join through image ownership)
CREATE POLICY "Users can manage own image tags"
  ON image_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM images WHERE images.uid = image_tags.image_uid AND images.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM images WHERE images.uid = image_tags.image_uid AND images.user_id = auth.uid())
  );

-- Category tags policy (join through category ownership)
CREATE POLICY "Users can manage own category tags"
  ON category_tags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM categories WHERE categories.uid = category_tags.category_uid AND categories.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM categories WHERE categories.uid = category_tags.category_uid AND categories.user_id = auth.uid())
  );

-- User settings policy
CREATE POLICY "Users can manage own settings"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User storage policies (self + admin access)
CREATE POLICY "Users can manage own storage"
  ON user_storage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Helper function to check admin status (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_storage WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Admins can read all user storage"
  ON user_storage FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can update all user storage"
  ON user_storage FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

-- Storage tiers (readable by everyone)
ALTER TABLE storage_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read storage tiers"
  ON storage_tiers FOR SELECT
  USING (true);
```

### Auto-Create Storage Record on Sign Up

Create a trigger so each new user automatically gets a storage record:

```sql
CREATE OR REPLACE FUNCTION create_user_storage()
RETURNS TRIGGER AS $$
DECLARE
  default_tier_id INT;
  default_bytes BIGINT;
BEGIN
  SELECT id, storage_bytes INTO default_tier_id, default_bytes
    FROM storage_tiers
    WHERE is_default = true
    LIMIT 1;

  IF default_tier_id IS NULL THEN
    default_tier_id := 1;
    default_bytes := 524288000;
  END IF;

  INSERT INTO user_storage (user_id, current_storage, maximum_storage, storage_tier)
  VALUES (NEW.id, 0, default_bytes, default_tier_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_storage();
```

### Gallery Sharing Tables

These tables power the gallery sharing system (share links, guest interactions, comments, uploads):

```sql
-- Shared galleries
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

-- Share viewers (guest sessions)
CREATE TABLE share_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_viewers_gallery ON share_viewers(shared_gallery_id);
CREATE INDEX idx_share_viewers_session ON share_viewers(session_id);

-- Share access log
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

-- Share favorites
CREATE TABLE share_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL,
  viewer_id UUID NOT NULL REFERENCES share_viewers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shared_gallery_id, image_id, viewer_id)
);

CREATE INDEX idx_share_favorites_gallery ON share_favorites(shared_gallery_id);
CREATE INDEX idx_share_favorites_viewer ON share_favorites(viewer_id);

-- Share uploads (guest-submitted images)
CREATE TABLE share_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  original_filename TEXT,
  viewer_id UUID NOT NULL REFERENCES share_viewers(id) ON DELETE CASCADE,
  approved BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  file_size BIGINT DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  notes TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_share_uploads_gallery ON share_uploads(shared_gallery_id);
CREATE INDEX idx_share_uploads_viewer ON share_uploads(viewer_id);
CREATE INDEX idx_share_uploads_pending ON share_uploads(shared_gallery_id, approved) WHERE approved = false;

-- Share comments
CREATE TABLE share_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_gallery_id UUID NOT NULL REFERENCES shared_galleries(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL,
  viewer_id UUID REFERENCES share_viewers(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT comment_author_check CHECK (viewer_id IS NOT NULL OR owner_id IS NOT NULL)
);

CREATE INDEX idx_share_comments_gallery ON share_comments(shared_gallery_id);
CREATE INDEX idx_share_comments_image ON share_comments(shared_gallery_id, image_id);
CREATE INDEX idx_share_comments_viewer ON share_comments(viewer_id);
```

### Sharing RLS Policies

```sql
-- Enable RLS
ALTER TABLE shared_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_comments ENABLE ROW LEVEL SECURITY;

-- shared_galleries: owners manage their own, anyone can read active shares
CREATE POLICY "Owners can manage their shares"
  ON shared_galleries FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Anyone can read active shares by token"
  ON shared_galleries FOR SELECT
  USING (is_active = true);

-- share_viewers: anyone can create and read sessions
CREATE POLICY "Anyone can create a viewer session"
  ON share_viewers FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read viewer sessions"
  ON share_viewers FOR SELECT USING (true);

-- share_access_log: anyone can insert, owners can read
CREATE POLICY "Anyone can log share access"
  ON share_access_log FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can read access logs"
  ON share_access_log FOR SELECT
  USING (shared_gallery_id IN (
    SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
  ));

-- share_favorites: anyone can add/remove/read
CREATE POLICY "Viewers can add favorites"
  ON share_favorites FOR INSERT WITH CHECK (true);

CREATE POLICY "Viewers can remove their own favorites"
  ON share_favorites FOR DELETE USING (true);

CREATE POLICY "Anyone can read favorites"
  ON share_favorites FOR SELECT USING (true);

-- share_uploads: viewers can upload, owners can manage
CREATE POLICY "Viewers can upload images"
  ON share_uploads FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read uploads"
  ON share_uploads FOR SELECT USING (true);

CREATE POLICY "Owners can update uploads"
  ON share_uploads FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM shared_galleries sg
    WHERE sg.id = share_uploads.shared_gallery_id AND sg.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can delete uploads"
  ON share_uploads FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM shared_galleries sg
    WHERE sg.id = share_uploads.shared_gallery_id AND sg.owner_id = auth.uid()
  ));

-- share_comments: viewers and owners can add, owners can moderate
CREATE POLICY "Viewers can add comments"
  ON share_comments FOR INSERT
  WITH CHECK (shared_gallery_id IN (
    SELECT id FROM shared_galleries WHERE allow_comments = true AND is_active = true
  ));

CREATE POLICY "Owners can add comments on their galleries"
  ON share_comments FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND shared_gallery_id IN (
    SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Anyone can read comments"
  ON share_comments FOR SELECT
  USING (shared_gallery_id IN (
    SELECT id FROM shared_galleries WHERE is_active = true
  ));

CREATE POLICY "Owners can delete comments on their galleries"
  ON share_comments FOR DELETE
  USING (shared_gallery_id IN (
    SELECT id FROM shared_galleries WHERE owner_id = auth.uid()
  ));
```

### Notification Tables

```sql
-- Notifications
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

-- Notification preferences
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

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Anyone can create notifications"
  ON notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read notification preferences"
  ON notification_preferences FOR SELECT USING (true);
```

### Admin Panel Setup

The admin panel requires an RPC function to fetch user data and RLS policies for tier management:

```sql
-- RPC function to fetch user list (joins user_storage with auth.users)
CREATE OR REPLACE FUNCTION get_admin_user_list()
RETURNS TABLE (
  uid BIGINT,
  user_id UUID,
  current_storage BIGINT,
  maximum_storage BIGINT,
  storage_tier INT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  display_name TEXT,
  email TEXT
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    us.uid::BIGINT, us.user_id::UUID,
    us.current_storage::BIGINT, us.maximum_storage::BIGINT,
    us.storage_tier::INT, us.is_admin::BOOLEAN, us.created_at::TIMESTAMPTZ,
    COALESCE(TRIM(
      COALESCE(au.raw_user_meta_data->>'firstName', '') || ' ' ||
      COALESCE(au.raw_user_meta_data->>'lastName', '')
    ), '')::TEXT AS display_name,
    COALESCE(au.email, '')::TEXT AS email
  FROM user_storage us
  LEFT JOIN auth.users au ON au.id = us.user_id
  ORDER BY us.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_admin_user_list() TO authenticated;

-- Allow admins to manage storage tiers
CREATE POLICY "Admins can insert storage tiers"
  ON storage_tiers FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update storage tiers"
  ON storage_tiers FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete storage tiers"
  ON storage_tiers FOR DELETE USING (is_admin());
```

After running the admin setup, promote yourself to admin:

```sql
UPDATE user_storage SET is_admin = true WHERE user_id = 'YOUR-USER-UUID-HERE';
```

> **Note:** All of the SQL above is also available as incremental migration files in the `sql/` directory, numbered `001` through `016`. You can run them in order if you prefer a step-by-step approach.

## 3. Cloudflare R2 Setup

### Create a Bucket

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Create a bucket (e.g. `posevault-images`)

### Create an R2 API Token

1. In R2 → Manage R2 API Tokens → Create API Token
2. Give it **Object Read & Write** permissions
3. Save the **Access Key ID** and **Secret Access Key** (shown only once)

### Deploy the R2 Worker

The `r2-worker/` directory contains a Cloudflare Worker that proxies upload, fetch, and delete requests to R2 with JWT authentication.

```bash
cd r2-worker
npm install
```

Edit `wrangler.jsonc` with your bucket name and account details, then deploy:

```bash
npx wrangler deploy
```

Note the deployed worker URL (e.g. `https://r2-worker.your-subdomain.workers.dev`).

### Supabase Edge Functions

PoseVault uses several Supabase Edge Functions. The sharing and notification functions are included in the `supabase/functions/` directory and can be deployed with the Supabase CLI:

```bash
supabase functions deploy cleanup-expired-shares
supabase functions deploy create-notification
supabase functions deploy get-share-activity-summary
supabase functions deploy validate-share-access
```

Additionally, create a `delete-user-r2-files` Edge Function in the Supabase Dashboard for account deletion. This handles bulk R2 file cleanup when a user deletes their account.

| Function | Purpose |
|----------|---------|
| `delete-user-r2-files` | Bulk R2 file cleanup on account deletion |
| `cleanup-expired-shares` | Automatic cleanup of expired share links |
| `create-notification` | Create notifications for share activity |
| `get-share-activity-summary` | Aggregate activity stats for shared galleries |
| `validate-share-access` | Validate share tokens and password access |

The `delete-user-r2-files` function needs these secrets:

| Secret | Description |
|--------|-------------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID (from the dashboard URL) |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret key |
| `R2_BUCKET_NAME` | Your bucket name (e.g. `posevault-images`) |

The function uses AWS SigV4 signing to authenticate deletion requests directly to R2.

## 4. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
# Supabase — from Project Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

The R2 Worker URL is configured in `src/utils/r2Upload.js`.

## 5. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (Vite default). The `server.host: true` config allows access from other devices on your network, useful for testing on phones.

## 6. Build for Production

```bash
npm run build
```

Output goes to `dist/`. This is a static site and can be deployed to any hosting provider (Cloudflare Pages, Vercel, Netlify, etc.).

## 7. PWA Installation

The app is configured as a Progressive Web App via `vite-plugin-pwa`. After deploying to a production URL with HTTPS:

- **Mobile:** Visit the site in your browser → tap "Add to Home Screen"
- **Desktop:** Look for the install icon in the browser address bar

The service worker caches static assets for offline use. Image data is cached locally in IndexedDB.

## Troubleshooting

**Images not loading after upload**
Check that your R2 Worker is deployed and the URL in `r2Upload.js` matches the worker URL. Verify the worker has R2 bucket bindings configured in `wrangler.jsonc`.

**Cloud sync not working**
Verify your `.env` values are correct. Check the browser console for Supabase errors. Ensure RLS policies are in place — without them, all queries return empty results.

**Tutorial not appearing for new users**
The tutorial checks the `tutorial_completed` key in `user_settings`. If you're testing with an existing account, go to Settings → Show Tutorial Again, or delete the row from `user_settings` in Supabase.

**Sample gallery keeps reappearing after deletion**
This was a known issue with IndexedDB persistence. Ensure you have the latest `useCategories.js` which saves empty arrays (the fix was removing the `categories.length > 0` guard on the debounced save).

**Account deletion fails**
Check that the `delete-user-r2-files` Edge Function is deployed and its secrets are configured. Look at the Edge Function logs in Supabase for errors.

**Shared gallery link returns "not found"**
Verify the `shared_galleries` table exists and RLS policies are in place. Anonymous users need the `"Anyone can read active shares by token"` SELECT policy. Check that the share hasn't expired (`expires_at`) or been deactivated (`is_active = false`).

**Notifications not appearing**
Ensure the `notifications` and `notification_preferences` tables are created with RLS policies. Check that the `create-notification` Edge Function is deployed. Verify the user hasn't enabled quiet mode in their notification preferences.

**Admin panel shows "Access denied"**
The admin panel requires `is_admin = true` in the `user_storage` table. Set it manually: `UPDATE user_storage SET is_admin = true WHERE user_id = 'YOUR-UUID';`. Also ensure the `get_admin_user_list()` RPC function is created and granted to the `authenticated` role.

---

**Made with ❤️ by [Docker Cap Photography](https://github.com/dockercapphotogeaphy)**
