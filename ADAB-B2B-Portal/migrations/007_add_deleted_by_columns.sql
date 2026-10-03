-- Migration 007: Add deleted_by column to products and categories tables

ALTER TABLE manage_manufacturer_products ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
ALTER TABLE manage_b_to_b_categories ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
ALTER TABLE manage_b_to_b_subcategories ADD COLUMN IF NOT EXISTS deleted_by INTEGER;
