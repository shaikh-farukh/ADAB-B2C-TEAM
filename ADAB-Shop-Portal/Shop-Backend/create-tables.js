const pool = require('./db');

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_approval_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          listing_id UUID REFERENCES seller_listings(id) ON DELETE CASCADE,
          old_status VARCHAR(50),
          new_status VARCHAR(50) NOT NULL,
          reason TEXT,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS listing_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          listing_id UUID REFERENCES seller_listings(id) ON DELETE CASCADE,
          document_type VARCHAR(100),
          file_url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Created missing Day 2 tables successfully.");
  } catch (err) {
    console.error("Failed to create tables:", err);
  } finally {
    pool.end();
  }
}

createTables();
