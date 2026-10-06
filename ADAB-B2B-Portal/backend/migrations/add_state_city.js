import pool from '../Config/database.js';

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS state (
        id SERIAL PRIMARY KEY,
        state_name VARCHAR(255) NOT NULL UNIQUE
      );
    `);
    
    // Create city table
    await client.query(`
      CREATE TABLE IF NOT EXISTS city (
        id SERIAL PRIMARY KEY,
        city_name VARCHAR(255) NOT NULL,
        state_id INTEGER REFERENCES state(id) ON DELETE CASCADE,
        UNIQUE(city_name, state_id)
      );
    `);
    
    // Insert some default states
    await client.query(`
      INSERT INTO state (state_name) VALUES 
      ('Maharashtra'), 
      ('Gujarat'), 
      ('Karnataka'), 
      ('Delhi'), 
      ('Tamil Nadu')
      ON CONFLICT (state_name) DO NOTHING;
    `);
    
    // Insert some default cities
    await client.query(`
      INSERT INTO city (city_name, state_id) 
      SELECT 'Mumbai', id FROM state WHERE state_name = 'Maharashtra'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO city (city_name, state_id) 
      SELECT 'Pune', id FROM state WHERE state_name = 'Maharashtra'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO city (city_name, state_id) 
      SELECT 'Ahmedabad', id FROM state WHERE state_name = 'Gujarat'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO city (city_name, state_id) 
      SELECT 'Surat', id FROM state WHERE state_name = 'Gujarat'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO city (city_name, state_id) 
      SELECT 'Bangalore', id FROM state WHERE state_name = 'Karnataka'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO city (city_name, state_id) 
      SELECT 'New Delhi', id FROM state WHERE state_name = 'Delhi'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO city (city_name, state_id) 
      SELECT 'Chennai', id FROM state WHERE state_name = 'Tamil Nadu'
      ON CONFLICT DO NOTHING;
    `);
    
    await client.query('COMMIT');
    console.log("Migration completed: state and city tables created successfully.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
