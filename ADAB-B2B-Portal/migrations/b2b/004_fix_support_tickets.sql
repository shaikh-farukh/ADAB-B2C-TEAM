-- Migration 004: Add missing columns to support tickets

ALTER TABLE manage_b_to_b_support_tickets
ADD COLUMN IF NOT EXISTS attachment TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
