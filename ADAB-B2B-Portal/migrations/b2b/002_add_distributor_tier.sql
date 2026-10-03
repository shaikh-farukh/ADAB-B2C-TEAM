-- Add distributor tier for manufacturer-distributor relationships
ALTER TABLE manage_b_to_b_request_access
ADD COLUMN IF NOT EXISTS distributor_tier character varying(50) DEFAULT 'Bronze';
