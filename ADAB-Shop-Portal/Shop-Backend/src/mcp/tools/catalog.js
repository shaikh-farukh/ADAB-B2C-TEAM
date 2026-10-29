const ListingRepository = require('../../repositories/listing');
const pool = require('../../../db');

/**
 * 1. Tool: adab_check_low_stock
 * Tier: TIER_1_READ
 */
const checkLowStockTool = {
  name: 'adab_check_low_stock',
  description: 'Inspect catalog inventory to find items running low on stock (stock <= threshold).',
  tier: 'TIER_1_READ',
  parameters: {
    type: 'OBJECT',
    properties: {
      threshold: {
        type: 'INTEGER',
        description: 'Inventory threshold below which an item is considered low stock (default: 5).'
      },
      limit: {
        type: 'INTEGER',
        description: 'Maximum number of items to return (default: 10).'
      }
    }
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const threshold = args.threshold !== undefined && Number.isFinite(Number(args.threshold)) ? Number(args.threshold) : 5;
    const limit = args.limit ? Math.min(Math.max(1, parseInt(args.limit, 10)), 50) : 10;

    const query = `
      SELECT sl.id, sl.title, sl.sku, sl.barcode, sl.brand_tag, sl.product_type, sl.unit,
             sl.mrp, sl.sell_price, COALESCE(sl.stock_qty, 0) as stock_qty, sl.is_active,
             c.name as category_name
      FROM seller_listings sl
      LEFT JOIN categories c ON sl.category_id = c.id
      WHERE sl.store_id = $1::uuid
        AND COALESCE(sl.stock_qty, 0) <= $2::int
        AND sl.is_active = true
      ORDER BY COALESCE(sl.stock_qty, 0) ASC, sl.title ASC
      LIMIT $3::int
    `;
    const res = await pool.query(query, [storeId, threshold, limit]);

    return {
      storeId,
      threshold,
      lowStockCount: res.rows.length,
      items: res.rows.map(r => ({
        id: r.id,
        title: r.title,
        sku: r.sku,
        brand: r.brand_tag,
        unit: r.unit || 'pcs',
        stockQty: Number(r.stock_qty),
        sellPrice: Number(r.sell_price),
        mrp: Number(r.mrp),
        category: r.category_name || 'General'
      }))
    };
  }
};

/**
 * 2. Tool: adab_update_stock_qty
 * Tier: TIER_2_MUTATIVE
 */
const updateStockQtyTool = {
  name: 'adab_update_stock_qty',
  description: 'Update the in-stock inventory quantity for a specific product listing.',
  tier: 'TIER_2_MUTATIVE',
  parameters: {
    type: 'OBJECT',
    properties: {
      listingId: {
        type: 'STRING',
        description: 'The UUID of the product listing (if known).'
      },
      searchTerm: {
        type: 'STRING',
        description: 'Product name or search keyword to match (e.g. "Basmati Rice", "Sugar").'
      },
      quantity: {
        type: 'INTEGER',
        description: 'The new stock quantity (must be >= 0).'
      }
    },
    required: ['quantity']
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const { listingId, searchTerm, quantity } = args;

    if (quantity === undefined || quantity === null || Number(quantity) < 0) {
      throw new Error('ValidationError: Quantity must be a non-negative integer.');
    }
    const targetQty = Math.round(Number(quantity));

    let matchedListing = null;

    if (listingId) {
      const res = await pool.query(
        'SELECT id, title, stock_qty, sell_price, mrp FROM seller_listings WHERE id = $1 AND store_id = $2::uuid',
        [listingId, storeId]
      );
      if (res.rows.length > 0) {
        matchedListing = res.rows[0];
      }
    }

    if (!matchedListing && searchTerm) {
      const res = await pool.query(
        `SELECT id, title, stock_qty, sell_price, mrp 
         FROM seller_listings 
         WHERE store_id = $1::uuid AND (title ILIKE $2 OR barcode ILIKE $2 OR sku ILIKE $2)
         ORDER BY (CASE WHEN lower(title) = lower($3) THEN 1 ELSE 2 END), title ASC
         LIMIT 5`,
        [storeId, `%${searchTerm}%`, searchTerm]
      );
      if (res.rows.length === 1) {
        matchedListing = res.rows[0];
      } else if (res.rows.length > 1) {
        return {
          success: false,
          disambiguationRequired: true,
          message: `Multiple products matched '${searchTerm}'. Please specify the exact product ID or name.`,
          matches: res.rows.map(r => ({ id: r.id, title: r.title, currentStock: r.stock_qty }))
        };
      }
    }

    if (!matchedListing) {
      throw new Error(`ProductNotFound: No product found matching '${listingId || searchTerm}' in your store catalog.`);
    }

    const prevStock = Number(matchedListing.stock_qty || 0);

    // Update in DB
    await pool.query(
      'UPDATE seller_listings SET stock_qty = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3::uuid',
      [targetQty, matchedListing.id, storeId]
    );

    // Also update inventory table if it exists for this listing
    await pool.query(
      'UPDATE inventory SET stock_quantity = $1, available_quantity = $1, updated_at = NOW() WHERE listing_id = $2',
      [targetQty, matchedListing.id]
    ).catch(() => {});

    return {
      success: true,
      listingId: matchedListing.id,
      title: matchedListing.title,
      previousStock: prevStock,
      newStock: targetQty,
      message: `Updated stock for '${matchedListing.title}' from ${prevStock} to ${targetQty} units.`
    };
  }
};

/**
 * 3. Tool: adab_modify_pricing
 * Tier: TIER_2_MUTATIVE
 */
