import pool from '../Config/database.js';

const runMigration = async () => {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting migration to add missing profile fields...');
    
    // Add columns one by one in case some already exist (safe approach)
    const columnsToAdd = [
      { name: 'international_business', type: 'BOOLEAN DEFAULT false' },
      { name: 'wish_to_export_countries', type: 'VARCHAR(1000)' },
      { name: 'company_logo', type: 'VARCHAR(255)' },
      { name: 'fk_city', type: 'INTEGER' },
      { name: 'fk_state', type: 'INTEGER' },
      { name: 'latitude', type: 'NUMERIC(10, 6)' },
      { name: 'longitude', type: 'NUMERIC(10, 6)' }
    ];

    for (const col of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE manage_b_to_b_userdetail ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name}`);
      } catch (e) {
        console.log(`⚠️  Could not add ${col.name}: ${e.message}`);
      }
    }

    console.log('🎉 Migration completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
};

runMigration();
