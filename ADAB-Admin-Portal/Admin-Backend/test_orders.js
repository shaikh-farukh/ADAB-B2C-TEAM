const pool = require('./db');

async function test() {
  try {
    const res = await pool.query('SELECT * FROM orders LIMIT 1');
    console.log(res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
