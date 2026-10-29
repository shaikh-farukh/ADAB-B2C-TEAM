const { defaultRegistry } = require('../../src/mcp/registry');
const { registerAllTools } = require('../../src/mcp/tools');
const pool = require('../../db');

// Mock pool.query
jest.mock('../../db', () => ({
  query: jest.fn()
}));

// Mock sellerService
jest.mock('../../src/services/seller', () => ({
  getSellerOrders: jest.fn(),
  updateOrderStatus: jest.fn()
}));

describe('Complete ADAB MCP Tool Suite Verification', () => {
  const STORE_A = '626fd4e1-ef8b-480a-bc70-d61534da1800';
  const USER_A = '9d0cc2db-06af-427a-b04b-632f1bcdc217';
  const authContext = { storeId: STORE_A, userId: USER_A };

  beforeAll(() => {
    registerAllTools(defaultRegistry);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Tool Registry Declarations Coverage', () => {
    it('registers all 10 core store operational tools', () => {
      const declarations = defaultRegistry.getGeminiFunctionDeclarations();
      const registeredNames = declarations.map(d => d.name);

      expect(registeredNames).toContain('adab_list_orders');
      expect(registeredNames).toContain('adab_update_order_state');
      expect(registeredNames).toContain('adab_check_low_stock');
      expect(registeredNames).toContain('adab_update_stock_qty');
      expect(registeredNames).toContain('adab_modify_pricing');
      expect(registeredNames).toContain('adab_toggle_listing_status');
      expect(registeredNames).toContain('adab_get_sales_performance');
      expect(registeredNames).toContain('adab_get_multi_slab_gstr');
      expect(registeredNames).toContain('adab_query_b2b_wholesalers');
      expect(registeredNames).toContain('adab_draft_b2b_restock_po');
      expect(registeredNames).toContain('adab_get_store_info');
      expect(registeredNames).toContain('adab_update_store_status');
    });
  });

  describe('2. Catalog & Inventory Tools', () => {
    it('adab_check_low_stock queries items below threshold', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 'item-1', title: 'Mustard Oil 1L', stock_qty: 2, mrp: 180, sell_price: 165, unit: 'bottle', category_name: 'Cooking Oils' }
        ]
      });

      const res = await defaultRegistry.execute('adab_check_low_stock', { threshold: 5 }, authContext);
      expect(res.success).toBe(true);
      expect(res.data.lowStockCount).toBe(1);
      expect(res.data.items[0].title).toBe('Mustard Oil 1L');
    });

    it('adab_modify_pricing enforces sellPrice <= mrp rule', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 'item-1', title: 'Atta 10kg', sell_price: 380, mrp: 400 }
        ]
      });

      // Price higher than MRP must be rejected
      const res = await defaultRegistry.execute('adab_modify_pricing', {
        listingId: 'item-1',
        sellPrice: 450,
        mrp: 400
      }, authContext);

      expect(res.success).toBe(false);
      expect(res.error).toContain('cannot exceed MRP');
    });
  });

  describe('3. Finance & Multi-Slab Tax Tools', () => {
    it('adab_get_sales_performance aggregates orders and net payout', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            total_orders: 14,
            gross_revenue: 12500,
            total_commission: 625,
            net_payout: 11875,
            fulfilled_orders: 12,
            pending_orders: 2,
            cancelled_orders: 0
          }
        ]
      });

      const res = await defaultRegistry.execute('adab_get_sales_performance', { period: 'TODAY' }, authContext);
      expect(res.success).toBe(true);
      expect(res.data.summary.totalOrders).toBe(14);
      expect(res.data.summary.grossRevenue).toContain('12,500');
    });

    it('adab_get_multi_slab_gstr computes 0%, 5%, 12%, 18% GST slabs', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { invoice_count: 50, total_taxable_turnover: 100000 }
        ]
      });

      const res = await defaultRegistry.execute('adab_get_multi_slab_gstr', { period: 'THIS_MONTH' }, authContext);
      expect(res.success).toBe(true);
      expect(res.data.slabs.length).toBe(4);
      expect(res.data.taxSummary.taxableTurnover).toContain('1,00,000');
    });
  });

  describe('4. Store Settings & Operations Tools', () => {
    it('adab_get_store_info retrieves open/close status and soundbox', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: STORE_A,
            store_name: 'Kirana King',
            is_online: true,
            soundbox_enabled: true,
            open_time: '08:00',
            close_time: '23:00',
            delivery_radius_km: 8
          }
        ]
      });

      const res = await defaultRegistry.execute('adab_get_store_info', {}, authContext);
      expect(res.success).toBe(true);
      expect(res.data.isOnline).toBe(true);
      expect(res.data.soundboxEnabled).toBe(true);
      expect(res.data.statusLabel).toContain('OPEN');
    });
  });
});
