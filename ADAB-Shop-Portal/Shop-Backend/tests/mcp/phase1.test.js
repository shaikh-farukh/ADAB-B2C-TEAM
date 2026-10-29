const { defaultRegistry } = require('../../src/mcp/registry');
const { registerOrderTools, listOrdersTool, updateOrderStateTool } = require('../../src/mcp/tools/orders');
const sellerService = require('../../src/services/seller');
const pool = require('../../db');

// Mock sellerService for isolated unit testing
jest.mock('../../src/services/seller', () => ({
  getSellerOrders: jest.fn(),
  updateOrderStatus: jest.fn()
}));

// Mock pool.query for database calls
jest.mock('../../db', () => ({
  query: jest.fn()
}));

describe('Phase 1 MCP Tool Suite & Security Verification', () => {
  const STORE_A = '626fd4e1-ef8b-480a-bc70-d61534da1800';
  const STORE_B = '77777777-7777-7777-7777-777777777777';
  const USER_A = '9d0cc2db-06af-427a-b04b-632f1bcdc217';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Tool Registration & Declaration Contracts', () => {
    it('registers adab_list_orders and adab_update_order_state in registry', () => {
      registerOrderTools(defaultRegistry);
      const declarations = defaultRegistry.getGeminiFunctionDeclarations();
      const names = declarations.map(d => d.name);

      expect(names).toContain('adab_list_orders');
      expect(names).toContain('adab_update_order_state');

      const updateTool = declarations.find(d => d.name === 'adab_update_order_state');
      expect(updateTool.parameters.required).toEqual(['orderId', 'targetStatus']);
    });
  });

  describe('2. Multi-Tenant Security & Boundary Isolation', () => {
    it('strictly rejects execution if authContext or storeId is missing', async () => {
      const res1 = await defaultRegistry.execute('adab_list_orders', {}, null);
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('SecurityException: Missing authenticated store context');

      const res2 = await defaultRegistry.execute('adab_list_orders', {}, { userId: USER_A });
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('SecurityException: Missing authenticated store context');
    });

    it('forces storeId binding onto sellerService without trusting client arguments', async () => {
      sellerService.getSellerOrders.mockResolvedValue([
        {
          seller_order_id: 'ord-1',
          order_number: 'ORD-108',
          seller_order_status: 'ACCEPTED',
          amount: 250,
          customer: 'Mayank Merchant',
          item_summary: 'Basmati Rice (x1)',
          seller_order_created_at: new Date().toISOString()
        }
      ]);

      // Malicious attempt: client tries to pass storeId of Store B in args
      const maliciousArgs = { storeId: STORE_B, status: 'ACCEPTED' };
      const res = await defaultRegistry.execute('adab_list_orders', maliciousArgs, {
        storeId: STORE_A,
        userId: USER_A
      });

      expect(res.success).toBe(true);
      // The service must be called with STORE_A from authContext, NOT STORE_B from args
      expect(sellerService.getSellerOrders).toHaveBeenCalledWith(
        STORE_A,
        expect.objectContaining({ status: 'ACCEPTED' })
      );
    });
  });

  describe('3. Order State-Machine Enforcement', () => {
    it('rejects illegal transition skip from NEW to DELIVERED with INVALID_TRANSITION', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: '108', current_status: 'NEW', order_number: 'ORD-108' }
        ]
      });

      const res = await defaultRegistry.execute(
        'adab_update_order_state',
        { orderId: '108', targetStatus: 'DELIVERED' },
        { storeId: STORE_A, userId: USER_A }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('INVALID_TRANSITION');
      expect(res.error).toContain("Cannot transition order ORD-108 from 'NEW' directly to 'DELIVERED'");
      expect(sellerService.updateOrderStatus).not.toHaveBeenCalled();
    });

    it('allows legal transition progression from ACCEPTED to PACKED', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: '108', current_status: 'ACCEPTED', order_number: 'ORD-108' }
        ]
      });

      sellerService.updateOrderStatus.mockResolvedValue({
        id: '108',
        status: 'PACKED'
      });

      const res = await defaultRegistry.execute(
        'adab_update_order_state',
        { orderId: '108', targetStatus: 'PACKED' },
        { storeId: STORE_A, userId: USER_A }
      );

      expect(res.success).toBe(true);
      expect(res.data.previousStatus).toBe('ACCEPTED');
      expect(res.data.newStatus).toBe('PACKED');
      expect(sellerService.updateOrderStatus).toHaveBeenCalledWith('108', 'PACKED', STORE_A);
    });

    it('rejects mutations on an order that does not belong to the authenticated store', async () => {
      // Database query for storeId returns 0 rows
      pool.query.mockResolvedValue({ rows: [] });

      const res = await defaultRegistry.execute(
        'adab_update_order_state',
        { orderId: '999', targetStatus: 'PACKED' },
        { storeId: STORE_A, userId: USER_A }
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('OrderNotFound: Order \'999\' not found in store');
      expect(sellerService.updateOrderStatus).not.toHaveBeenCalled();
    });
  });
});
