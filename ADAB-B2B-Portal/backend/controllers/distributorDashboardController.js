import pool from '../Config/database.js';

// Get Distributor Dashboard Statistics
export const getDashboardStats = async (req, res) => {
  try {
    const distributorId = req.user.userId;

    console.log('📊 Fetching distributor dashboard for:', distributorId);

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    // Get Connected Manufacturers (approved partnerships)
    const manufacturersQuery = `
      SELECT COUNT(DISTINCT r.manufacturer_id) as connected_manufacturers
      FROM manage_b_to_b_request_access r
      WHERE r.email_distributer = $1
        AND r.manufacture_request = 1
        AND r.distributer_request = 1
        AND r.deleted_at IS NULL
    `;
    const manufacturersResult = await pool.query(manufacturersQuery, [distributorEmail]);

    // Get Total Orders
    const ordersQuery = `
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
        COALESCE(SUM(total_amount), 0) as total_spent,
        COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending', 'processing')), 0) as pending_payments
      FROM manage_b_to_b_orders
      WHERE distributor_id = $1 AND deleted_at IS NULL
    `;
    const ordersResult = await pool.query(ordersQuery, [distributorId]);

    // Get Order Lifecycle breakdown
    const lifecycleQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM manage_b_to_b_orders
      WHERE distributor_id = $1 AND deleted_at IS NULL
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'processing' THEN 2
          WHEN 'shipped' THEN 3
          WHEN 'delivered' THEN 4
          ELSE 5
        END
    `;
    const lifecycleResult = await pool.query(lifecycleQuery, [distributorId]);

    // FIXED: Get Recent Orders - Added all columns to GROUP BY
    const recentOrdersQuery = `
      SELECT
        o.id,
        o.order_number,
        o.order_date,
        o.total_amount,
        o.status,
        o.created_at,
        m.company_name as manufacturer_name,
        COUNT(oi.id) as items_count
      FROM manage_b_to_b_orders o
      LEFT JOIN manage_b_to_b_userdetail m ON o.manufacturer_id = m.id
      LEFT JOIN manage_b_to_b_order_items oi ON o.id = oi.order_id
      WHERE o.distributor_id = $1 AND o.deleted_at IS NULL
      GROUP BY o.id, o.order_number, o.order_date, o.total_amount, o.status, o.created_at, m.company_name
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
    const recentOrdersResult = await pool.query(recentOrdersQuery, [distributorId]);

    // Get Volume Analysis (last 7 days)
    const volumeQuery = `
      WITH dates AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT
        d.date,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_amount
      FROM dates d
      LEFT JOIN manage_b_to_b_orders o
        ON DATE(o.order_date) = d.date
        AND o.distributor_id = $1
        AND o.deleted_at IS NULL
      GROUP BY d.date
      ORDER BY d.date
    `;
    const volumeResult = await pool.query(volumeQuery, [distributorId]);

    // Get Top Categories
    const categoriesQuery = `
      SELECT 
        p.category as name,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as value
      FROM manage_b_to_b_orders o
      JOIN manage_b_to_b_order_items oi ON o.id = oi.order_id
      JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE o.distributor_id = $1 AND o.deleted_at IS NULL
      GROUP BY p.category
      ORDER BY value DESC
      LIMIT 5
    `;
    const categoriesResult = await pool.query(categoriesQuery, [distributorId]);

    // Smart Reorder Suggestion Engine (Advanced Feature 4)
    const smartReorderQuery = `
      SELECT
        p.id as product_id,
        p.product_name,
        p.sku as product_sku,
        p.price,
        p.product_image,
        COUNT(o.id) as order_frequency,
        MAX(o.created_at) as last_ordered_date,
        COALESCE(dp.stock_quantity, 0) as stock,
        CASE 
          WHEN COALESCE(dp.stock_quantity, 0) <= 20 THEN 'CRITICAL'
          WHEN COALESCE(dp.stock_quantity, 0) <= 50 THEN 'MEDIUM'
          ELSE 'OPTIMAL'
        END as stock_status,
        GREATEST(COALESCE(p.moq, 10), CEIL(AVG(oi.quantity))) as recommended_qty
      FROM manage_b_to_b_orders o
      JOIN manage_b_to_b_order_items oi ON o.id = oi.order_id
      JOIN manage_manufacturer_products p ON oi.product_id = p.id
      LEFT JOIN distributor_products dp ON p.id = dp.product_id AND dp.distributor_id = o.distributor_id
      WHERE o.distributor_id = $1 AND o.deleted_at IS NULL
        AND COALESCE(dp.stock_quantity, 0) <= 50
      GROUP BY p.id, p.product_name, p.sku, p.price, p.product_image, dp.stock_quantity, p.moq
      ORDER BY stock ASC, order_frequency DESC
      LIMIT 35
    `;
    const smartReorderResult = await pool.query(smartReorderQuery, [distributorId]);

    console.log('✅ Dashboard data fetched successfully');

    // Compile response
    res.status(200).json({
      success: true,
      data: {
        procurement_metrics: {
          connected_manufacturers: parseInt(manufacturersResult.rows[0].connected_manufacturers),
          total_orders: parseInt(ordersResult.rows[0].total_orders),
          pending_orders: parseInt(ordersResult.rows[0].pending_orders),
          processing_orders: parseInt(ordersResult.rows[0].processing_orders),
          shipped_orders: parseInt(ordersResult.rows[0].shipped_orders),
          approved_orders: parseInt(ordersResult.rows[0].delivered_orders),
          pending_payments: parseFloat(ordersResult.rows[0].pending_payments),
          total_spent: parseFloat(ordersResult.rows[0].total_spent)
        },
        order_lifecycle: lifecycleResult.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count)
        })),
        recent_orders: recentOrdersResult.rows.map(row => ({
          id: row.id,
          order_number: row.order_number,
          manufacturer_name: row.manufacturer_name,
          order_date: row.order_date,
          total_amount: parseFloat(row.total_amount),
          status: row.status.toUpperCase(),
          items_count: parseInt(row.items_count)
        })),
        volume_analysis: (() => {
          const historical = volumeResult.rows.map(row => ({
            date: new Date(row.date).toISOString(),
            order_count: parseInt(row.order_count),
            total_amount: parseFloat(row.total_amount),
            isPredicted: false
          }));

          if (historical.length === 0) return [];

          // Simple Linear Regression for Total Amount
          const n = historical.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
          
          historical.forEach((item, i) => {
            sumX += i;
            sumY += item.total_amount;
            sumXY += i * item.total_amount;
            sumXX += i * i;
          });

          const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
          const intercept = n > 1 ? (sumY - slope * sumX) / n : historical[0].total_amount;

          const forecast = [];
          const lastDate = new Date(historical[historical.length - 1].date);
          
          for (let i = 1; i <= 4; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);
            const predictedX = n - 1 + i;
            let predictedAmount = intercept + (slope * predictedX);
            // Ensure we don't predict negative spend
            predictedAmount = Math.max(0, predictedAmount);

            forecast.push({
              date: nextDate.toISOString(),
              order_count: 0,
              total_amount: parseFloat(predictedAmount.toFixed(2)),
              isPredicted: true
            });
          }

          return [...historical, ...forecast];
        })(),
        top_categories: categoriesResult.rows.map(row => ({
          name: row.name,
          value: parseFloat(row.value)
        })),
        smart_reorder: smartReorderResult.rows.map(row => ({
          product_id: row.product_id,
          product_name: row.product_name,
          product_sku: row.product_sku,
          price: parseFloat(row.price),
          stock: parseInt(row.stock),
          product_image: row.product_image,
          order_frequency: parseInt(row.order_frequency),
          last_ordered_date: row.last_ordered_date,
          suggested_quantity: Math.ceil(parseFloat(row.recommended_qty))
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Procurement Health Scan
export const getHealthScan = async (req, res) => {
  try {
    const distributorId = req.user.userId;

    console.log('🏥 Fetching health scan for distributor:', distributorId);

    const query = `
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_orders,
        AVG(total_amount) as avg_order_value,
        COUNT(DISTINCT manufacturer_id) as active_manufacturers
      FROM manage_b_to_b_orders
      WHERE distributor_id = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [distributorId]);
    const data = result.rows[0];

    const health = {
      completion_rate: data.total_orders > 0
        ? ((parseInt(data.completed_orders) / parseInt(data.total_orders)) * 100).toFixed(2)
        : 0,
      rejection_rate: data.total_orders > 0
        ? ((parseInt(data.rejected_orders) / parseInt(data.total_orders)) * 100).toFixed(2)
        : 0,
      avg_order_value: parseFloat(data.avg_order_value || 0).toFixed(2),
      active_manufacturers: parseInt(data.active_manufacturers || 0)
    };

    console.log('✅ Health scan completed');

    res.status(200).json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('❌ Get health scan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health scan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};