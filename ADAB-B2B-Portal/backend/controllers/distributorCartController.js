import { validationResult } from 'express-validator';
import pool from '../Config/database.js';

// Add product to cart
export const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const distributorId = req.user.userId;
    const { product_id, quantity } = req.body;

    // Check if product exists and get details
    const productQuery = await pool.query(
      'SELECT * FROM manage_manufacturer_products WHERE id = $1 AND deleted_at IS NULL',
      [product_id]
    );

    if (productQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productQuery.rows[0];

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    // Verify distributor has approved partnership with product's manufacturer
    const partnershipQuery = `
      SELECT 1 FROM manage_b_to_b_request_access
      WHERE manufacturer_id = $1
        AND email_distributer = $2
        AND manufacture_request = 1
        AND distributer_request = 1
        AND deleted_at IS NULL
    `;
    const partnershipResult = await pool.query(partnershipQuery, [product.manufacturer_id, distributorEmail]);
    if (partnershipResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. You do not have an approved partnership with this manufacturer.'
      });
    }

    // Check MOQ
    if (quantity < product.moq) {
      return res.status(400).json({
        success: false,
        message: `Minimum order quantity is ${product.moq}`
      });
    }

    // Check stock
    if (quantity > product.stock_quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock_quantity} units available in stock`
      });
    }

    // Check if item already in cart
    const existingItem = await pool.query(
      'SELECT id, quantity FROM manage_b_to_b_cart WHERE distributor_id = $1 AND product_id = $2',
      [distributorId, product_id]
    );

    if (existingItem.rows.length > 0) {
      // Update quantity
      const newQuantity = parseInt(existingItem.rows[0].quantity) + quantity;

      // Re-verify against available stock
      if (newQuantity > product.stock_quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more units. Total quantity in cart (${newQuantity}) exceeds available stock (${product.stock_quantity}).`
        });
      }

      const updateQuery = `
        UPDATE manage_b_to_b_cart
        SET quantity = $1, unit_price = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [newQuantity, existingItem.rows[0].id, product.price]);

      return res.status(200).json({
        success: true,
        message: 'Cart updated successfully',
        data: result.rows[0]
      });
    }

    // Add new item to cart
    const insertQuery = `
      INSERT INTO manage_b_to_b_cart (
        distributor_id,
        product_id,
        quantity,
        unit_price,
        created_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    console.log('Inserting into cart:', { distributorId, product_id, quantity, price: product.price, product });

    const result = await pool.query(insertQuery, [
      distributorId,
      product_id,
      quantity,
      product.price
    ]);

    res.status(201).json({
      success: true,
      message: 'Product added to cart successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product to cart'
    });
  }
};

// Get cart items
export const getCart = async (req, res) => {
  try {
    const distributorId = req.user.userId;

    const query = `
      SELECT
        c.id as cart_id,
        c.product_id,
        c.quantity,
        p.price,
        p.product_name,
        p.product_image,
        p.sku,
        p.moq,
        p.stock_quantity,
        m.company_name as manufacturer_name,
        m.id as manufacturer_id,
        (c.quantity * p.price) as subtotal
      FROM manage_b_to_b_cart c
      INNER JOIN manage_manufacturer_products p ON c.product_id = p.id
      INNER JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
      WHERE c.distributor_id = $1
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, [distributorId]);

    // Calculate totals
    const itemsSubtotal = result.rows.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    const estimatedFees = itemsSubtotal * 0.05; // 5% fees
    const shipping = 0; // Free shipping or calculate based on logic
    const totalAmount = itemsSubtotal + estimatedFees + shipping;

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: {
        items: result.rows.map(row => ({
          cart_id: row.cart_id,
          product_id: row.product_id,
          sku: row.sku,
          product_name: row.product_name,
          product_image: row.product_image,
          manufacturer_name: row.manufacturer_name,
          manufacturer_id: row.manufacturer_id,
          quantity: parseInt(row.quantity),
          price: parseFloat(row.price),
          moq: parseInt(row.moq),
          stock_quantity: parseInt(row.stock_quantity),
          subtotal: parseFloat(row.subtotal)
        })),
        summary: {
          items_subtotal: parseFloat(itemsSubtotal.toFixed(2)),
          estimated_fees: parseFloat(estimatedFees.toFixed(2)),
          shipping: parseFloat(shipping.toFixed(2)),
          total_amount: parseFloat(totalAmount.toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    // Get cart item with product details
    const cartQuery = await pool.query(
      `SELECT c.*, p.moq, p.stock_quantity, p.price
       FROM manage_b_to_b_cart c
       INNER JOIN manage_manufacturer_products p ON c.product_id = p.id
       WHERE c.id = $1 AND c.distributor_id = $2`,
      [id, distributorId]
    );

    if (cartQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    const cartItem = cartQuery.rows[0];

    // Validate quantity
    if (quantity < cartItem.moq) {
      return res.status(400).json({
        success: false,
        message: `Minimum order quantity is ${cartItem.moq}`
      });
    }

    if (quantity > cartItem.stock_quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${cartItem.stock_quantity} units available`
      });
    }

    const updateQuery = `
      UPDATE manage_b_to_b_cart
      SET quantity = $1, unit_price = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND distributor_id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [quantity, id, distributorId, cartItem.price]);

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cart'
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { id } = req.params;

    const query = `
      DELETE FROM manage_b_to_b_cart
      WHERE id = $1 AND distributor_id = $2
      RETURNING id
    `;

    const result = await pool.query(query, [id, distributorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully'
    });

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart'
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    const distributorId = req.user.userId;

    await pool.query(
      'DELETE FROM manage_b_to_b_cart WHERE distributor_id = $1',
      [distributorId]
    );

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
};