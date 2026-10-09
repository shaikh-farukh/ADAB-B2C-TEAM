const pool = require('./db');

async function createMessagesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          store_id UUID NOT NULL,
          customer_id VARCHAR(100) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          direction VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Let's seed a few messages for testing
    const countRes = await pool.query('SELECT COUNT(*) FROM store_messages');
    if (parseInt(countRes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO store_messages (store_id, customer_id, customer_name, direction, content, is_read, created_at)
        VALUES 
          ('00000000-0000-0000-0000-000000000001', 'cust_101', 'John Doe', 'INBOUND', 'Hi, is the Basmati rice 5kg pack available?', true, NOW() - INTERVAL '2 days'),
          ('00000000-0000-0000-0000-000000000001', 'cust_101', 'John Doe', 'OUTBOUND', 'Yes, it is in stock! You can order it now.', true, NOW() - INTERVAL '1 day'),
          ('00000000-0000-0000-0000-000000000001', 'cust_102', 'Sarah Smith', 'INBOUND', 'Do you offer bulk discounts for 50+ kurtis?', false, NOW() - INTERVAL '2 hours'),
          ('00000000-0000-0000-0000-000000000001', 'cust_103', 'Mike Johnson', 'INBOUND', 'I received a damaged packet of almonds.', false, NOW() - INTERVAL '30 minutes');
      `);
      console.log('Seeded store_messages');
    }
    
    console.log("Table store_messages ready.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

createMessagesTable();
