-- Migration 005: Add missing columns to contact submissions

ALTER TABLE manage_b_to_b_contact_submissions
ADD COLUMN IF NOT EXISTS user_id INTEGER,
ADD COLUMN IF NOT EXISTS status CHARACTER VARYING(50) DEFAULT 'pending';
