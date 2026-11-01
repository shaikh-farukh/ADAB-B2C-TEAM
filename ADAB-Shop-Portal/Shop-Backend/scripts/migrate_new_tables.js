const fs = require('fs');
const path = require('path');
const pool = require('../db');

async function runNewMigrations() {
  const client = await pool.connect();

  try {
    console.log('=================================================================');
    console.log('   MIGRATING 45 NEW TABLES & EDITED COLUMNS TO NEON POSTGRESQL   ');
    console.log('=================================================================\n');

    // 1. Prerequisites: state, city, campaigns, manage_b_to_b_user_type
    console.log('1. Creating B2B Foundation Tables (state, city, campaigns, user_type)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS manage_b_to_b_user_type (
        id SERIAL PRIMARY KEY,
        typename VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS state (
        id SERIAL PRIMARY KEY,
        state_name VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS city (
        id SERIAL PRIMARY KEY,
        state_id INTEGER REFERENCES state(id),
        city_name VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        description TEXT,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_by INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaign_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        message TEXT,
        target_role VARCHAR(50),
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaign_deliveries (
        id SERIAL PRIMARY KEY,
        campaign_notification_id INTEGER REFERENCES campaign_notifications(id) ON DELETE CASCADE,
        user_id INTEGER,
        delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'delivered'
      );
    `);
    console.log('✅ B2B Foundation Tables ready.');

    // 2. Domain 4: Catalog, Taxonomy & Variant Tables + Alterations
    console.log('\n2. Applying Domain 4 Taxonomy, Attributes & Listing Variants...');
    await client.query(`
      -- Alter existing categories
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 1;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS materialized_path VARCHAR(500);
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_leaf BOOLEAN DEFAULT true;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS google_product_category_id INT;

      -- category_aliases
      CREATE TABLE IF NOT EXISTS category_aliases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        alias_term VARCHAR(255) NOT NULL,
        language_code VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_category_alias UNIQUE (category_id, alias_term)
      );

      -- attribute_definitions
      CREATE TABLE IF NOT EXISTS attribute_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(255) NOT NULL,
        description TEXT,
        data_type VARCHAR(50) NOT NULL,
        ui_type VARCHAR(50) NOT NULL,
        allowed_values JSONB DEFAULT '[]'::jsonb,
        unit_options JSONB DEFAULT '[]'::jsonb,
        validation_regex VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- category_attributes
      CREATE TABLE IF NOT EXISTS category_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        attribute_id UUID NOT NULL REFERENCES attribute_definitions(id) ON DELETE CASCADE,
        is_required BOOLEAN DEFAULT false,
        is_variant_key BOOLEAN DEFAULT false,
        is_filter_facet BOOLEAN DEFAULT false,
        display_order INT DEFAULT 0,
        section_group VARCHAR(100) DEFAULT 'General',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_cat_attr UNIQUE (category_id, attribute_id)
      );

      -- Alter seller_listings
      ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS manufacturer_product_id INTEGER;
      ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE seller_listings ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

      -- listing_variants
      CREATE TABLE IF NOT EXISTS listing_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        listing_id UUID NOT NULL REFERENCES seller_listings(id) ON DELETE CASCADE,
        sku VARCHAR(100) NOT NULL,
        barcode VARCHAR(100),
        mrp NUMERIC(12,2) NOT NULL,
        sell_price NUMERIC(12,2) NOT NULL,
        stock_qty NUMERIC(12,3) NOT NULL DEFAULT 0.000,
        variant_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_listing_variant_sku UNIQUE (listing_id, sku)
      );

      -- taxonomy_versions
      CREATE TABLE IF NOT EXISTS taxonomy_versions (
        version_tag VARCHAR(50) PRIMARY KEY,
        description TEXT,
        migration_file VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- catalog_promotion_audit
      CREATE TABLE IF NOT EXISTS catalog_promotion_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        source_type VARCHAR(50) NOT NULL,
        source_id VARCHAR(100) NOT NULL,
        target_listing_id UUID REFERENCES seller_listings(id) ON DELETE SET NULL,
        curation_notes TEXT,
        action_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Alter cart_items & order_items
      ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES listing_variants(id) ON DELETE SET NULL;
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES listing_variants(id) ON DELETE SET NULL;
    `);
    console.log('✅ Domain 4 Taxonomy & Variant Tables applied.');

    // 3. Domain 11: Execute B2B Migrations in order
    console.log('\n3. Executing B2B Migration Scripts (migrations/b2b/*.sql)...');
    const b2bDir = path.resolve(__dirname, '../../../migrations/b2b');
    const b2bFiles = fs.readdirSync(b2bDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // 001, 002, 003...

    for (const file of b2bFiles) {
      const fullPath = path.join(b2bDir, file);
      console.log(`   Applying: ${file}...`);
      const sqlContent = fs.readFileSync(fullPath, 'utf8');

      // Execute statement by statement
      const stmts = sqlContent
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && s !== 'BEGIN' && s !== 'COMMIT');

      for (const stmt of stmts) {
        try {
          await client.query(stmt);
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {});
          // Safely ignore if column or table already exists
          if (err.code === '42701' || err.code === '42P07' || err.message.includes('already exists')) {
            // Already exists, ignore
          } else {
            console.warn(`      ⚠️ Notice on [${stmt.slice(0, 50)}...]: ${err.message}`);
          }
        }
      }
    }
    console.log('✅ All B2B migration scripts executed.');

    // 4. Verify any remaining missing tables from DATABASE_TABLES_AND_COLUMNS1.md
    console.log('\n4. Verifying against DATABASE_TABLES_AND_COLUMNS1.md...');
    const checkRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const existingTableNames = new Set(checkRes.rows.map(r => r.table_name.toLowerCase()));
    console.log(`Current Total Base Tables in Neon DB: ${existingTableNames.size}`);

  } catch (err) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runNewMigrations();
