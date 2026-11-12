// ============================================================================
// ADAB B2C Catalog Architecture - Migration & Seed Runner
// Migration: 004_catalog_dynamic_attributes_and_variants.sql
// ============================================================================

const dns = require('dns');
if (process.env.DNS_IPV4_FIRST === 'true') {
  dns.setDefaultResultOrder('ipv4first');
}
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL_MODE === 'disable' ? false : {
    rejectUnauthorized: false,
    servername: process.env.DB_HOST
  }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting Catalog Migration & Baseline Seeds...\n');

    // ------------------------------------------------------------------------
    // Step 1: Execute Migration 004 DDL
    // ------------------------------------------------------------------------
    console.log('📦 Step 1: Executing 004_catalog_dynamic_attributes_and_variants.sql...');
    const migrationFile = path.join(__dirname, '../migrations/004_catalog_dynamic_attributes_and_variants.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    await client.query(sql);
    console.log('✅ Migration 004 executed successfully!\n');

    // ------------------------------------------------------------------------
    // Step 2: Seed Sub-Categories (Hierarchical Tree)
    // ------------------------------------------------------------------------
    console.log('🌳 Step 2: Seeding Category Hierarchy (Sub-categories & Leaf Nodes)...');

    // Helper to get or insert category
    async function upsertCategory(name, slug, parentId, level, isLeaf, displayOrder) {
      const existing = await client.query('SELECT id, materialized_path FROM categories WHERE slug = $1', [slug]);
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }
      
      let matPath = '';
      if (parentId) {
        const pRes = await client.query('SELECT materialized_path, id FROM categories WHERE id = $1', [parentId]);
        const p = pRes.rows[0];
        // Ensure parent is not marked as leaf
        await client.query('UPDATE categories SET is_leaf = false WHERE id = $1', [parentId]);
        matPath = p.materialized_path ? `${p.materialized_path}.` : `${p.id}.`;
      }

      const ins = await client.query(
        `INSERT INTO categories (name, slug, parent_id, level, is_leaf, display_order)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [name, slug, parentId, level, isLeaf, displayOrder]
      );
      const newId = ins.rows[0].id;
      matPath = matPath ? `${matPath}${newId}` : `${newId}`;
      await client.query('UPDATE categories SET materialized_path = $1 WHERE id = $2', [matPath, newId]);
      return { id: newId, materialized_path: matPath };
    }

    // Fashion hierarchy (parent: 8)
    const mensClothing = await upsertCategory("Men's Clothing", "mens-clothing", 8, 2, false, 1);
    const kurtas = await upsertCategory("Kurtas & Ethnic Sets", "mens-kurtas-ethnic", mensClothing.id, 3, true, 1);
    const shirts = await upsertCategory("Shirts & Polos", "mens-shirts-polos", mensClothing.id, 3, true, 2);

    const womensClothing = await upsertCategory("Women's Clothing", "womens-clothing", 8, 2, false, 2);
    const sareesKurtis = await upsertCategory("Sarees & Kurtis", "womens-sarees-kurtis", womensClothing.id, 3, true, 1);

    // Fresh Produce hierarchy (parent: 1)
    const freshVeg = await upsertCategory("Fresh Vegetables", "fresh-vegetables", 1, 2, true, 1);
    const freshFruits = await upsertCategory("Fresh Fruits", "fresh-fruits", 1, 2, true, 2);

    // Pantry Staples hierarchy (parent: 3)
    const attaFlours = await upsertCategory("Atta, Flours & Sooji", "atta-flours-sooji", 3, 2, true, 1);
    const riceProducts = await upsertCategory("Rice & Rice Products", "rice-rice-products", 3, 2, true, 2);
    const dalsPulses = await upsertCategory("Dals & Pulses", "dals-pulses", 3, 2, true, 3);

    // Snacks hierarchy (parent: 4)
    const biscuitsCookies = await upsertCategory("Biscuits & Cookies", "biscuits-cookies", 4, 2, true, 1);
    const noodlesPasta = await upsertCategory("Noodles & Pasta", "noodles-pasta", 4, 2, true, 2);

    console.log('✅ Category hierarchy seeded successfully!\n');

    // ------------------------------------------------------------------------
    // Step 3: Seed Attribute Definitions (Dictionary)
    // ------------------------------------------------------------------------
    console.log('📋 Step 3: Seeding Attribute Definitions Dictionary...');

    const attributesToSeed = [
      {
        code: 'size',
        label: 'Size',
        description: 'Apparel or shoe size',
        data_type: 'ENUM',
        ui_type: 'select',
        allowed_values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'],
        unit_options: []
      },
      {
        code: 'color',
        label: 'Color',
        description: 'Primary product shade / color',
        data_type: 'ENUM',
        ui_type: 'select',
        allowed_values: ['Black', 'White', 'Navy Blue', 'Maroon', 'Red', 'Green', 'Yellow', 'Grey', 'Beige', 'Blue', 'Pink', 'Multicolor'],
        unit_options: []
      },
      {
        code: 'fabric_material',
        label: 'Fabric / Material',
        description: 'Primary fabric textile composition',
        data_type: 'ENUM',
        ui_type: 'select',
        allowed_values: ['100% Cotton', 'Pure Silk', 'Linen', 'Chiffon', 'Georgette', 'Polyester Blend', 'Rayon', 'Khadi', 'Denim'],
        unit_options: []
      },
      {
        code: 'fit_type',
        label: 'Fit Profile',
        description: 'Fit cut profile for apparel',
        data_type: 'ENUM',
        ui_type: 'select',
        allowed_values: ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Loose Fit', 'Oversized'],
        unit_options: []
      },
      {
        code: 'sleeve_length',
        label: 'Sleeve Length',
        description: 'Length of garment sleeves',
        data_type: 'ENUM',
        ui_type: 'select',
        allowed_values: ['Full Sleeve', 'Half Sleeve', 'Sleeveless', '3/4th Sleeve', 'Short Sleeve'],
        unit_options: []
      },
      {
        code: 'pattern',
        label: 'Pattern / Print',
        description: 'Visual pattern or weave',
        data_type: 'ENUM',
        ui_type: 'select',
        allowed_values: ['Solid / Plain', 'Striped', 'Printed', 'Checked', 'Embroidered', 'Floral', 'Self Design'],
        unit_options: []
      },
      {
        code: 'dietary_type',
        label: 'Dietary Preference',
        description: 'Vegetarian or non-vegetarian classification',
        data_type: 'ENUM',
        ui_type: 'radio',
        allowed_values: ['Veg', 'Non-Veg', 'Vegan', 'Egg'],
        unit_options: []
      },
      {
        code: 'fssai_license_number',
        label: 'FSSAI License Number',
        description: '14-digit food safety registration number',
        data_type: 'TEXT',
        ui_type: 'text',
        allowed_values: [],
        unit_options: [],
        validation_regex: '^[0-9]{14}$'
      },
      {
        code: 'shelf_life_days',
        label: 'Shelf Life',
        description: 'Product shelf life duration',
        data_type: 'NUMBER',
        ui_type: 'number',
        allowed_values: [],
        unit_options: ['days', 'months', 'years']
      },
      {
        code: 'country_of_origin',
        label: 'Country of Origin',
        description: 'Manufacturing country',
        data_type: 'ENUM',
        ui_type: 'select',
        allowed_values: ['India', 'Bangladesh', 'Vietnam', 'Sri Lanka', 'Other'],
        unit_options: []
      },
      {
        code: 'storage_instructions',
        label: 'Storage Instructions',
        description: 'Storage guidelines',
        data_type: 'TEXT',
        ui_type: 'text',
        allowed_values: ['Store in a cool dry place', 'Keep refrigerated', 'Do not freeze', 'Store away from direct sunlight'],
        unit_options: []
      },
      {
        code: 'organic_certified',
        label: 'Organic Certified',
        description: 'Is product certified organic',
        data_type: 'BOOLEAN',
        ui_type: 'checkbox',
        allowed_values: [],
        unit_options: []
      }
    ];

    const attrIdMap = {};
    for (const attr of attributesToSeed) {
      const res = await client.query(
        `INSERT INTO attribute_definitions (code, label, description, data_type, ui_type, allowed_values, unit_options, validation_regex, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (code) DO UPDATE 
         SET label = EXCLUDED.label, 
             allowed_values = EXCLUDED.allowed_values, 
             ui_type = EXCLUDED.ui_type,
             validation_regex = EXCLUDED.validation_regex,
             updated_at = NOW()
         RETURNING id, code`,
        [attr.code, attr.label, attr.description, attr.data_type, attr.ui_type, JSON.stringify(attr.allowed_values), JSON.stringify(attr.unit_options), attr.validation_regex || null]
      );
      attrIdMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log(`✅ Seeded ${Object.keys(attrIdMap).length} attribute definitions!\n`);

    // ------------------------------------------------------------------------
    // Step 4: Map Attributes to Categories (category_attributes)
    // ------------------------------------------------------------------------
    console.log('🔗 Step 4: Mapping Attributes to Categories...');

    async function bindCategoryAttribute(catId, attrCode, isRequired, isVariantKey, isFilterFacet, order, section) {
      const attrId = attrIdMap[attrCode];
      if (!attrId) return;
      await client.query(
        `INSERT INTO category_attributes (category_id, attribute_id, is_required, is_variant_key, is_filter_facet, display_order, section_group)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (category_id, attribute_id) DO UPDATE 
         SET is_required = EXCLUDED.is_required,
             is_variant_key = EXCLUDED.is_variant_key,
             is_filter_facet = EXCLUDED.is_filter_facet,
             display_order = EXCLUDED.display_order,
             section_group = EXCLUDED.section_group`,
        [catId, attrId, isRequired, isVariantKey, isFilterFacet, order, section]
      );
    }

    // 1. Fashion & Apparel (Department Level: 8)
    await bindCategoryAttribute(8, 'country_of_origin', false, false, false, 1, 'General Specs');

    // 2. Kurtas & Ethnic Sets (Leaf Level)
    await bindCategoryAttribute(kurtas.id, 'fabric_material', true, false, true, 2, 'Key Specifications');
    await bindCategoryAttribute(kurtas.id, 'fit_type', false, false, true, 3, 'Key Specifications');
    await bindCategoryAttribute(kurtas.id, 'sleeve_length', false, false, true, 4, 'Key Specifications');
    await bindCategoryAttribute(kurtas.id, 'pattern', false, false, true, 5, 'Key Specifications');
    await bindCategoryAttribute(kurtas.id, 'color', true, true, true, 6, 'Variation Options');
    await bindCategoryAttribute(kurtas.id, 'size', true, true, true, 7, 'Variation Options');

    // 3. Shirts & Polos (Leaf Level)
    await bindCategoryAttribute(shirts.id, 'fabric_material', true, false, true, 2, 'Key Specifications');
    await bindCategoryAttribute(shirts.id, 'fit_type', true, false, true, 3, 'Key Specifications');
    await bindCategoryAttribute(shirts.id, 'pattern', false, false, true, 4, 'Key Specifications');
    await bindCategoryAttribute(shirts.id, 'color', true, true, true, 5, 'Variation Options');
    await bindCategoryAttribute(shirts.id, 'size', true, true, true, 6, 'Variation Options');

    // 4. Sarees & Kurtis (Leaf Level)
    await bindCategoryAttribute(sareesKurtis.id, 'fabric_material', true, false, true, 2, 'Key Specifications');
    await bindCategoryAttribute(sareesKurtis.id, 'pattern', false, false, true, 3, 'Key Specifications');
    await bindCategoryAttribute(sareesKurtis.id, 'color', true, true, true, 4, 'Variation Options');
    await bindCategoryAttribute(sareesKurtis.id, 'size', true, true, true, 5, 'Variation Options');

    // 5. Food Categories (Pantry, Snacks, Fresh Produce)
    for (const foodCatId of [3, 4, attaFlours.id, riceProducts.id, dalsPulses.id, biscuitsCookies.id, noodlesPasta.id]) {
      await bindCategoryAttribute(foodCatId, 'dietary_type', true, false, true, 1, 'Compliance & Diet');
      await bindCategoryAttribute(foodCatId, 'fssai_license_number', true, false, false, 2, 'Compliance & Diet');
      await bindCategoryAttribute(foodCatId, 'shelf_life_days', false, false, false, 3, 'Key Specifications');
      await bindCategoryAttribute(foodCatId, 'storage_instructions', false, false, false, 4, 'Usage & Storage');
      await bindCategoryAttribute(foodCatId, 'organic_certified', false, false, true, 5, 'Certifications');
    }

    // 6. Fresh Produce (id: 1, freshVeg, freshFruits)
    for (const produceCatId of [1, freshVeg.id, freshFruits.id]) {
      await bindCategoryAttribute(produceCatId, 'dietary_type', true, false, true, 1, 'Diet');
      await bindCategoryAttribute(produceCatId, 'organic_certified', false, false, true, 2, 'Certifications');
    }

    console.log('✅ Category attribute mappings established!\n');

    // ------------------------------------------------------------------------
    // Step 5: Seed Vernacular Category Aliases (category_aliases)
    // ------------------------------------------------------------------------
    console.log('🗣️ Step 5: Seeding Vernacular Search Aliases...');

    const aliasesToSeed = [
      { catId: kurtas.id, alias: 'Gents Kurti', lang: 'en' },
      { catId: kurtas.id, alias: 'Kurta Pyjama', lang: 'en' },
      { catId: kurtas.id, alias: 'Ethnic Wear', lang: 'en' },
      { catId: sareesKurtis.id, alias: 'Ladies Kurti', lang: 'en' },
      { catId: sareesKurtis.id, alias: 'Saree', lang: 'en' },
      { catId: attaFlours.id, alias: 'Atta', lang: 'hi' },
      { catId: attaFlours.id, alias: 'Wheat Flour', lang: 'en' },
      { catId: attaFlours.id, alias: 'Maida', lang: 'hi' },
      { catId: attaFlours.id, alias: 'Besan', lang: 'hi' },
      { catId: riceProducts.id, alias: 'Chawal', lang: 'hi' },
      { catId: riceProducts.id, alias: 'Basmati Rice', lang: 'en' },
      { catId: dalsPulses.id, alias: 'Dal', lang: 'hi' },
      { catId: dalsPulses.id, alias: 'Moong Dal', lang: 'hi' },
      { catId: dalsPulses.id, alias: 'Toor Dal', lang: 'hi' },
      { catId: freshVeg.id, alias: 'Tamatar', lang: 'hi' },
      { catId: freshVeg.id, alias: 'Aloo', lang: 'hi' },
      { catId: freshVeg.id, alias: 'Pyaaz', lang: 'hi' },
      { catId: freshVeg.id, alias: 'Sabzi', lang: 'hi' }
    ];

    for (const a of aliasesToSeed) {
      await client.query(
        `INSERT INTO category_aliases (category_id, alias_term, language_code)
         VALUES ($1, $2, $3)
         ON CONFLICT (category_id, alias_term) DO NOTHING`,
        [a.catId, a.alias, a.lang]
      );
    }
    console.log(`✅ Seeded ${aliasesToSeed.length} vernacular aliases!\n`);

    // ------------------------------------------------------------------------
    // Step 6: Verify Database Status
    // ------------------------------------------------------------------------
    console.log('🔍 Step 6: Verifying New Tables and Counts in PostgreSQL...');

    const checks = [
      { name: 'categories', query: 'SELECT count(*) FROM categories' },
      { name: 'category_aliases', query: 'SELECT count(*) FROM category_aliases' },
      { name: 'attribute_definitions', query: 'SELECT count(*) FROM attribute_definitions' },
      { name: 'category_attributes', query: 'SELECT count(*) FROM category_attributes' },
      { name: 'listing_variants', query: 'SELECT count(*) FROM listing_variants' },
      { name: 'catalog_promotion_audit', query: 'SELECT count(*) FROM catalog_promotion_audit' },
      { name: 'seller_listings (Numeric Stock)', query: 'SELECT count(*) FROM seller_listings WHERE stock_qty IS NOT NULL' },
      { name: 'master_catalog_items', query: 'SELECT count(*) FROM master_catalog_items' },
      { name: 'manage_manufacturer_products', query: 'SELECT count(*) FROM manage_manufacturer_products' }
    ];

    for (const c of checks) {
      const res = await client.query(c.query);
      console.log(`  • ${c.name.padEnd(35)} : ${res.rows[0].count} rows`);
    }

    console.log('\n🎉 ALL MIGRATION & SEED WORK COMPLETED SUCCESSFULLY! Database is 100% prepared.');

  } catch (err) {
    console.error('❌ MIGRATION ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

