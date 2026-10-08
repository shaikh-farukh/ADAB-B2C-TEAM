const pool = require('../../db');

class ListingRepository {
  async createListing(storeId, data) {
    const query = `
      INSERT INTO seller_listings (
        store_id, title, sku, barcode, brand_tag, product_type, unit, 
        mrp, sell_price, min_order_qty, allowed_buyers, approval_status, is_active, stock_qty
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *;
    `;
    const values = [
      storeId, data.title, data.sku, data.barcode, data.brand_tag, data.product_type, data.unit,
      data.mrp, data.sell_price, data.min_order_qty, data.allowed_buyers, data.approval_status, data.is_active, data.stock_qty || 0
    ];
    
    const result = await pool.query(query, values);
    const listing = result.rows[0];

    // Handle mock image insert if provided
    if (data.image_url) {
      const imgQuery = `
        INSERT INTO product_images (product_id, image_url, is_primary) 
        VALUES ($1, $2, true) RETURNING *;
      `;
      await pool.query(imgQuery, [listing.id, data.image_url]);
    }

    return listing;
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
      conditions.push(`COALESCE(i.available_quantity::integer, sl.stock_qty) > 0`);
    } else if (filters.stock === 'out_of_stock') {
      conditions.push(`COALESCE(i.available_quantity::integer, sl.stock_qty) <= 0`);
    }
    if (filters.buyer && filters.buyer !== 'all' && filters.buyer !== 'ALL') {
      // buyer maps to allowed_buyers
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
      SELECT sl.*, pi.image_url, COALESCE(i.available_quantity::integer, sl.stock_qty) as stock_qty
      FROM seller_listings sl
      LEFT JOIN product_images pi ON sl.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN inventory i ON sl.id = i.listing_id
      WHERE ${whereClause}
      ORDER BY sl.created_at DESC
    `;

    // Extract pagination parameters and remove them from the 'values' array for the count query
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
      LEFT JOIN inventory i ON sl.id = i.listing_id 
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
      `SELECT sl.*, pi.image_url FROM seller_listings sl 
       LEFT JOIN product_images pi ON sl.id = pi.product_id AND pi.is_primary = true 
       WHERE sl.id = $1 AND sl.store_id = $2`, 
      [id, storeId]
    );
    return result.rows[0];
  }

  async updateListing(storeId, id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'image_url') {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0 && !data.image_url) return null;

    values.push(id, storeId);
    let listing = null;
    
    if (fields.length > 0) {
      const query = `
        UPDATE seller_listings 
        SET ${fields.join(', ')}, updated_at = NOW() 
        WHERE id = $${idx} AND store_id = $${idx + 1}
        RETURNING *;
      `;
      const result = await pool.query(query, values);
      listing = result.rows[0];
    } else {
      listing = await this.getListingById(storeId, id);
    }

    if (data.image_url) {
      // Upsert image
      await pool.query(
        `INSERT INTO product_images (product_id, image_url, is_primary) 
         VALUES ($1, $2, true) 
         ON CONFLICT (product_id) WHERE is_primary = true 
         DO UPDATE SET image_url = EXCLUDED.image_url`, 
        [id, data.image_url]
      );
    }

    return listing;
  }

  async deleteListing(storeId, id) {
    const query = `DELETE FROM seller_listings WHERE id = $1 AND store_id = $2 RETURNING *;`;
    const result = await pool.query(query, [id, storeId]);
    return result.rows[0];
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

  async deleteImage(imageId) {
    const query = `DELETE FROM product_images WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, [imageId]);
    return result.rows[0];
  }

  async getListingIssues(storeId, id) {
    // Read seller_listings and inventory
    const query = `
      SELECT sl.approval_status, sl.rejection_reason, sl.mrp, sl.sell_price, sl.stock_qty,
             i.available_quantity, i.low_stock_threshold
      FROM seller_listings sl
      LEFT JOIN inventory i ON sl.id = i.listing_id
      WHERE sl.id = $1 AND sl.store_id = $2
    `;
    const result = await pool.query(query, [id, storeId]);
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    const issues = [];

    // Operational Issues (Inventory and Price) only apply to approved/published products
    if (['APPROVED', 'PUBLISHED'].includes(row.approval_status)) {
      // Inventory Issues (Cross-domain read-only from Mayank's table, fallback to sl.stock_qty)
      const effectiveStock = row.available_quantity !== null ? Number(row.available_quantity) : Number(row.stock_qty);
      if (effectiveStock <= 0) {
        issues.push({
          issue_type: 'INVENTORY',
          severity: 'high',
          message: 'Product is out of stock',
          details: { stock: effectiveStock }
        });
      } else if (row.low_stock_threshold !== null && effectiveStock <= Number(row.low_stock_threshold)) {
        issues.push({
          issue_type: 'INVENTORY',
          severity: 'medium',
          message: 'Product is running low on stock',
          details: { stock: effectiveStock, low_stock_threshold: Number(row.low_stock_threshold) }
        });
      }

      // Price Issues
      if (row.mrp !== null && row.sell_price !== null && Number(row.sell_price) > Number(row.mrp)) {
        issues.push({
          issue_type: 'PRICE',
          severity: 'high',
          message: 'Selling price cannot be greater than MRP',
          details: { mrp: Number(row.mrp), sell_price: Number(row.sell_price) }
        });
      }
    }

    // Listing / Approval Issues
    if (['REJECTED', 'CHANGES_REQUIRED'].includes(row.approval_status)) {
      issues.push({
        issue_type: 'LISTING',
        severity: 'high',
        message: `Product is ${row.approval_status.toLowerCase()}`,
        details: { approval_status: row.approval_status, rejection_reason: row.rejection_reason }
      });
    }

    return issues;
  }
}

module.exports = new ListingRepository();
