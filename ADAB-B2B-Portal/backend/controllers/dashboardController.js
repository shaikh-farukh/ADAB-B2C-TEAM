import pool from '../Config/database.js';
import logger from '../utils/logger.js';

// Get Dashboard Statistics
export const getDashboardStats = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    logger.info(`Fetching dashboard stats for manufacturer: ${manufacturerId}`);

    // Get Total Products
    const productsQuery = `
      SELECT COUNT(*) as total_products,
             COUNT(*) FILTER (WHERE status = 'active') as active_products,
             COUNT(*) FILTER (WHERE status = 'inactive') as inactive_products,
             COUNT(*) FILTER (WHERE stock_quantity <= 10) as low_stock
      FROM manage_manufacturer_products
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
    `;

    // Get Total Orders with breakdown
    const ordersQuery = `
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
        COUNT(*) FILTER (WHERE status = 'shipped') as shipped_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) as delivered_revenue
      FROM manage_b_to_b_orders
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
    `;

    // Get Connected Distributors from approved manufacturer-distributor request records
    const distributorsQuery = `
      SELECT
        COUNT(DISTINCT u.id) as total_distributors,
        COUNT(DISTINCT u.id) as active_distributors
      FROM manage_b_to_b_userdetail u
      INNER JOIN manage_b_to_b_request_access r ON u.email = r.email_distributer
      WHERE r.manufacturer_id = $1
        AND r.deleted_at IS NULL
        AND u.active = true
        AND u.business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
        AND r.manufacture_request = 1
        AND r.distributer_request = 1
    `;

    // Get Pending Distributor Requests
    const requestsQuery = `
      SELECT COUNT(*) as pending_requests,
             COUNT(*) FILTER (WHERE distributer_request = 1) as approved_by_distributor,
             COUNT(*) FILTER (WHERE distributer_request = 0) as rejected_by_distributor,
             COUNT(*) FILTER (WHERE manufacture_request = 1) as approved_by_manufacturer,
             COUNT(*) FILTER (WHERE manufacture_request = 0) as rejected_by_manufacturer
      FROM manage_b_to_b_request_access
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
    `;

    // Get Order Status Distribution for Chart
    const orderStatusChartQuery = `
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_amount
      FROM manage_b_to_b_orders
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `;

    // Dynamic update checks
    const productUpdateCheckQuery = `
      SELECT EXISTS (
        SELECT 1 FROM manage_manufacturer_products
        WHERE manufacturer_id = $1 AND (created_at >= CURRENT_DATE OR updated_at >= CURRENT_DATE) AND deleted_at IS NULL
      ) as updated_today
    `;

    const orderUpdateCheckQuery = `
      SELECT EXISTS (
        SELECT 1 FROM manage_b_to_b_orders
        WHERE manufacturer_id = $1 AND (created_at >= CURRENT_DATE OR updated_at >= CURRENT_DATE) AND deleted_at IS NULL
      ) as updated_today
    `;

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
        AND o.manufacturer_id = $1
        AND o.deleted_at IS NULL
      GROUP BY d.date
      ORDER BY d.date
    `;

    // Get Top Categories
    const categoriesQuery = `
      SELECT 
        p.category as name,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as value
      FROM manage_b_to_b_orders o
      JOIN manage_b_to_b_order_items oi ON o.id = oi.order_id
      JOIN manage_manufacturer_products p ON oi.product_id = p.id
      WHERE o.manufacturer_id = $1 AND o.deleted_at IS NULL
      GROUP BY p.category
      ORDER BY value DESC
      LIMIT 5
    `;

    // Execute all queries in parallel
    const [
      productsResult,
      ordersResult,
      distributorsResult,
      requestsResult,
      orderStatusChartResult,
      productUpdateCheckResult,
      orderUpdateCheckResult,
      volumeResult,
      categoriesResult
    ] = await Promise.all([
      pool.query(productsQuery, [manufacturerId]),
      pool.query(ordersQuery, [manufacturerId]),
      pool.query(distributorsQuery, [manufacturerId]),
      pool.query(requestsQuery, [manufacturerId]),
      pool.query(orderStatusChartQuery, [manufacturerId]),
      pool.query(productUpdateCheckQuery, [manufacturerId]),
      pool.query(orderUpdateCheckQuery, [manufacturerId]),
      pool.query(volumeQuery, [manufacturerId]),
      pool.query(categoriesQuery, [manufacturerId])
    ]);

    // Compile response
    logger.info('Dashboard distributor stats', {
      manufacturerId,
      total_distributors: distributorsResult.rows[0]?.total_distributors,
      active_distributors: distributorsResult.rows[0]?.active_distributors
    });

    res.status(200).json({
      success: true,
      data: {
        products: {
          total: parseInt(productsResult.rows[0].total_products),
          active: parseInt(productsResult.rows[0].active_products),
          inactive: parseInt(productsResult.rows[0].inactive_products),
          low_stock: parseInt(productsResult.rows[0].low_stock),
          updated_today: productUpdateCheckResult.rows[0].updated_today
        },
        orders: {
          total: parseInt(ordersResult.rows[0].total_orders),
          pending: parseInt(ordersResult.rows[0].pending_orders),
          processing: parseInt(ordersResult.rows[0].processing_orders),
          shipped: parseInt(ordersResult.rows[0].shipped_orders),
          delivered: parseInt(ordersResult.rows[0].delivered_orders),
          rejected: parseInt(ordersResult.rows[0].rejected_orders),
          total_revenue: parseFloat(ordersResult.rows[0].total_revenue),
          delivered_revenue: parseFloat(ordersResult.rows[0].delivered_revenue),
          updated_today: orderUpdateCheckResult.rows[0].updated_today
        },
        distributors: {
          total: parseInt(distributorsResult.rows[0].active_distributors, 10) || 0,
          active: parseInt(distributorsResult.rows[0].active_distributors, 10) || 0,
          connected: (parseInt(distributorsResult.rows[0].active_distributors, 10) || 0) > 0
        },
        requests: {
          pending: parseInt(requestsResult.rows[0].pending_requests),
          approved_by_distributor: parseInt(requestsResult.rows[0].approved_by_distributor),
          rejected_by_distributor: parseInt(requestsResult.rows[0].rejected_by_distributor),
          approved_by_manufacturer: parseInt(requestsResult.rows[0].approved_by_manufacturer),
          rejected_by_manufacturer: parseInt(requestsResult.rows[0].rejected_by_manufacturer),
          action_required: parseInt(requestsResult.rows[0].pending_requests)
        },
        order_status_chart: orderStatusChartResult.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count),
          amount: parseFloat(row.total_amount)
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
            // Ensure we don't predict negative revenue
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
        }))
      }
    });

  } catch (error) {
    logger.error('Get dashboard stats error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get Order Status Overview
export const getOrderStatusOverview = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    logger.info(`Fetching order status overview for manufacturer: ${manufacturerId}`);

    const query = `
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total_amount,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM manage_b_to_b_orders
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await pool.query(query, [manufacturerId]);

    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count),
        total_amount: parseFloat(row.total_amount),
        percentage: parseFloat(row.percentage)
      }))
    });

  } catch (error) {
    logger.error('Get order status overview error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order status overview'
    });
  }
};

