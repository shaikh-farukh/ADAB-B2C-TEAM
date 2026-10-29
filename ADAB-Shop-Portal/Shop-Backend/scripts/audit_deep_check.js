require('dotenv').config();
const { signToken } = require('../src/utils/jwt');
const pool = require('../db');

const SELLER_USER_ID = '9d0cc2db-06af-427a-b04b-632f1bcdc217';
const SELLER_PHONE = '9999999999';
const token = signToken({ userId: SELLER_USER_ID, phone: SELLER_PHONE, role: 'SELLER' });

const TEST_PROMPTS = [
  { domain: 'Store Operations', prompt: 'Is my store open right now?' },
  { domain: 'Order Fulfillment', prompt: 'List all new and pending customer orders' },
  { domain: 'Catalog & Stock', prompt: 'Check if any items are low on stock' },
  { domain: 'Sales Analytics', prompt: "Show today's sales and revenue report" },
  { domain: 'GST Compliance', prompt: 'What is my GSTR tax calculation for this month?' },
  { domain: 'B2B Wholesale', prompt: 'Find wholesale suppliers for rice' }
];

async function runDeepAudit() {
  console.log('====================================================');
  console.log('       ADAB AI ASSISTANT: DEEP AUDIT & HEALTH CHECK ');
  console.log('====================================================\n');

  console.log('1. Checking PostgreSQL Database & Tables...');
  try {
    const tableRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('ai_audit_logs', 'seller_orders', 'seller_listings', 'stores')
    `);
    const foundTables = tableRes.rows.map(r => r.table_name);
    console.log('   ✅ Active Tables Verified:', foundTables.join(', '));
    if (!foundTables.includes('ai_audit_logs')) {
      throw new Error('Missing ai_audit_logs table in database!');
    }
  } catch (err) {
    console.error('   ❌ Database verification failed:', err.message);
    process.exit(1);
  }

  console.log('\n2. Testing Live Gemini 3.5 Flash Assistant Calls (HTTP POST /assistant/chat)...');
  let passCount = 0;

  for (const test of TEST_PROMPTS) {
    process.stdout.write(`   ▶ Testing ${test.domain.padEnd(20)}: "${test.prompt}" ... `);
    const start = Date.now();
    try {
      const res = await fetch('http://localhost:5003/api/v1/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: test.prompt })
      });

      const data = await res.json();
      const duration = Date.now() - start;

      if (!res.ok || !data.success) {
        console.log(`❌ FAILED (${duration}ms) - ${data.error || 'Unknown error'}`);
      } else {
        const toolsCalled = (data.toolExecutions || []).map(t => t.tool).join(', ') || 'No tools';
        console.log(`✅ OK (${duration}ms) -> Tool: [${toolsCalled}]`);
        passCount++;
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
    }
  }

  console.log(`\n3. Conversational API Results: ${passCount}/${TEST_PROMPTS.length} Passed`);

  console.log('\n4. Verifying ai_audit_logs Entries in PostgreSQL...');
  try {
    const auditRes = await pool.query(`
      SELECT tool_name, tool_tier, duration_ms, success, created_at 
      FROM ai_audit_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log(`   ✅ Found ${auditRes.rows.length} recent audit logs:`);
    auditRes.rows.forEach(r => {
      console.log(`      • [${r.tool_name}] (${r.tool_tier}) - ${r.duration_ms}ms - Success: ${r.success} - ${r.created_at.toISOString()}`);
    });
  } catch (err) {
    console.error('   ❌ Audit log query failed:', err.message);
  }

  console.log('\n====================================================');
  console.log('                   AUDIT COMPLETE                    ');
  console.log('====================================================');
  process.exit(0);
}

runDeepAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
