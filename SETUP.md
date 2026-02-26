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

### Supabase Edge Function for Account Deletion

When a user deletes their account, a Supabase Edge Function handles bulk R2 file cleanup in the background. Create this in the Supabase Dashboard under Edge Functions:

**Function name:** `delete-user-r2-files`

The function needs these secrets set in its configuration:

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

---

**Made with ❤️ by [Docker Cap Photography](https://github.com/dockercapphotogeaphy)**
