import pool from '../Config/database.js';

// Get distributor's inventory / catalog setup
export const getInventory = async (req, res) => {
  const distributorId = req.user.userId;

  try {
    // Get distributor email
    const distEmailRes = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );
    if (distEmailRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Distributor not found' });
    }
    const distEmail = distEmailRes.rows[0].email;

    // Get all products from connected manufacturers, with distributor's inventory settings if they exist
    const query = `
      SELECT p.id as product_id,
             p.product_name,
             p.product_image,
             p.category,
             p.price as manufacturer_price,
             p.moq as manufacturer_moq,
             m.company_name as manufacturer_name,
             m.id as manufacturer_id,
             dp.id as inventory_id,
             COALESCE(dp.price, p.price) as price,
             COALESCE(dp.stock_quantity, 0) as stock_quantity,
             COALESCE(dp.is_published, false) as is_published
      FROM manage_manufacturer_products p
      JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
      JOIN manage_b_to_b_request_access r ON m.id = r.manufacturer_id
      LEFT JOIN distributor_products dp ON p.id = dp.product_id AND dp.distributor_id = $1
      WHERE r.email_distributer = $2
        AND r.manufacture_request = 1
        AND r.distributer_request = 1
        AND p.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND r.deleted_at IS NULL
      ORDER BY p.product_name
    `;

    const result = await pool.query(query, [distributorId, distEmail]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get distributor inventory error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

// Publish/unpublish or update pricing/stock in distributor catalog
export const publishProduct = async (req, res) => {
  const distributorId = req.user.userId;
  const { product_id, price, stock_quantity, is_published } = req.body;

  if (!product_id) {
    return res.status(400).json({ success: false, message: 'Product ID is required' });
  }

  try {
    // Select existing entry
    const checkQuery = `
      SELECT id FROM distributor_products
      WHERE distributor_id = $1 AND product_id = $2
    `;
    const checkRes = await pool.query(checkQuery, [distributorId, product_id]);

    let result;
    if (checkRes.rows.length > 0) {
      const updateQuery = `
        UPDATE distributor_products
        SET price = $1, stock_quantity = $2, is_published = $3, updated_at = CURRENT_TIMESTAMP
        WHERE distributor_id = $4 AND product_id = $5
        RETURNING *
      `;
      result = await pool.query(updateQuery, [price, stock_quantity || 0, is_published || false, distributorId, product_id]);
    } else {
      const insertQuery = `
        INSERT INTO distributor_products (distributor_id, product_id, price, stock_quantity, is_published)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [distributorId, product_id, price, stock_quantity || 0, is_published || false]);
    }

    res.status(200).json({
      success: true,
      message: 'Product catalog details updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Publish product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update catalog details' });
  }
};
