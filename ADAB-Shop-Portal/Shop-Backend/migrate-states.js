const pool = require('./db');

async function run() {
  try {
    const res = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'product_approval_history'");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
