import pool from '../Config/database.js';
import { syncB2BOrderToShopInventory } from './syncInventoryHelper.js';

// Get all shop orders received by this distributor
export const getShopOrders = async (req, res) => {
  const distributorId = req.user.userId;
  const { status } = req.query;

  try {
    let query = `
      SELECT o.id,
             o.po_number as order_number,
             o.created_at,
             o.status,
             o.total_amount,
             o.item_count as items_count,
             o.fk_shop_detail as shop_id,
             s.shop_name as shop_name,
             s.first_name as shop_owner_name
      FROM manage_b2b_purchase_order o
      JOIN shopdetail s ON o.fk_shop_detail = s.id
      WHERE o.fk_supplier_detail = $1
    `;
    const queryParams = [distributorId];
    let paramIdx = 2;

    if (status) {
      query += ` AND o.status = ${paramIdx}`;
      queryParams.push(status.toLowerCase());
      paramIdx++;
    }

    query += `
      ORDER BY o.created_at DESC
    `;

    const result = await pool.query(query, queryParams);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get distributor shop orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shop orders' });
  }
};

// Get detail of a specific shop order
export const getShopOrderDetail = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  console.log(`[DEBUG] getShopOrderDetail called - orderId: ${id}, distributorId: ${distributorId}`);

  try {
    const query = `
      SELECT o.id,
             o.po_number as order_number,
             o.created_at,
             o.status,
             o.total_amount,
             o.fk_shop_detail as shop_id,
             s.shop_name as shop_name,
             s.first_name as shop_owner_name,
             s.email_id as shop_email,
             s.mobile_no as shop_mobile,
             s.shop_address as shop_address
      FROM manage_b2b_purchase_order o
      JOIN shopdetail s ON o.fk_shop_detail = s.id
      WHERE o.id = $1 AND o.fk_supplier_detail = $2
    `;
    const result = await pool.query(query, [id, distributorId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = result.rows[0];

    const itemsQuery = `
      SELECT oi.id,
             oi.fk_product as product_id,
             oi.product_name,
             p.product_image,
             oi.quantity,
             oi.unit_price,
             p.category
      FROM manage_b2b_purchase_order_detail oi
      LEFT JOIN manage_manufacturer_products p ON oi.fk_product = p.id
      WHERE oi.fk_purchase_order = $1
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    const historyQuery = `
      SELECT h.status,
             h.notes,
             h.created_at,
             u.owner_name as updated_by_name
      FROM manage_b_to_b_order_status_history h
      LEFT JOIN manage_b_to_b_userdetail u ON h.updated_by = u.id
      WHERE h.order_id = $1
      ORDER BY h.created_at DESC
    `;
    const historyResult = await pool.query(historyQuery, [id]);

    res.status(200).json({
      success: true,
      data: {
        order,
        items: itemsResult.rows,
        history: historyResult.rows
      }
    });
  } catch (error) {
    console.error('Get distributor shop order detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
};

// Accept Order (PENDING -> ACCEPTED)
export const acceptShopOrder = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch and check order status
    const orderCheck = await client.query(
      `SELECT status FROM manage_b2b_purchase_order
       WHERE id = $1 AND fk_supplier_detail = $2
       FOR UPDATE`,
      [id, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status;
    if (currentStatus !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only pending orders can be accepted. Current status: ${currentStatus}`
      });
    }

    const result = await client.query(
      `UPDATE manage_b2b_purchase_order
       SET status = 'accepted',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO manage_b_to_b_order_status_history (order_id, status, notes, changed_by)
       VALUES ($1, 'accepted', $2, $3)`,
      [id, notes || 'Order accepted by distributor', distributorId]
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Order accepted successfully', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept shop order error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept order' });
  } finally {
    client.release();
  }
};