const modifyPricingTool = {
  name: 'adab_modify_pricing',
  description: 'Adjust the selling price (sell_price) or MRP of an existing product listing.',
  tier: 'TIER_2_MUTATIVE',
  parameters: {
    type: 'OBJECT',
    properties: {
      listingId: {
        type: 'STRING',
        description: 'The UUID of the product listing.'
      },
      searchTerm: {
        type: 'STRING',
        description: 'Product name or search keyword to match if listingId is not provided.'
      },
      sellPrice: {
        type: 'NUMBER',
        description: 'The new selling price in INR.'
      },
      mrp: {
        type: 'NUMBER',
        description: 'The new MRP in INR (must be >= sellPrice).'
      }
    }
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const { listingId, searchTerm, sellPrice, mrp } = args;

    if (sellPrice === undefined && mrp === undefined) {
      throw new Error('ValidationError: Must provide either sellPrice or mrp to modify pricing.');
    }

    let matchedListing = null;
    if (listingId) {
      const res = await pool.query(
        'SELECT id, title, sell_price, mrp FROM seller_listings WHERE id = $1 AND store_id = $2::uuid',
        [listingId, storeId]
      );
      if (res.rows.length > 0) matchedListing = res.rows[0];
    }

    if (!matchedListing && searchTerm) {
      const res = await pool.query(
        `SELECT id, title, sell_price, mrp 
         FROM seller_listings 
         WHERE store_id = $1::uuid AND (title ILIKE $2 OR barcode ILIKE $2 OR sku ILIKE $2)
         LIMIT 5`,
        [storeId, `%${searchTerm}%`]
      );
      if (res.rows.length === 1) matchedListing = res.rows[0];
      else if (res.rows.length > 1) {
        return {
          success: false,
          disambiguationRequired: true,
          message: `Multiple products matched '${searchTerm}'. Please specify the exact product.`,
          matches: res.rows.map(r => ({ id: r.id, title: r.title, currentPrice: r.sell_price, mrp: r.mrp }))
        };
      }
    }

    if (!matchedListing) {
      throw new Error(`ProductNotFound: No product found matching '${listingId || searchTerm}'.`);
    }

    const currentSell = Number(matchedListing.sell_price);
    const currentMrp = Number(matchedListing.mrp);

    const newSell = sellPrice !== undefined ? Number(sellPrice) : currentSell;
    const newMrp = mrp !== undefined ? Number(mrp) : currentMrp;

    if (newSell < 0 || newMrp < 0) {
      throw new Error('ValidationError: Prices cannot be negative.');
    }
    if (newSell > newMrp) {
      throw new Error(`ValidationError: Selling price (₹${newSell}) cannot exceed MRP (₹${newMrp}).`);
    }

    await pool.query(
      'UPDATE seller_listings SET sell_price = $1, mrp = $2, updated_at = NOW() WHERE id = $3 AND store_id = $4::uuid',
      [newSell, newMrp, matchedListing.id, storeId]
    );

    return {
      success: true,
      listingId: matchedListing.id,
      title: matchedListing.title,
      previousSellPrice: currentSell,
      newSellPrice: newSell,
      previousMrp: currentMrp,
      newMrp: newMrp,
      message: `Updated pricing for '${matchedListing.title}': ₹${newSell} (MRP: ₹${newMrp}).`
    };
  }
};

/**
 * 4. Tool: adab_toggle_listing_status
 * Tier: TIER_2_MUTATIVE
 */
const toggleListingStatusTool = {
  name: 'adab_toggle_listing_status',
  description: 'Activate or pause/deactivate a product listing in the store.',
  tier: 'TIER_2_MUTATIVE',
  parameters: {
    type: 'OBJECT',
    properties: {
      listingId: {
        type: 'STRING',
        description: 'The UUID of the product listing.'
      },
      searchTerm: {
        type: 'STRING',
        description: 'Product name or search keyword.'
      },
      isActive: {
        type: 'BOOLEAN',
        description: 'Set to true to make listing active, or false to pause/deactivate it.'
      }
    },
    required: ['isActive']
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const { listingId, searchTerm, isActive } = args;

    if (isActive === undefined || isActive === null) {
      throw new Error('ValidationError: "isActive" boolean is required.');
    }
    const targetState = Boolean(isActive);

    let matchedListing = null;
    if (listingId) {
      const res = await pool.query(
        'SELECT id, title, is_active FROM seller_listings WHERE id = $1 AND store_id = $2::uuid',
        [listingId, storeId]
      );
      if (res.rows.length > 0) matchedListing = res.rows[0];
    }

    if (!matchedListing && searchTerm) {
      const res = await pool.query(
        'SELECT id, title, is_active FROM seller_listings WHERE store_id = $1::uuid AND title ILIKE $2 LIMIT 5',
        [storeId, `%${searchTerm}%`]
      );
      if (res.rows.length === 1) matchedListing = res.rows[0];
    }

    if (!matchedListing) {
      throw new Error(`ProductNotFound: Listing '${listingId || searchTerm}' not found in store.`);
    }

    await pool.query(
      'UPDATE seller_listings SET is_active = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3::uuid',
      [targetState, matchedListing.id, storeId]
    );

    return {
      success: true,
      listingId: matchedListing.id,
      title: matchedListing.title,
      isActive: targetState,
      message: `Product '${matchedListing.title}' is now ${targetState ? 'ACTIVE (live for sales)' : 'PAUSED (hidden from buyers)'}.`
    };
  }
};

function registerCatalogTools(registry) {
  registry.registerTool(checkLowStockTool);
  registry.registerTool(updateStockQtyTool);
  registry.registerTool(modifyPricingTool);
  registry.registerTool(toggleListingStatusTool);
}

module.exports = {
  registerCatalogTools,
  checkLowStockTool,
  updateStockQtyTool,
  modifyPricingTool,
  toggleListingStatusTool
};
