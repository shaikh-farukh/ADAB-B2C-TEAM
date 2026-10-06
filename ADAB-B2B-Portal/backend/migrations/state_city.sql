CREATE TABLE IF NOT EXISTS state (
  id SERIAL PRIMARY KEY,
  state_name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS city (
  id SERIAL PRIMARY KEY,
  city_name VARCHAR(255) NOT NULL,
  state_id INTEGER REFERENCES state(id) ON DELETE CASCADE,
  UNIQUE(city_name, state_id)
);

INSERT INTO state (state_name) VALUES 
('Maharashtra'), ('Gujarat'), ('Karnataka'), ('Delhi'), ('Tamil Nadu')
ON CONFLICT (state_name) DO NOTHING;

INSERT INTO city (city_name, state_id) SELECT 'Mumbai', id FROM state WHERE state_name = 'Maharashtra' ON CONFLICT DO NOTHING;
INSERT INTO city (city_name, state_id) SELECT 'Pune', id FROM state WHERE state_name = 'Maharashtra' ON CONFLICT DO NOTHING;
INSERT INTO city (city_name, state_id) SELECT 'Ahmedabad', id FROM state WHERE state_name = 'Gujarat' ON CONFLICT DO NOTHING;
INSERT INTO city (city_name, state_id) SELECT 'Surat', id FROM state WHERE state_name = 'Gujarat' ON CONFLICT DO NOTHING;
INSERT INTO city (city_name, state_id) SELECT 'Bangalore', id FROM state WHERE state_name = 'Karnataka' ON CONFLICT DO NOTHING;
INSERT INTO city (city_name, state_id) SELECT 'New Delhi', id FROM state WHERE state_name = 'Delhi' ON CONFLICT DO NOTHING;
INSERT INTO city (city_name, state_id) SELECT 'Chennai', id FROM state WHERE state_name = 'Tamil Nadu' ON CONFLICT DO NOTHING;
