-- =============================================
-- PoseVault — Require Email for Shared Galleries
-- Run in Supabase SQL Editor
-- =============================================

-- Add require_email toggle to shared_galleries
ALTER TABLE shared_galleries
  ADD COLUMN IF NOT EXISTS require_email BOOLEAN NOT NULL DEFAULT false;

-- Add email column to share_viewers
ALTER TABLE share_viewers
  ADD COLUMN IF NOT EXISTS email TEXT;
