-- Migration 003: Add missing tables and columns for market coverage

-- 1. Create state table
CREATE TABLE IF NOT EXISTS state (
  id SERIAL PRIMARY KEY,
  state_name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create city table
CREATE TABLE IF NOT EXISTS city (
  id SERIAL PRIMARY KEY,
  state_id INTEGER REFERENCES state(id),
  city_name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add missing columns to manage_b_to_b_userdetail
ALTER TABLE manage_b_to_b_userdetail
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8),
ADD COLUMN IF NOT EXISTS fk_state INTEGER,
ADD COLUMN IF NOT EXISTS fk_city INTEGER;
