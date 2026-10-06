const pool = require('./db');
pool.query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conname = 'seller_profiles_kyc_status_check'").then(r => console.log(r.rows)).catch(console.error).finally(() => pool.end());
