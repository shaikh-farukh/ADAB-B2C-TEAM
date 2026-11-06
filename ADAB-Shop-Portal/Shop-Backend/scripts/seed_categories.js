const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { Client } = require('./ADAB-Shop-Portal/Shop-Backend/node_modules/pg');
const dotenv = require('./ADAB-Shop-Portal/Shop-Backend/node_modules/dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'ADAB-Shop-Portal', 'Shop-Backend', '.env') });

// Use direct host without pooler and clean parameters for fast, reliable connection
let connStr = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
connStr = connStr.replace('-pooler', '').replace('&channel_binding=require', '').replace('channel_binding=require&', '');

async function seed() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000
  });

  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected! Starting seed transaction...');

  try {
    await client.query('BEGIN');

    // 1. Ensure root categories (Level 1) are marked is_leaf = false
    console.log('Updating root categories (Level 1)...');
    await client.query(`
      UPDATE categories
      SET is_leaf = false, level = 1, parent_id = null
      WHERE id BETWEEN 1 AND 10;
    `);

    // Helper to insert category if slug doesn't exist
    async function getOrInsertCategory(name, slug, level, parentId, isLeaf, displayOrder) {
      const existing = await client.query('SELECT id FROM categories WHERE slug = $1', [slug]);
      if (existing.rows.length > 0) {
        await client.query(
          'UPDATE categories SET name = $1, level = $2, parent_id = $3, is_leaf = $4, display_order = $5 WHERE id = $6',
          [name, level, parentId, isLeaf, displayOrder, existing.rows[0].id]
        );
        return existing.rows[0].id;
      }
      const res = await client.query(
        'INSERT INTO categories (name, slug, level, parent_id, is_leaf, display_order, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id',
        [name, slug, level, parentId, isLeaf, displayOrder]
      );
      return res.rows[0].id;
    }

    // 2. Define Category Hierarchy (Level 2 Subcategories & Level 3 Leaf Categories)
    console.log('Seeding Level 2 & Level 3 category hierarchy...');
    const categoryTree = [
      // 1: Fruits & Vegetables
      {
        parentId: 1,
        subcategories: [
          {
            name: 'Fresh Vegetables',
            slug: 'fresh-vegetables',
            order: 1,
            leaves: [
              { name: 'Daily Essentials (Potato, Onion, Tomato)', slug: 'daily-essentials-pot-on-tom', order: 1 },
              { name: 'Leafy Greens', slug: 'leafy-greens', order: 2 },
              { name: 'Gourds, Beans & Vegetables', slug: 'gourds-beans-vegetables', order: 3 }
            ]
          },
          {
            name: 'Fresh Fruits',
            slug: 'fresh-fruits',
            order: 2,
            leaves: [
              { name: 'Apples, Bananas & Citrus', slug: 'apples-bananas-citrus', order: 1 },
              { name: 'Seasonal & Exotic Fruits', slug: 'seasonal-exotic-fruits', order: 2 }
            ]
          }
        ]
      },
      // 2: Dairy & Eggs
      {
        parentId: 2,
        subcategories: [
          {
            name: 'Milk & Curd',
            slug: 'milk-curd',
            order: 1,
            leaves: [
              { name: 'Fresh Milk & Pouches', slug: 'fresh-milk-pouches', order: 1 },
              { name: 'Curd, Dahi & Chaas', slug: 'curd-dahi-chaas', order: 2 },
              { name: 'Paneer & Tofu', slug: 'paneer-tofu', order: 3 }
            ]
          },
          {
            name: 'Butter, Cheese & Ghee',
            slug: 'butter-cheese-ghee',
            order: 2,
            leaves: [
              { name: 'Table Butter & Spreads', slug: 'table-butter-spreads', order: 1 },
              { name: 'Cheese Blocks & Slices', slug: 'cheese-blocks-slices', order: 2 },
              { name: 'Pure Desi Ghee', slug: 'pure-desi-ghee', order: 3 }
            ]
          },
          {
            name: 'Eggs',
            slug: 'eggs',
            order: 3,
            leaves: [
              { name: 'Farm Fresh White Eggs', slug: 'farm-fresh-white-eggs', order: 1 },
              { name: 'Brown & Organic Eggs', slug: 'brown-organic-eggs', order: 2 }
            ]
          }
        ]
      },
      // 3: Pantry Staples
      {
        parentId: 3,
        subcategories: [
          {
            name: 'Atta, Flours & Sooji',
            slug: 'atta-flours-sooji',
            order: 1,
            leaves: [
              { name: 'Whole Wheat Chakki Atta', slug: 'whole-wheat-chakki-atta', order: 1 },
              { name: 'Maida & Besan', slug: 'maida-besan', order: 2 },
              { name: 'Sooji, Rava & Rice Flour', slug: 'sooji-rava-rice-flour', order: 3 }
            ]
          },
          {
            name: 'Rice & Rice Products',
            slug: 'rice-rice-products',
            order: 2,
            leaves: [
              { name: 'Basmati & Long Grain Rice', slug: 'basmati-long-grain-rice', order: 1 },
              { name: 'Kolam, Sona Masoori & Regular Rice', slug: 'kolam-sona-masoori-regular-rice', order: 2 },
              { name: 'Poha & Puffed Rice (Kurmura)', slug: 'poha-puffed-rice-kurmura', order: 3 }
            ]
          },
          {
            name: 'Dals & Pulses',
            slug: 'dals-pulses',
            order: 3,
            leaves: [
              { name: 'Toor, Moong & Masoor Dal', slug: 'toor-moong-masoor-dal', order: 1 },
              { name: 'Chana & Urad Dal', slug: 'chana-urad-dal', order: 2 },
              { name: 'Rajma, Chhole & Lobia', slug: 'rajma-chhole-lobia', order: 3 }
            ]
          },
          {
            name: 'Sugar, Jaggery & Salt',
            slug: 'sugar-jaggery-salt',
            order: 4,
            leaves: [
              { name: 'Refined & Brown Sugar', slug: 'refined-brown-sugar', order: 1 },
              { name: 'Organic Jaggery (Gud)', slug: 'organic-jaggery-gud', order: 2 },
              { name: 'Iodized & Himalayan Rock Salt', slug: 'iodized-himalayan-rock-salt', order: 3 }
            ]
          }
        ]
      },
      // 4: Snacks & Packaged Foods
      {
        parentId: 4,
        subcategories: [
          {
            name: 'Biscuits & Bakery',
            slug: 'biscuits-bakery',
            order: 1,
            leaves: [
              { name: 'Marie, Glucose & Digestives', slug: 'marie-glucose-digestives', order: 1 },
              { name: 'Cream & Chocolate Biscuits', slug: 'cream-chocolate-biscuits', order: 2 },
              { name: 'Rusk, Khari & Bread', slug: 'rusk-khari-bread', order: 3 }
            ]
          },
          {
            name: 'Chips & Namkeen',
            slug: 'chips-namkeen',
            order: 2,
            leaves: [
              { name: 'Potato Chips & Crisps', slug: 'potato-chips-crisps', order: 1 },
              { name: 'Bhujia & Traditional Namkeen', slug: 'bhujia-traditional-namkeen', order: 2 },
              { name: 'Makhana, Peanuts & Dry Snacks', slug: 'makhana-peanuts-dry-snacks', order: 3 }
            ]
          },
          {
            name: 'Instant Noodles & Pasta',
            slug: 'instant-noodles-pasta',
            order: 3,
            leaves: [
              { name: 'Maggi & Instant Noodles', slug: 'maggi-instant-noodles', order: 1 },
              { name: 'Pasta, Macaroni & Vermicelli', slug: 'pasta-macaroni-vermicelli', order: 2 },
              { name: 'Instant Soups & Ready-to-Cook', slug: 'instant-soups-ready-to-cook', order: 3 }
            ]
          }
        ]
      },
      // 5: Beverages
      {
        parentId: 5,
        subcategories: [
          {
            name: 'Tea & Coffee',
            slug: 'tea-coffee',
            order: 1,
            leaves: [
              { name: 'Black & CTC Tea Powder', slug: 'black-ctc-tea-powder', order: 1 },
              { name: 'Green & Herbal Tea', slug: 'green-herbal-tea', order: 2 },
              { name: 'Instant & Filter Coffee', slug: 'instant-filter-coffee', order: 3 }
            ]
          },
          {
            name: 'Juices & Cold Drinks',
            slug: 'juices-cold-drinks',
            order: 2,
            leaves: [
              { name: 'Packaged Fruit Juices', slug: 'packaged-fruit-juices', order: 1 },
              { name: 'Aerated Soft Drinks & Sodas', slug: 'aerated-soft-drinks-sodas', order: 2 },
              { name: 'Energy & Health Drinks', slug: 'energy-health-drinks', order: 3 }
            ]
          }
        ]
      },
      // 6: Personal Care
      {
        parentId: 6,
        subcategories: [
          {
            name: 'Bath & Body',
            slug: 'bath-body',
            order: 1,
            leaves: [
              { name: 'Bathing Soaps & Body Wash', slug: 'bathing-soaps-body-wash', order: 1 },
              { name: 'Hair Shampoos & Oils', slug: 'hair-shampoos-oils', order: 2 }
            ]
          },
          {
            name: 'Oral Care',
            slug: 'oral-care',
            order: 2,
            leaves: [
              { name: 'Toothpaste & Toothbrushes', slug: 'toothpaste-toothbrushes', order: 1 }
            ]
          }
        ]
      },
      // 7: Household & Cleaning
      {
        parentId: 7,
        subcategories: [
          {
            name: 'Laundry Care',
            slug: 'laundry-care',
            order: 1,
            leaves: [
              { name: 'Washing Powders & Liquids', slug: 'washing-powders-liquids', order: 1 },
              { name: 'Detergent Bars & Fabric Conditioners', slug: 'detergent-bars-fabric-conditioners', order: 2 }
            ]
          },
          {
            name: 'Cleaning & Hygiene',
            slug: 'cleaning-hygiene',
            order: 2,
            leaves: [
              { name: 'Dishwashing Liquids & Bars', slug: 'dishwashing-liquids-bars', order: 1 },
              { name: 'Floor, Glass & Toilet Cleaners', slug: 'floor-glass-toilet-cleaners', order: 2 }
            ]
          }
        ]
      },
      // 8: Baby Care
      {
        parentId: 8,
        subcategories: [
          {
            name: 'Diapers & Wipes',
            slug: 'diapers-wipes',
            order: 1,
            leaves: [
              { name: 'Baby Diapers', slug: 'baby-diapers', order: 1 },
              { name: 'Baby Wet Wipes', slug: 'baby-wet-wipes', order: 2 }
            ]
          },
          {
            name: 'Baby Food & Feeding',
            slug: 'baby-food-feeding',
            order: 2,
            leaves: [
              { name: 'Infant Cereals & Milk Powder', slug: 'infant-cereals-milk-powder', order: 1 }
            ]
          }
        ]
      },
      // 9: Meat & Seafood
      {
        parentId: 9,
        subcategories: [
          {
            name: 'Fresh Poultry & Meat',
            slug: 'fresh-poultry-meat',
            order: 1,
            leaves: [
              { name: 'Fresh Chicken Cuts', slug: 'fresh-chicken-cuts', order: 1 },
              { name: 'Mutton & Lamb Cuts', slug: 'mutton-lamb-cuts', order: 2 }
            ]
          },
          {
            name: 'Fish & Seafood',
            slug: 'fish-seafood',
            order: 2,
            leaves: [
              { name: 'Freshwater & Marine Fish', slug: 'freshwater-marine-fish', order: 1 },
              { name: 'Prawns & Shellfish', slug: 'prawns-shellfish', order: 2 }
            ]
          }
        ]
      },
      // 10: Spices & Edible Oils
      {
        parentId: 10,
        subcategories: [
          {
            name: 'Edible Oils & Ghee',
            slug: 'edible-oils-ghee',
            order: 1,
            leaves: [
              { name: 'Mustard, Sunflower & Soybean Oil', slug: 'mustard-sunflower-soybean-oil', order: 1 },
              { name: 'Groundnut, Sesame & Olive Oil', slug: 'groundnut-sesame-olive-oil', order: 2 }
            ]
          },
          {
            name: 'Spices & Masalas',
            slug: 'spices-masalas',
            order: 2,
            leaves: [
              { name: 'Basic Ground Spices (Haldi, Mirch, Dhaniya)', slug: 'basic-ground-spices', order: 1 },
              { name: 'Blended Garam & Kitchen Masalas', slug: 'blended-garam-kitchen-masalas', order: 2 },
              { name: 'Whole Spices (Cumin, Mustard Seeds, Pepper)', slug: 'whole-spices', order: 3 }
            ]
          }
        ]
      }
    ];

    let totalSubCount = 0;
    let totalLeafCount = 0;

    for (const group of categoryTree) {
      for (const sub of group.subcategories) {
        const subId = await getOrInsertCategory(sub.name, sub.slug, 2, group.parentId, false, sub.order);
        totalSubCount++;
        for (const leaf of sub.leaves) {
          await getOrInsertCategory(leaf.name, leaf.slug, 3, subId, true, leaf.order);
          totalLeafCount++;
        }
      }
    }
    console.log(`Created/updated ${totalSubCount} subcategories (Level 2) and ${totalLeafCount} leaf categories (Level 3).`);

    // 3. Define Standard FMCG Attributes in attribute_definitions
    console.log('Seeding attribute_definitions...');
    const attributeDefs = [
      {
        code: 'dietary_type',
        label: 'Dietary Preference',
        description: 'Mandatory Food safety mark (Green/Red dot)',
        data_type: 'string',
        ui_type: 'radio',
        allowed_values: ['Veg', 'Non-Veg', 'Egg', 'Vegan'],
        unit_options: [],
        validation_regex: null
      },
      {
        code: 'fssai_license_number',
        label: 'FSSAI License Number',
        description: 'Mandatory 14-digit FSSAI regulatory registration number',
        data_type: 'string',
        ui_type: 'text',
        allowed_values: [],
        unit_options: [],
        validation_regex: '^[0-9]{14}$'
      },
      {
        code: 'country_of_origin',
        label: 'Country of Origin',
        description: 'Country where product was manufactured/packed',
        data_type: 'string',
        ui_type: 'select',
        allowed_values: ['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Thailand', 'Other'],
        unit_options: [],
        validation_regex: null
      },
      {
        code: 'shelf_life_days',
        label: 'Shelf Life',
        description: 'Product usable lifespan from manufacture date',
        data_type: 'integer',
        ui_type: 'number',
        allowed_values: [],
        unit_options: ['days'],
        validation_regex: '^[0-9]+$'
      },
      {
        code: 'storage_temperature',
        label: 'Storage Instructions',
        description: 'Recommended storage environment',
        data_type: 'string',
        ui_type: 'select',
        allowed_values: [
          'Ambient / Room Temperature',
          'Store in a cool & dry place',
          'Refrigerated (2°C - 8°C)',
          'Deep Frozen (-18°C)'
        ],
        unit_options: [],
        validation_regex: null
      },
      {
        code: 'packaging_type',
        label: 'Packaging Type',
        description: 'Type of outer/inner container',
        data_type: 'string',
        ui_type: 'select',
        allowed_values: [
          'Pouch / Packet',
          'Bottle / Jar',
          'Box / Carton',
          'Tin / Can',
          'Tetra Pak',
          'Loose / Open'
        ],
        unit_options: [],
        validation_regex: null
      },
      {
        code: 'organic_certified',
        label: 'Organic Certified (Jaivik Bharat)',
        description: 'Indicates government-certified organic product',
        data_type: 'boolean',
        ui_type: 'checkbox',
        allowed_values: [],
        unit_options: [],
        validation_regex: null
      }
    ];

    const attributeMap = {}; // code -> uuid

    for (const attr of attributeDefs) {
      const existing = await client.query('SELECT id FROM attribute_definitions WHERE code = $1', [attr.code]);
      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE attribute_definitions 
           SET label = $1, description = $2, data_type = $3, ui_type = $4, allowed_values = $5, unit_options = $6, validation_regex = $7, updated_at = NOW()
           WHERE code = $8`,
          [attr.label, attr.description, attr.data_type, attr.ui_type, JSON.stringify(attr.allowed_values), JSON.stringify(attr.unit_options), attr.validation_regex, attr.code]
        );
        attributeMap[attr.code] = existing.rows[0].id;
      } else {
        const ins = await client.query(
          `INSERT INTO attribute_definitions (code, label, description, data_type, ui_type, allowed_values, unit_options, validation_regex)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [attr.code, attr.label, attr.description, attr.data_type, attr.ui_type, JSON.stringify(attr.allowed_values), JSON.stringify(attr.unit_options), attr.validation_regex]
        );
        attributeMap[attr.code] = ins.rows[0].id;
      }
    }
    console.log(`Seeded ${Object.keys(attributeMap).length} attribute definitions.`);

    // 4. Link Category Attributes
    console.log('Mapping category_attributes...');
    // Clear out any old relations to avoid duplicates
    await client.query('DELETE FROM category_attributes;');

    // Food categories: 1 (Fruits/Veg), 2 (Dairy/Eggs), 3 (Pantry), 4 (Snacks), 5 (Beverages), 8 (Baby Food), 9 (Meat), 10 (Spices/Oils)
    const foodCatIds = [1, 2, 3, 4, 5, 8, 9, 10];
    const nonFoodCatIds = [6, 7]; // Personal Care, Household & Cleaning

    const foodAttrs = [
      { code: 'dietary_type', group: 'FSSAI & Regulatory', required: true, filter: true, order: 1 },
      { code: 'fssai_license_number', group: 'FSSAI & Regulatory', required: true, filter: false, order: 2 },
      { code: 'country_of_origin', group: 'Compliance & Origin', required: true, filter: true, order: 3 },
      { code: 'shelf_life_days', group: 'Storage & Shelf Life', required: false, filter: false, order: 4 },
      { code: 'storage_temperature', group: 'Storage & Shelf Life', required: false, filter: false, order: 5 },
      { code: 'packaging_type', group: 'Packaging & Measurements', required: false, filter: false, order: 6 },
      { code: 'organic_certified', group: 'Compliance & Origin', required: false, filter: true, order: 7 }
    ];

    const nonFoodAttrs = [
      { code: 'country_of_origin', group: 'Compliance & Origin', required: true, filter: true, order: 1 },
      { code: 'shelf_life_days', group: 'Storage & Shelf Life', required: false, filter: false, order: 2 },
      { code: 'packaging_type', group: 'Packaging & Measurements', required: false, filter: false, order: 3 }
    ];

    let mappingCount = 0;
    for (const catId of foodCatIds) {
      for (const fa of foodAttrs) {
        await client.query(`
          INSERT INTO category_attributes (category_id, attribute_id, section_group, is_required, is_filter_facet, display_order)
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [catId, attributeMap[fa.code], fa.group, fa.required, fa.filter, fa.order]);
        mappingCount++;
      }
    }

    for (const catId of nonFoodCatIds) {
      for (const nfa of nonFoodAttrs) {
        await client.query(`
          INSERT INTO category_attributes (category_id, attribute_id, section_group, is_required, is_filter_facet, display_order)
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [catId, attributeMap[nfa.code], nfa.group, nfa.required, nfa.filter, nfa.order]);
        mappingCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully mapped ${mappingCount} category attributes across all departments!`);
    console.log('Seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed! Rolled back transaction.', err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
