const pool = require('../../db');

class ListingRepository {
  async createListing(storeId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const effectiveUnit = data.unit || (
        data.product_type === 'LOOSE_WEIGHT' ? 'kg' :
        data.product_type === 'PACKED_ITEM' ? 'pack' : 'pcs'
      );
      const isRefundable = data.is_refundable !== undefined ? Boolean(data.is_refundable) : true;
      const refundPercentage = data.refund_percentage !== undefined && data.refund_percentage !== null ? Number(data.refund_percentage) : 100.00;
      const returnWindowDays = data.return_window_days !== undefined && data.return_window_days !== null ? parseInt(data.return_window_days, 10) : 7;
      
      const hasVariants = Boolean(data.has_variants && Array.isArray(data.variants) && data.variants.length > 0);

      // If product has variations, calculate roll-up aggregate stock
      let calculatedStock = parseFloat(data.stock_qty || 0);
      if (hasVariants) {
        calculatedStock = data.variants.reduce((sum, v) => sum + (parseFloat(v.stock_qty) || 0), 0);
      }

      const attributesJson = data.attributes ? JSON.stringify(data.attributes) : '{}';

      const insertQuery = `
        INSERT INTO seller_listings (
          store_id, title, sku, barcode, brand_tag, product_type, unit, 
          mrp, sell_price, min_order_qty, allowed_buyers, approval_status, is_active, stock_qty, category_id,
          wholesale_price, tiered_pricing, sample_available, is_refundable, refund_percentage, return_window_days,
          attributes, has_variants, master_catalog_id, manufacturer_product_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) RETURNING *;
      `;

      const values = [
        storeId,
        data.title,
        data.sku || null,
        data.barcode || null,
        data.brand_tag || null,
        data.product_type || 'PACKED_ITEM',
        effectiveUnit,
        data.mrp,
        data.sell_price,
        data.min_order_qty !== undefined ? parseFloat(data.min_order_qty) : 1,
        data.allowed_buyers || 'ALL',
        data.approval_status || 'DRAFT',
        data.is_active !== undefined ? Boolean(data.is_active) : true,
        calculatedStock,
        data.category_id ? parseInt(data.category_id, 10) : null,
        data.wholesale_price !== undefined && data.wholesale_price !== null ? data.wholesale_price : null,
        data.tiered_pricing ? (typeof data.tiered_pricing === 'string' ? data.tiered_pricing : JSON.stringify(data.tiered_pricing)) : '[]',
        data.sample_available !== undefined ? Boolean(data.sample_available) : true,
        isRefundable,
        refundPercentage,
        returnWindowDays,
        attributesJson,
        hasVariants,
        data.master_catalog_id || null,
        data.manufacturer_product_id || null
      ];

      const result = await client.query(insertQuery, values);
      const listing = result.rows[0];

      // Insert primary image if provided
      if (data.image_url) {
        await client.query(
          `INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, true)`,
          [listing.id, data.image_url]
        );
      }

      // Insert child variants if multi-SKU product
      const insertedVariants = [];
      if (hasVariants) {
        for (const variant of data.variants) {
          const varMrp = variant.mrp !== undefined ? parseFloat(variant.mrp) : parseFloat(listing.mrp);
          const varSellPrice = variant.sell_price !== undefined ? parseFloat(variant.sell_price) : parseFloat(listing.sell_price);
          if (varSellPrice > varMrp) {
            throw new Error(`Variant "${variant.sku}" sell price (₹${varSellPrice}) cannot exceed Printed MRP (₹${varMrp})`);
          }
          const varSku = variant.sku || `${listing.sku || 'SKU'}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          const varAttributes = variant.variant_attributes ? JSON.stringify(variant.variant_attributes) : '{}';

          const varRes = await client.query(
            `INSERT INTO listing_variants (
               listing_id, sku, barcode, mrp, sell_price, stock_qty, variant_attributes, image_url, is_active
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`,
            [
              listing.id,
              varSku,
              variant.barcode || null,
              variant.mrp !== undefined ? parseFloat(variant.mrp) : listing.mrp,
              variant.sell_price !== undefined ? parseFloat(variant.sell_price) : listing.sell_price,
              variant.stock_qty !== undefined ? parseFloat(variant.stock_qty) : 0,
              varAttributes,
              variant.image_url || null,
              variant.is_active !== undefined ? Boolean(variant.is_active) : true
            ]
          );
          insertedVariants.push(varRes.rows[0]);
        }
      }

      await client.query('COMMIT');
      return { ...listing, variants: insertedVariants };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getCategories() {
    const result = await pool.query(
      'SELECT id, name, slug, parent_id, level, materialized_path, is_leaf FROM categories WHERE is_active = true OR is_active IS NULL ORDER BY display_order ASC, name ASC'
    );
    return result.rows;
  }

  async getListings(storeId, filters = {}) {
    const conditions = ['sl.store_id = $1'];
    const values = [storeId];
    
    if (filters.status && filters.status !== 'all') {
      values.push(filters.status);
      conditions.push(`sl.approval_status = $${values.length}`);
    }
    if (filters.type && filters.type !== 'all' && filters.type !== 'ALL') {
      values.push(filters.type);
      conditions.push(`sl.product_type = $${values.length}`);
    }
    if (filters.stock === 'in_stock') {
      conditions.push(`COALESCE(sl.stock_qty, 0) > 0`);
    } else if (filters.stock === 'out_of_stock') {
      conditions.push(`COALESCE(sl.stock_qty, 0) <= 0`);
    }
    if (filters.buyer && filters.buyer !== 'all' && filters.buyer !== 'ALL') {
      if (filters.buyer === 'CUSTOMERS') {
        values.push('CUSTOMERS_ONLY');
        conditions.push(`sl.allowed_buyers = $${values.length}`);
      } else if (filters.buyer === 'STORES') {
        values.push('STORES_ONLY');
        conditions.push(`sl.allowed_buyers = $${values.length}`);
      } else if (filters.buyer === 'BOTH') {
        values.push('ALL');
        conditions.push(`sl.allowed_buyers = $${values.length}`);
      }
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(sl.title ILIKE $${values.length} OR sl.barcode ILIKE $${values.length} OR sl.sku ILIKE $${values.length})`);
    }

    const whereClause = conditions.join(' AND ');

    let query = `
      SELECT 
        sl.*, 
        pi.image_url, 
        c.name as category_name,
        (SELECT COUNT(*) FROM listing_variants lv WHERE lv.listing_id = sl.id AND lv.is_active = true) as variant_count,
        (
          SELECT json_agg(
            json_build_object(
              'id', lv.id,
              'sku', lv.sku,
              'barcode', lv.barcode,
              'mrp', lv.mrp,
              'sell_price', lv.sell_price,
              'stock_qty', lv.stock_qty,
              'variant_attributes', lv.variant_attributes,
              'image_url', lv.image_url,
              'is_active', lv.is_active
            )
          )
          FROM listing_variants lv
          WHERE lv.listing_id = sl.id AND lv.is_active = true
        ) as variants
      FROM seller_listings sl
      LEFT JOIN product_images pi ON sl.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN categories c ON sl.category_id = c.id
      WHERE ${whereClause}
      ORDER BY sl.created_at DESC
    `;

    let dataValues = [...values];
    
    if (filters.limit) {
      dataValues.push(filters.limit);
      query += ` LIMIT $${dataValues.length}`;
    }
    if (filters.offset) {
      dataValues.push(filters.offset);
      query += ` OFFSET $${dataValues.length}`;
    }

    const result = await pool.query(query, dataValues);
    
    const countQuery = `
      SELECT COUNT(*) 
      FROM seller_listings sl 
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10)
    };
  }

  async getListingById(storeId, id) {
    const result = await pool.query(
      `SELECT 
        sl.*, 
        pi.image_url, 
        c.name as category_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', lv.id,
              'sku', lv.sku,
              'barcode', lv.barcode,
              'mrp', lv.mrp,
              'sell_price', lv.sell_price,
              'stock_qty', lv.stock_qty,
              'variant_attributes', lv.variant_attributes,
              'image_url', lv.image_url,
              'is_active', lv.is_active
            )
          )
          FROM listing_variants lv
          WHERE lv.listing_id = sl.id
        ) as variants
       FROM seller_listings sl 
       LEFT JOIN product_images pi ON sl.id = pi.product_id AND pi.is_primary = true 
       LEFT JOIN categories c ON sl.category_id = c.id
       WHERE sl.id = $1 AND sl.store_id = $2`, 
      [id, storeId]
    );
    return result.rows[0];
  }

  async updateListing(storeId, id, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let idx = 1;

      // Extract variants if provided
      const variants = data.variants;
      delete data.variants;

      for (const [key, value] of Object.entries(data)) {
        if (key !== 'image_url') {
          fields.push(`${key} = $${idx}`);
          values.push(key === 'attributes' && typeof value === 'object' ? JSON.stringify(value) : value);
          idx++;
        }
      }

      let listing = null;
      if (fields.length > 0) {
        values.push(id, storeId);
        const query = `
          UPDATE seller_listings 
          SET ${fields.join(', ')}, updated_at = NOW() 
          WHERE id = $${idx} AND store_id = $${idx + 1}
          RETURNING *;
        `;
        const result = await client.query(query, values);
        listing = result.rows[0];
      } else {
        const fetchRes = await client.query('SELECT * FROM seller_listings WHERE id = $1 AND store_id = $2', [id, storeId]);
        listing = fetchRes.rows[0];
      }

      if (!listing) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update primary image if provided
      if (data.image_url) {
        const existingImg = await client.query(
          'SELECT id FROM product_images WHERE product_id = $1 AND is_primary = true LIMIT 1',
          [id]
        );
        if (existingImg.rows.length > 0) {
          await client.query(
            'UPDATE product_images SET image_url = $1, created_at = NOW() WHERE id = $2',
            [data.image_url, existingImg.rows[0].id]
          );
        } else {
          await client.query(
            'INSERT INTO product_images (product_id, image_url, is_primary) VALUES ($1, $2, true)',
            [id, data.image_url]
          );
        }
      }

      // Update child variants if provided
      if (Array.isArray(variants)) {
        // Delete old variants and re-insert new ones
        await client.query('DELETE FROM listing_variants WHERE listing_id = $1', [id]);
        
        let totalVariantStock = 0;
        for (const variant of variants) {
          const varSku = variant.sku || `${listing.sku || 'SKU'}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
          const varStock = variant.stock_qty !== undefined ? parseFloat(variant.stock_qty) : 0;
          totalVariantStock += varStock;

          await client.query(
            `INSERT INTO listing_variants (
               listing_id, sku, barcode, mrp, sell_price, stock_qty, variant_attributes, image_url, is_active
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id,
              varSku,
              variant.barcode || null,
              variant.mrp !== undefined ? parseFloat(variant.mrp) : listing.mrp,
              variant.sell_price !== undefined ? parseFloat(variant.sell_price) : listing.sell_price,
              varStock,
              variant.variant_attributes ? JSON.stringify(variant.variant_attributes) : '{}',
              variant.image_url || null,
              variant.is_active !== undefined ? Boolean(variant.is_active) : true
            ]
          );
        }

        // If listing has variants, roll up aggregate stock on parent
        if (variants.length > 0) {
          await client.query(
            'UPDATE seller_listings SET stock_qty = $1, has_variants = true WHERE id = $2',
            [totalVariantStock, id]
          );
          listing.stock_qty = totalVariantStock;
          listing.has_variants = true;
        }
      }

      await client.query('COMMIT');
      return await this.getListingById(storeId, id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteListing(storeId, id) {
    const query = `DELETE FROM seller_listings WHERE id = $1 AND store_id = $2 RETURNING *;`;
    const result = await pool.query(query, [id, storeId]);
    return result.rows[0];
  }

  async batchDeleteListings(storeId, ids) {
    if (!ids || ids.length === 0) return [];
    const query = `DELETE FROM seller_listings WHERE store_id = $1 AND id = ANY($2::uuid[]) RETURNING id;`;
    const result = await pool.query(query, [storeId, ids]);
    return result.rows;
  }

  async getApprovalHistory(id) {
    const query = `
      SELECT * FROM product_approval_history 
      WHERE listing_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [id]);
    return result.rows;
  }

  async addDocument(id, data) {
    const query = `
      INSERT INTO listing_documents (listing_id, document_type, file_url) 
      VALUES ($1, $2, $3) RETURNING *;
    `;
    const result = await pool.query(query, [id, data.document_type, data.file_url]);
    return result.rows[0];
  }
}

module.exports = new ListingRepository();
