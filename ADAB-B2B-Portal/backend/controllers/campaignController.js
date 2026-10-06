import pool from '../Config/database.js';

// Create and send a campaign notification
export const createCampaign = async (req, res) => {
  const userId = req.user.userId;
  const {
    campaign_name,
    title,
    message,
    notification_type,
    targeting_type,
    targeting_values
  } = req.body;
  const campaignName = campaign_name || title;
  const notificationType = notification_type || 'Offer';

  if (!campaignName || !message || !notificationType) {
    return res.status(400).json({ success: false, message: 'Required fields are missing' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resolve targeting to a list of Distributor IDs
    let shopIds = []; // keeping the variable name shopIds for compatibility with the rest of the code, but it holds distributor IDs
    if (targeting_type === 'distributors' || targeting_type === 'shops') {
      shopIds = targeting_values || [];
    } else if (targeting_type === 'cities') {
      const targetCities = targeting_values || [];
      const distributorsRes = await client.query(
        'SELECT u.id FROM manage_b_to_b_userdetail u JOIN city c ON u.fk_city = c.id WHERE c.name = ANY($1) AND u.active = true AND u.business_type_id = 3',
        [targetCities]
      );
      shopIds = distributorsRes.rows.map(r => r.id);
    } else if (targeting_type === 'territory') {
      // Get all territory assignments for this manufacturer/distributor
      const territoriesRes = await client.query(
        `SELECT state_id, city_id, pincode FROM territory_assignments
         WHERE (distributor_id = $1 OR manufacturer_id = $1) AND active = true`,
        [userId]
      );
      for (const t of territoriesRes.rows) {
        let distQuery = `SELECT id FROM manage_b_to_b_userdetail WHERE active = true AND business_type_id = 3`;
        const params = [];
        if (t.pincode) {
          distQuery += ` AND pincode = $1`;
          params.push(t.pincode);
        } else if (t.city_id) {
          distQuery += ` AND fk_city = $1`;
          params.push(t.city_id);
        } else if (t.state_id) {
          distQuery += ` AND fk_state = $1`;
          params.push(t.state_id);
        }
        const distRes = await client.query(distQuery, params);
        shopIds = [...new Set([...shopIds, ...distRes.rows.map(r => r.id)])];
      }
    } else {
      // Default: send to all active distributors
      const distRes = await client.query('SELECT id FROM manage_b_to_b_userdetail WHERE active = true AND business_type_id = 3');
      shopIds = distRes.rows.map(r => r.id);
    }

    const targetCount = shopIds.length;

    // 2. Create the campaign entry
    const campaignInsert = await client.query(
      `INSERT INTO campaign_notifications (
        campaign_name, title, message, created_by, target_count, sent_count, targeting_type, target_ids, notification_type, target_role, target_audience
      ) VALUES ($1, $1, $2, $3, $4, $4, $5, $6, $7, $5, $5)
      RETURNING *`,
      [campaignName, message, userId, targetCount, targeting_type || 'all', JSON.stringify(targeting_values || null), notificationType]
    );

    const campaign = campaignInsert.rows[0];

    // 3. Insert campaign delivery records
    for (const shopId of shopIds) {
      // Record delivery
      await client.query(
        `INSERT INTO campaign_deliveries (campaign_id, shop_id, status)
         VALUES ($1, $2, 'Sent')`,
        [campaign.id, shopId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Campaign created and notifications queued successfully',
      data: campaign
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, message: 'Failed to create campaign', error: error.message, stack: error.stack });
  } finally {
    client.release();
  }
};

// Get campaigns sent by manufacturer/distributor
export const getCampaigns = async (req, res) => {
  const userId = req.user.userId;

  try {
    const query = `
      SELECT * FROM campaign_notifications
      WHERE created_by = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch campaigns' });
  }
};

// Get notifications received by a shop
export const getShopNotifications = async (req, res) => {
  const shopId = req.user.userId;

  try {
    const query = `
      SELECT cd.id as delivery_id, cd.status as delivery_status, cd.updated_at as received_at,
             cn.campaign_name as title, cn.message, cn.notification_type,
             u.company_name as sender_name,
             (cd.status = 'Read') as is_read
      FROM campaign_deliveries cd
      JOIN campaign_notifications cn ON cd.campaign_id = cn.id
      JOIN manage_b_to_b_userdetail u ON cn.created_by = u.id
      WHERE cd.shop_id = $1
      ORDER BY cd.updated_at DESC
    `;
    const result = await pool.query(query, [shopId]);
    res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        status: row.delivery_status === 'Read' ? 'READ' : 'UNREAD',
        created_at: row.received_at
      }))
    });
  } catch (error) {
    console.error('Get shop notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// Mark shop notification as read
export const readNotification = async (req, res) => {
  const shopId = req.user.userId;
  const { delivery_id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check delivery ownership
    const checkQuery = `
      SELECT campaign_id, status FROM campaign_deliveries
      WHERE id = $1 AND shop_id = $2
      FOR UPDATE
    `;
    const checkRes = await client.query(checkQuery, [delivery_id, shopId]);

    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const { campaign_id, status } = checkRes.rows[0];

    if (status !== 'Read') {
      // Update delivery status
      await client.query(
        `UPDATE campaign_deliveries
         SET status = 'Read', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [delivery_id]
      );

      // Increment campaign read_count
      await client.query(
        `UPDATE campaign_notifications
         SET read_count = read_count + 1
         WHERE id = $1`,
        [campaign_id]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Read notification error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  } finally {
    client.release();
  }
};
