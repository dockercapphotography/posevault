-- ============================================
-- Storage Tiers & Admin System
-- ============================================

-- 1. Create storage_tiers table
CREATE TABLE storage_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  storage_bytes BIGINT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Seed default tiers
INSERT INTO storage_tiers (name, storage_bytes, description, sort_order, is_default) VALUES
  ('Free',   524288000,    '500 MB — for getting started',          0, true),
  ('Pro',    2147483648,   '2 GB — for active photographers',       1, false),
  ('Studio', 10737418240,  '10 GB — for professional studios',      2, false);

-- 3. Add is_admin column to user_storage
ALTER TABLE user_storage
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 4. Make storage_tier reference storage_tiers.id (default = 1, the Free tier)
-- First set any existing NULL or 0 values to 1 (Free tier)
UPDATE user_storage SET storage_tier = 1 WHERE storage_tier IS NULL OR storage_tier = 0;

-- Add default and foreign key
ALTER TABLE user_storage
  ALTER COLUMN storage_tier SET DEFAULT 1;

ALTER TABLE user_storage
  ADD CONSTRAINT fk_storage_tier
  FOREIGN KEY (storage_tier) REFERENCES storage_tiers(id);

-- 5. Update the signup trigger to assign the default tier and its storage limit
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

  -- Fallback if no default tier exists
  IF default_tier_id IS NULL THEN
    default_tier_id := 1;
    default_bytes := 524288000;
  END IF;

  INSERT INTO user_storage (user_id, current_storage, maximum_storage, storage_tier)
  VALUES (NEW.id, 0, default_bytes, default_tier_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS for storage_tiers — everyone can read, nobody can write via client
ALTER TABLE storage_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read storage tiers"
  ON storage_tiers FOR SELECT
  USING (true);

-- 7. Helper function to check admin status (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM user_storage WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 8. Admin RLS policies using the is_admin() function (no self-referencing recursion)
CREATE POLICY "Admins can read all user storage"
  ON user_storage FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can update all user storage"
  ON user_storage FOR UPDATE
  USING (auth.uid() = user_id OR is_admin());

-- NOTE: After running this migration, set yourself as admin:
-- UPDATE user_storage SET is_admin = true WHERE user_id = 'YOUR-USER-UUID-HERE';
