import pool from '../Config/database.js';

/**
 * Resolves or maps a canonical store UUID from a shopId (integer or UUID).
 */
async function resolveStoreId(client, shopId) {
  if (!shopId) return null;

  // 1. If shopId is already a UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof shopId === 'string' && uuidRegex.test(shopId)) {
    const storeRes = await client.query('SELECT id FROM stores WHERE id = $1', [shopId]);
    if (storeRes.rows.length > 0) return storeRes.rows[0].id;
  }

  // 2. If shopId is an integer, look up in shopdetail
  let shop = null;
  try {
    const shopRes = await client.query('SELECT * FROM shopdetail WHERE id = $1', [shopId]);
    if (shopRes.rows.length > 0) {
      shop = shopRes.rows[0];
    }
  } catch (err) {
    console.warn('[B2B Inventory Sync] Could not query shopdetail:', err.message);
  }

  if (shop) {
    const phone = shop.mobile_number || shop.mobile_no;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
    const email = shop.email_id;
    const shopName = shop.shop_name;

    const storeRes = await client.query(`
      SELECT id FROM stores 
      WHERE ($1::text IS NOT NULL AND (phone LIKE '%' || $1 OR phone LIKE '%' || $2))
         OR ($3::text IS NOT NULL AND email ILIKE $3)
         OR ($4::text IS NOT NULL AND store_name ILIKE $4)
      LIMIT 1
    `, [cleanPhone, phone, email, shopName]);

    if (storeRes.rows.length > 0) {
      return storeRes.rows[0].id;
    }
  }

  // 3. Fallback: Find the default or first store in stores table
  const fallbackStore = await client.query('SELECT id FROM stores ORDER BY created_at ASC LIMIT 1');
  if (fallbackStore.rows.length > 0) {
    return fallbackStore.rows[0].id;
  }

  return null;
}

/**
 * Resolves a category ID from category/subcategory names.
 */
async function resolveCategoryId(client, categoryName, subcategoryName) {
  if (subcategoryName) {
    const subRes = await client.query('SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1', [subcategoryName]);
    if (subRes.rows.length > 0) return subRes.rows[0].id;
  }
  if (categoryName) {
    const catRes = await client.query('SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1', [categoryName]);
    if (catRes.rows.length > 0) return catRes.rows[0].id;
  }
  // Default to General category (1)
  return 1;
}

/**
 * Core canonical synchronization: syncs an array of delivered items into seller_listings.
 */
async function syncDeliveredItemsToStore(client, storeId, items) {
  let updatedCount = 0;
  let insertedCount = 0;

  for (const item of items) {
    const mpId = item.fk_product || item.product_id;
    const quantity = parseInt(item.quantity, 10) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const title = item.product_name || 'B2B Restock Item';
    const mrp = parseFloat(item.mrp) || Math.round(unitPrice * 1.25);
    const sellPrice = parseFloat(item.sell_price) || Math.round(unitPrice * 1.15);
    const sku = item.sku || `B2B-SKU-${mpId || Date.now()}`;
    const unit = item.unit || 'pcs';

    if (quantity <= 0) continue;

    const categoryId = await resolveCategoryId(client, item.category, item.sub_category);

    // Check if listing already exists in store
    const existingRes = await client.query(`
      SELECT id, stock_qty FROM seller_listings 
      WHERE store_id = $1 AND (
        (manufacturer_product_id IS NOT NULL AND manufacturer_product_id = $2)
        OR title ILIKE $3
      )
      LIMIT 1
    `, [storeId, mpId, title]);

    if (existingRes.rows.length > 0) {
      const existingListing = existingRes.rows[0];
      await client.query(`
        UPDATE seller_listings 
        SET stock_qty = COALESCE(stock_qty, 0) + $1,
            wholesale_price = $2,
            is_active = true,
            updated_at = NOW()
        WHERE id = $3
      `, [quantity, unitPrice, existingListing.id]);
      updatedCount++;
    } else {
      await client.query(`
        INSERT INTO seller_listings (
          id,
          store_id,
          title,
          sku,
          category_id,
          mrp,
          sell_price,
          wholesale_price,
          stock_qty,
          manufacturer_product_id,
          unit,
          is_active,
          approval_status,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 'APPROVED', NOW(), NOW()
        )
      `, [storeId, title, sku, categoryId, mrp, sellPrice, unitPrice, quantity, mpId, unit]);
      insertedCount++;
    }
  }

  return { updatedCount, insertedCount };
}

/**
 * Syncs B2B shop purchase orders (distributor -> retail shop)
 */
export const syncB2BOrderToShopInventory = async (orderId, shopId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const storeId = await resolveStoreId(client, shopId);
    if (!storeId) {
      console.warn(`[B2B Inventory Sync] No matching store found for shopId ${shopId}. Skipping sync.`);
      await client.query('COMMIT');
      return;
    }

    const orderItemsResult = await client.query(`
      SELECT od.fk_product, od.quantity, od.unit_price, mp.category, mp.sub_category, mp.product_name, mp.description, mp.product_image, mp.mrp, mp.sku, mp.unit
      FROM manage_b2b_purchase_order_detail od
      LEFT JOIN manage_manufacturer_products mp ON od.fk_product = mp.id
      WHERE od.fk_purchase_order = $1
    `, [orderId]);

    const { updatedCount, insertedCount } = await syncDeliveredItemsToStore(client, storeId, orderItemsResult.rows);

    await client.query('COMMIT');
    console.log(`✅ [B2B Inventory Sync] Order ${orderId} synced to store ${storeId}: ${updatedCount} updated, ${insertedCount} inserted.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to sync B2B order to shop inventory:', error);
  } finally {
    client.release();
  }
};

/**
 * Syncs manufacturer orders (manufacturer -> distributor/shop)
 */
export const syncManufacturerOrderToShopInventory = async (orderId, shopId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const storeId = await resolveStoreId(client, shopId);
    if (!storeId) {
      console.warn(`[B2B Inventory Sync] No matching store found for shopId ${shopId}. Skipping sync.`);
      await client.query('COMMIT');
      return;
    }

    const orderItemsResult = await client.query(`
      SELECT od.product_id as fk_product, od.quantity, od.unit_price, mp.category, mp.sub_category, mp.product_name, mp.description, mp.product_image, mp.mrp, mp.sku, mp.unit
      FROM manage_b_to_b_order_items od
      LEFT JOIN manage_manufacturer_products mp ON od.product_id = mp.id
      WHERE od.order_id = $1
    `, [orderId]);

    const { updatedCount, insertedCount } = await syncDeliveredItemsToStore(client, storeId, orderItemsResult.rows);

    await client.query('COMMIT');
    console.log(`✅ [B2B Inventory Sync] Manufacturer order ${orderId} synced to store ${storeId}: ${updatedCount} updated, ${insertedCount} inserted.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to sync manufacturer order to shop inventory:', error);
  } finally {
    client.release();
  }
};
