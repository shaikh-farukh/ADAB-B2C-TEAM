-- =========================================================================
-- MIGRATION: 001_add_profile_picture_public_id.sql
-- TARGET: customer_profiles table
-- PURPOSE: Store Cloudinary public ID alongside profile_picture_url to track,
--          replace, and clean up uploaded personal profile photos.
-- =========================================================================

ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS profile_picture_public_id TEXT;

