import pool from '../Config/database.js';

// Get locations for Manufacturers, Distributors, and Shops (for Market Coverage Map)
export const getMarketCoverage = async (req, res) => {
  const {
    pincode,
    category,
    role,
    state,
    city
  } = req.query;
  const state_id = req.query.state_id || state;
  const city_id = req.query.city_id || city;
  const business_type = req.query.business_type || role;

  try {
    const locations = [];

    // 1. Fetch Manufacturers & Distributors if requested or no specific type requested
    if (!business_type || business_type === 'manufacturer' || business_type === 'distributor') {
      let query = `
        SELECT u.id, u.company_name as name, u.address, 
               20.5937 as latitude, 78.9629 as longitude, u.pincode as pincode,
               u.state as state_name, u.city as city_name, bt.typename as business_type
        FROM manage_b_to_b_userdetail u
        JOIN manage_b_to_b_user_type bt ON u.business_type_id = bt.id
        WHERE u.deleted_at IS NULL
      `;
      const params = [];
      let paramIdx = 1;

      if (business_type) {
        query += ` AND bt.typename ILIKE $${paramIdx}`;
        params.push(business_type);
        paramIdx++;
      }
      if (state_id) {
        query += ` AND u.state ILIKE $${paramIdx}`;
        params.push('%' + state_id + '%');
        paramIdx++;
      }
      if (city_id) {
        query += ` AND u.city ILIKE $${paramIdx}`;
        params.push('%' + city_id + '%');
        paramIdx++;
      }
      if (pincode) {
        query += ` AND (u.pincode ILIKE $${paramIdx} OR u.address ILIKE $${paramIdx})`;
        params.push('%' + pincode + '%');
        paramIdx++;
      }

      const resUsers = await pool.query(query, params);

      for (const row of resUsers.rows) {
        // If category filter is active, check if manufacturer/distributor has products in that category
        let matchCategory = true;
        if (category && category !== 'All Categories') {
          let catCheck;
          if (row.business_type.toLowerCase() === 'manufacturer') {
            catCheck = await pool.query(
              'SELECT id FROM manage_manufacturer_products WHERE manufacturer_id = $1 AND category = $2 AND deleted_at IS NULL LIMIT 1',
              [row.id, category]
            );
          } else {
            catCheck = await pool.query(
              'SELECT dp.id FROM distributor_products dp JOIN manage_manufacturer_products p ON dp.product_id = p.id WHERE dp.distributor_id = $1 AND p.category = $2 LIMIT 1',
              [row.id, category]
            );
          }
          matchCategory = catCheck.rows.length > 0;
        }

        if (matchCategory) {
          locations.push({
            id: row.id,
            name: row.name,
            address: row.address,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            pincode: row.pincode,
            state: row.state_name,
            city: row.city_name,
            business_type: row.business_type.toLowerCase(),
            category: category || 'All'
          });
        }
      }
    }

    // 2. Fetch Shops if requested or no specific type requested
    if (!business_type || business_type === 'shop') {
      let query = `
        SELECT sh.id, sh.shop_name as name, COALESCE(sh.shop_address, sh.address) as address,
               sh.latitude, sh.longitude, sh.pincode,
               sh.state as state_name, 
               sh.city as city_name,
               COALESCE(sh.mobile_no, sh.mobile_number) as contact_no
        FROM shopdetail sh
        WHERE sh.delete_at IS NULL AND sh.latitude IS NOT NULL AND sh.longitude IS NOT NULL
      `;
      const params = [];
      let paramIdx = 1;

      if (state_id) {
        query += ` AND sh.state ILIKE $${paramIdx}`;
        params.push('%' + state_id + '%');
        paramIdx++;
      }
      if (city_id) {
        query += ` AND sh.city ILIKE $${paramIdx}`;
        params.push('%' + city_id + '%');
        paramIdx++;
      }
      if (pincode) {
        query += ` AND (sh.pincode ILIKE $${paramIdx} OR sh.address ILIKE $${paramIdx})`;
        params.push('%' + pincode + '%');
        paramIdx++;
      }

      const resShops = await pool.query(query, params);

      resShops.rows.forEach(row => {
        locations.push({
          id: row.id,
          name: row.name || 'Unnamed Shop',
          address: row.address,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          pincode: row.pincode,
          state: row.state_name,
          city: row.city_name,
          business_type: 'shop',
          contact_no: row.contact_no,
          category: 'All'
        });
      });
    }

    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    console.error('Get market coverage error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch market coverage locations' });
  }
};
