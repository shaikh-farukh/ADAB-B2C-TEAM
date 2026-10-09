const pool = require('./db'); pool.query('SELECT * FROM notifications').then(res => console.log(res.rows)).catch(console.error).finally(()=>pool.end());