// Get Facility Efficiency (products per distributor ratio)
export const getFacilityEfficiency = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    logger.info(`Fetching facility efficiency metrics for manufacturer: ${manufacturerId}`);

    const query = `
      SELECT
        (SELECT COUNT(*) FROM manage_manufacturer_products WHERE manufacturer_id = $1 AND deleted_at IS NULL) as total_products,
        (SELECT COUNT(*) FROM manage_b_to_b_userdetail WHERE created_by = $1 AND deleted_at IS NULL) as total_distributors,
        (SELECT COUNT(*) FROM manage_b_to_b_orders WHERE manufacturer_id = $1 AND deleted_at IS NULL) as total_orders,
        (SELECT COUNT(*) FROM manage_b_to_b_orders WHERE manufacturer_id = $1 AND status = 'delivered' AND deleted_at IS NULL) as delivered_orders,
        (SELECT COALESCE(AVG(total_amount), 0) FROM manage_b_to_b_orders WHERE manufacturer_id = $1 AND deleted_at IS NULL) as avg_order_value
    `;

    const result = await pool.query(query, [manufacturerId]);
    const data = result.rows[0];

    const efficiency = {
      products_per_distributor: data.total_distributors > 0
        ? (parseInt(data.total_products) / parseInt(data.total_distributors)).toFixed(2)
        : 0,
      orders_per_distributor: data.total_distributors > 0
        ? (parseInt(data.total_orders) / parseInt(data.total_distributors)).toFixed(2)
        : 0,
      delivery_rate: data.total_orders > 0
        ? ((parseInt(data.delivered_orders) / parseInt(data.total_orders)) * 100).toFixed(2)
        : 0,
      avg_order_value: parseFloat(data.avg_order_value).toFixed(2)
    };

    res.status(200).json({
      success: true,
      data: efficiency
    });

  } catch (error) {
    logger.error('Get facility efficiency error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility efficiency'
    });
  }
};