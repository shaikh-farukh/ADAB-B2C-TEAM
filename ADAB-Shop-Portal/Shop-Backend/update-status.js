const pool = require('./db');

async function testWorkflow() {
  try {
    // 1. Approve all items that are currently IN REVIEW (SUBMITTED)
    const approveRes = await pool.query(
      `UPDATE seller_listings SET approval_status = 'APPROVED' WHERE approval_status = 'SUBMITTED' RETURNING id, title`
    );
    console.log(`✅ Successfully APPROVED ${approveRes.rowCount} listings:`, approveRes.rows);

    // 2. Reject all items that are currently DRAFT (Just to test the red badge!)
    const rejectRes = await pool.query(
      `UPDATE seller_listings SET approval_status = 'REJECTED' WHERE approval_status = 'DRAFT' RETURNING id, title`
    );
    console.log(`❌ Successfully REJECTED ${rejectRes.rowCount} listings:`, rejectRes.rows);

  } catch (err) {
    console.error('Error updating status:', err);
  } finally {
    pool.end();
  }
}

testWorkflow();