// Reject Order (PENDING -> CANCELLED)
export const rejectShopOrder = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch and check order status
    const orderCheck = await client.query(
      `SELECT status, total_amount, fk_shop_detail as shop_id FROM manage_b2b_purchase_order
       WHERE id = $1 AND fk_supplier_detail = $2
       FOR UPDATE`,
      [id, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const { status: currentStatus, total_amount: totalAmount, shop_id: shopId } = orderCheck.rows[0];
    if (currentStatus !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only pending orders can be rejected/cancelled. Current status: ${currentStatus}`
      });
    }

    // Update order status to cancelled
    const result = await client.query(
      `UPDATE manage_b2b_purchase_order
       SET status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );


    // Release relationship credit
    await client.query(
      `UPDATE relationship_credits
       SET outstanding_amount = GREATEST(outstanding_amount - $1, 0), updated_at = CURRENT_TIMESTAMP
       WHERE creditor_id = $2 AND debtor_id = $3 AND debtor_type = 'shop'`,
      [parseFloat(totalAmount), distributorId, shopId]
    );

    // Restore distributor stock quantity
    const orderItems = await client.query(
      `SELECT fk_product as product_id, quantity FROM manage_b2b_purchase_order_detail WHERE fk_purchase_order = $1`,
      [id]
    );

    for (const item of orderItems.rows) {
      await client.query(
        `UPDATE distributor_products
         SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP
         WHERE distributor_id = $2 AND product_id = $3`,
        [item.quantity, distributorId, item.product_id]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Order rejected and cancelled successfully', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject shop order error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject order' });
  } finally {
    client.release();
  }
};

// Start Processing Order (ACCEPTED -> PROCESSING)
export const startProcessingShopOrder = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status FROM manage_b2b_purchase_order
       WHERE id = $1 AND fk_supplier_detail = $2
       FOR UPDATE`,
      [id, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status;
    if (currentStatus !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only accepted orders can enter processing state. Current status: ${currentStatus}`
      });
    }

    const result = await client.query(
      `UPDATE manage_b2b_purchase_order
       SET status = 'processing',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Order processing started', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Start processing shop order error:', error);
    res.status(500).json({ success: false, message: 'Failed to start order processing' });
  } finally {
    client.release();
  }
};

// Mark Packed (PROCESSING -> PACKED)
export const markPackedShopOrder = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status FROM manage_b2b_purchase_order
       WHERE id = $1 AND fk_supplier_detail = $2
       FOR UPDATE`,
      [id, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status;
    if (currentStatus !== 'processing') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only processing orders can be marked as packed. Current status: ${currentStatus}`
      });
    }

    const result = await client.query(
      `UPDATE manage_b2b_purchase_order
       SET status = 'packed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Order marked as packed', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mark packed shop order error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark order as packed' });
  } finally {
    client.release();
  }
};

// Dispatch Order (PACKED -> DISPATCHED)
export const dispatchShopOrder = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  const { transporter_name, vehicle_number, tracking_number, notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status FROM manage_b2b_purchase_order
       WHERE id = $1 AND fk_supplier_detail = $2
       FOR UPDATE`,
      [id, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status;
    if (currentStatus !== 'packed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only packed orders can be dispatched. Current status: ${currentStatus}`
      });
    }

    const result = await client.query(
      `UPDATE manage_b2b_purchase_order
       SET status = 'dispatched',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Order dispatched successfully', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Dispatch shop order error:', error);
    res.status(500).json({ success: false, message: 'Failed to dispatch order' });
  } finally {
    client.release();
  }
};

// Mark Delivered (DISPATCHED -> DELIVERED)
export const markDeliveredShopOrder = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  const { notes } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      `SELECT status FROM manage_b2b_purchase_order
       WHERE id = $1 AND fk_supplier_detail = $2
       FOR UPDATE`,
      [id, distributorId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status;
    if (currentStatus !== 'dispatched') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Only dispatched orders can be marked as delivered. Current status: ${currentStatus}`
      });
    }

    const result = await client.query(
      `UPDATE manage_b2b_purchase_order
       SET status = 'delivered',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Sync products to the Shop's inventory
    const shopId = result.rows[0].fk_shop_detail;
    if (shopId) {
      await syncB2BOrderToShopInventory(id, shopId);
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Order marked as delivered', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Mark delivered shop order error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark order as delivered' });
  } finally {
    client.release();
  }
};
