const pool = require('./db');

async function setupTrigger() {
  try {
    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_listing_status_change()
      RETURNS trigger AS $$
      DECLARE
        owner_id UUID;
      BEGIN
        SELECT seller_profiles.user_id INTO owner_id 
        FROM stores 
        JOIN seller_profiles ON stores.seller_id = seller_profiles.id 
        WHERE stores.id = NEW.store_id;

        IF TG_OP = 'UPDATE' THEN
          PERFORM pg_notify('listing_status_change', json_build_object(
            'seller_id', owner_id, 
            'old_data', row_to_json(OLD), 
            'new_data', row_to_json(NEW)
          )::text);
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_listing_status_change ON seller_listings;
      CREATE TRIGGER trg_listing_status_change
      AFTER UPDATE ON seller_listings
      FOR EACH ROW
      EXECUTE FUNCTION notify_listing_status_change();
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_order_status_change()
      RETURNS trigger AS $$
      DECLARE
        owner_id UUID;
      BEGIN
        SELECT seller_profiles.user_id INTO owner_id 
        FROM stores 
        JOIN seller_profiles ON stores.seller_id = seller_profiles.id 
        WHERE stores.id = NEW.store_id;

        IF TG_OP = 'INSERT' THEN
          PERFORM pg_notify('order_status_change', json_build_object(
            'seller_id', owner_id, 
            'event', 'INSERT',
            'new_data', row_to_json(NEW)
          )::text);
        ELSIF TG_OP = 'UPDATE' THEN
          PERFORM pg_notify('order_status_change', json_build_object(
            'seller_id', owner_id, 
            'event', 'UPDATE',
            'old_data', row_to_json(OLD),
            'new_data', row_to_json(NEW)
          )::text);
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_order_status_change ON seller_orders;
      CREATE TRIGGER trg_order_status_change
      AFTER INSERT OR UPDATE ON seller_orders
      FOR EACH ROW
      EXECUTE FUNCTION notify_order_status_change();
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_seller_kyc_change()
      RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          PERFORM pg_notify('kyc_status_change', json_build_object(
            'seller_id', NEW.user_id, 
            'old_data', row_to_json(OLD),
            'new_data', row_to_json(NEW)
          )::text);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_seller_kyc_change ON seller_profiles;
      CREATE TRIGGER trg_seller_kyc_change
      AFTER UPDATE ON seller_profiles
      FOR EACH ROW
      EXECUTE FUNCTION notify_seller_kyc_change();
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION notify_payout_change()
      RETURNS trigger AS $$
      DECLARE
        owner_id UUID;
      BEGIN
        SELECT seller_profiles.user_id INTO owner_id 
        FROM stores 
        JOIN seller_profiles ON stores.seller_id = seller_profiles.id 
        WHERE stores.id = NEW.store_id;

        IF TG_OP = 'UPDATE' THEN
          PERFORM pg_notify('payout_status_change', json_build_object(
            'seller_id', owner_id, 
            'old_data', row_to_json(OLD),
            'new_data', row_to_json(NEW)
          )::text);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_payout_change ON seller_payouts;
      CREATE TRIGGER trg_payout_change
      AFTER UPDATE ON seller_payouts
      FOR EACH ROW
      EXECUTE FUNCTION notify_payout_change();
    `);

    console.log("Postgres NOTIFY triggers successfully created for listings, orders, stores, and payouts!");
  } catch (err) {
    console.error("Error setting up trigger:", err);
  } finally {
    pool.end();
  }
}

setupTrigger();
