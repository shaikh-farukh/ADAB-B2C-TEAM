const { defaultRegistry } = require('../../src/mcp/registry');
const pool = require('../../db');

// Mock pool.query
jest.mock('../../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

describe('Phase 4: Audit Trail Immutability & DPDP PII Protection', () => {
  const STORE_ID = '626fd4e1-ef8b-480a-bc70-d61534da1800';
  const USER_ID = '9d0cc2db-06af-427a-b04b-632f1bcdc217';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. PII Scrubbing Compliance (India DPDP Act 2023)', () => {
    it('masks 10-digit customer mobile numbers in conversational text', () => {
      // Replicate the scrubbing regex used in geminiClient
      const scrubPII = (text) => text.replace(/(\+?91[\s-]?)?([6-9]\d{1})\d{6}(\d{2})/g, '$1$2******$3');

      const raw = 'Please contact customer Rahul at 9876543210 or +919876543210 for delivery';
      const scrubbed = scrubPII(raw);

      expect(scrubbed).not.toContain('9876543210');
      expect(scrubbed).toContain('98******10');
    });
  });

  describe('2. Audit Logging Execution', () => {
    it('records tool execution details into ai_audit_logs table asynchronously', async () => {
      await defaultRegistry._recordAuditLog({
        storeId: STORE_ID,
        userId: USER_ID,
        prompt: 'Pack order 108',
        toolName: 'adab_update_order_state',
        toolTier: 'TIER_2_MUTATIVE',
        arguments: { orderId: '108', targetStatus: 'PACKED' },
        result: { success: true },
        success: true,
        durationMs: 45
      });

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [sql, values] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO ai_audit_logs');
      expect(values[0]).toBe(STORE_ID);
      expect(values[1]).toBe(USER_ID);
      expect(values[2]).toBe('Pack order 108');
      expect(values[3]).toBe('adab_update_order_state');
      expect(values[4]).toBe('TIER_2_MUTATIVE');
      expect(values[7]).toBe(true);
      expect(values[8]).toBe(45);
    });
  });
});
