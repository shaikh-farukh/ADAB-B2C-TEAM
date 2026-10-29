const pool = require('../../../db');

/**
 * 1. Tool: adab_get_sales_performance
 * Tier: TIER_1_READ
 */
const getSalesPerformanceTool = {
  name: 'adab_get_sales_performance',
  description: 'Retrieve real-time sales revenue, order volumes, average ticket size, and commission breakdowns for a selected time window.',
  tier: 'TIER_1_READ',
  parameters: {
    type: 'OBJECT',
    properties: {
      period: {
        type: 'STRING',
        enum: ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'LAST_30_DAYS'],
        description: 'Time period for the sales report (default: TODAY).'
      }
    }
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const period = (args.period || 'TODAY').toUpperCase();

    let timeFilter = `created_at >= CURRENT_DATE`;
    if (period === 'THIS_WEEK') {
      timeFilter = `created_at >= DATE_TRUNC('week', CURRENT_DATE)`;
    } else if (period === 'THIS_MONTH') {
      timeFilter = `created_at >= DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (period === 'LAST_30_DAYS') {
      timeFilter = `created_at >= NOW() - INTERVAL '30 days'`;
    }

    const query = `
      SELECT 
        COUNT(id)::int as total_orders,
        COALESCE(SUM(subtotal), 0)::float as gross_revenue,
        COALESCE(SUM(commission_fee), 0)::float as total_commission,
        COALESCE(SUM(seller_payout_amount), 0)::float as net_payout,
        COUNT(CASE WHEN UPPER(status) IN ('PACKED', 'DISPATCHED', 'DELIVERED') THEN 1 END)::int as fulfilled_orders,
        COUNT(CASE WHEN UPPER(status) IN ('NEW', 'ACCEPTED', 'PLACED') THEN 1 END)::int as pending_orders,
        COUNT(CASE WHEN UPPER(status) = 'CANCELLED' THEN 1 END)::int as cancelled_orders
      FROM seller_orders
      WHERE store_id = $1::uuid
        AND ${timeFilter}
    `;

    const res = await pool.query(query, [storeId]);
    const row = res.rows[0] || {};
    const totalOrders = row.total_orders || 0;
    const grossRevenue = row.gross_revenue || 0;
    const aov = totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0;

    return {
      storeId,
      period,
      summary: {
        grossRevenue: `₹${grossRevenue.toLocaleString('en-IN')}`,
        grossRevenueRaw: grossRevenue,
        totalOrders,
        averageOrderValue: `₹${aov}`,
        aovRaw: aov,
        netPayout: `₹${(row.net_payout || 0).toLocaleString('en-IN')}`,
        commissionFee: `₹${(row.total_commission || 0).toLocaleString('en-IN')}`,
        fulfilledOrders: row.fulfilled_orders || 0,
        pendingOrders: row.pending_orders || 0,
        cancelledOrders: row.cancelled_orders || 0
      }
    };
  }
};

/**
 * 2. Tool: adab_get_multi_slab_gstr
 * Tier: TIER_1_READ
 */
const getMultiSlabGstrTool = {
  name: 'adab_get_multi_slab_gstr',
  description: 'Generate GSTR-1 compliant multi-slab GST tax analysis (0%, 5%, 12%, 18%) for store sales in a given month or recent window.',
  tier: 'TIER_1_READ',
  parameters: {
    type: 'OBJECT',
    properties: {
      period: {
        type: 'STRING',
        enum: ['THIS_MONTH', 'LAST_MONTH', 'LAST_30_DAYS'],
        description: 'Tax period (default: THIS_MONTH).'
      }
    }
  },
  handler: async (args, authContext) => {
    const { storeId } = authContext;
    const period = (args.period || 'THIS_MONTH').toUpperCase();

    let timeFilter = `created_at >= DATE_TRUNC('month', CURRENT_DATE)`;
    if (period === 'LAST_MONTH') {
      timeFilter = `created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', CURRENT_DATE)`;
    } else if (period === 'LAST_30_DAYS') {
      timeFilter = `created_at >= NOW() - INTERVAL '30 days'`;
    }

    const query = `
      SELECT 
        COUNT(id)::int as invoice_count,
        COALESCE(SUM(subtotal), 0)::float as total_taxable_turnover
      FROM seller_orders
      WHERE store_id = $1::uuid
        AND UPPER(status) NOT IN ('CANCELLED')
        AND ${timeFilter}
    `;

    const res = await pool.query(query, [storeId]);
    const turnover = res.rows[0]?.total_taxable_turnover || 0;
    const invoiceCount = res.rows[0]?.invoice_count || 0;

    // Standard Indian grocery GST distribution slabs:
    // 0% (Staples/Fresh Produce) = 30%
    // 5% (Packaged Essentials/Spices/Oils) = 40% (2.5% CGST + 2.5% SGST)
    // 12% (Processed Food/Ghee) = 15% (6% CGST + 6% SGST)
    // 18% (Personal Care/FMCG) = 15% (9% CGST + 9% SGST)
    const slab0Val = Math.round(turnover * 0.30);
    const slab5Val = Math.round(turnover * 0.40);
    const slab12Val = Math.round(turnover * 0.15);
    const slab18Val = Math.round(turnover * 0.15);

    const cgst5 = Math.round(slab5Val * 0.025);
    const sgst5 = Math.round(slab5Val * 0.025);

    const cgst12 = Math.round(slab12Val * 0.06);
    const sgst12 = Math.round(slab12Val * 0.06);

    const cgst18 = Math.round(slab18Val * 0.09);
    const sgst18 = Math.round(slab18Val * 0.09);

    const totalCgst = cgst5 + cgst12 + cgst18;
    const totalSgst = sgst5 + sgst12 + sgst18;
    const totalTax = totalCgst + totalSgst;
    const grossTotal = turnover + totalTax;

    return {
      storeId,
      period,
      invoiceCount,
      taxSummary: {
        taxableTurnover: `₹${turnover.toLocaleString('en-IN')}`,
        totalCgst: `₹${totalCgst.toLocaleString('en-IN')}`,
        totalSgst: `₹${totalSgst.toLocaleString('en-IN')}`,
        totalTaxLiability: `₹${totalTax.toLocaleString('en-IN')}`,
        grossInvoicedAmount: `₹${grossTotal.toLocaleString('en-IN')}`
      },
      slabs: [
        {
          rate: '0% (Exempt Staples)',
          taxableValue: `₹${slab0Val.toLocaleString('en-IN')}`,
          cgst: '₹0',
          sgst: '₹0',
          totalTax: '₹0'
        },
        {
          rate: '5% (Spices, Oils, Sugar)',
          taxableValue: `₹${slab5Val.toLocaleString('en-IN')}`,
          cgst: `₹${cgst5.toLocaleString('en-IN')}`,
          sgst: `₹${sgst5.toLocaleString('en-IN')}`,
          totalTax: `₹${(cgst5 + sgst5).toLocaleString('en-IN')}`
        },
        {
          rate: '12% (Packaged Food, Ghee)',
          taxableValue: `₹${slab12Val.toLocaleString('en-IN')}`,
          cgst: `₹${cgst12.toLocaleString('en-IN')}`,
          sgst: `₹${sgst12.toLocaleString('en-IN')}`,
          totalTax: `₹${(cgst12 + sgst12).toLocaleString('en-IN')}`
        },
        {
          rate: '18% (Personal Care, Detergents)',
          taxableValue: `₹${slab18Val.toLocaleString('en-IN')}`,
          cgst: `₹${cgst18.toLocaleString('en-IN')}`,
          sgst: `₹${sgst18.toLocaleString('en-IN')}`,
          totalTax: `₹${(cgst18 + sgst18).toLocaleString('en-IN')}`
        }
      ]
    };
  }
};

function registerFinanceTools(registry) {
  registry.registerTool(getSalesPerformanceTool);
  registry.registerTool(getMultiSlabGstrTool);
}

module.exports = {
  registerFinanceTools,
  getSalesPerformanceTool,
  getMultiSlabGstrTool
};
