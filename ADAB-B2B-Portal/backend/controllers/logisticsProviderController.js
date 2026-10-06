import pool from '../Config/database.js';

export const createProvider = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { provider_name, contact_person, mobile, email, address, gst_number } = req.body;

    const dupCheck = await pool.query(`
      SELECT id FROM manage_b_to_b_logistics_providers
      WHERE owner_id = $1
        AND deleted_at IS NULL
        AND (LOWER(TRIM(provider_name)) = LOWER(TRIM($2)) OR (mobile IS NOT NULL AND TRIM(mobile) != '' AND TRIM(mobile) = TRIM($3)))
    `, [owner_id, provider_name, mobile || '']);

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Provider already exists' });
    }

    const query = `
      INSERT INTO manage_b_to_b_logistics_providers
        (owner_id, provider_name, contact_person, mobile, email, address, gst_number, active_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING *, CASE WHEN active_status THEN 'active' ELSE 'inactive' END as status;
    `;
    const result = await pool.query(query, [
      owner_id, provider_name, contact_person, mobile, email, address, gst_number
    ]);

    res.status(201).json({ success: true, message: 'Provider created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('createProvider error:', error);
    res.status(500).json({ success: false, message: 'Failed to create provider' });
  }
};

export const getProviders = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const query = `
      SELECT *, CASE WHEN active_status THEN 'active' ELSE 'inactive' END as status
      FROM manage_b_to_b_logistics_providers
      WHERE (owner_id = $1 OR owner_id = 2) AND deleted_at IS NULL
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query, [owner_id]);

    const providers = result.rows;

    res.status(200).json({ success: true, count: providers.length, data: providers });
  } catch (error) {
    console.error('getProviders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch providers' });
  }
};

export const getProviderById = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const query = `
      SELECT *, CASE WHEN active_status THEN 'active' ELSE 'inactive' END as status
      FROM manage_b_to_b_logistics_providers
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL;
    `;
    const result = await pool.query(query, [id, owner_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('getProviderById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch provider' });
  }
};

export const updateProvider = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const { provider_name, contact_person, mobile, email, address, gst_number } = req.body;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_logistics_providers WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's logistics provider, you cannot update it." });
    }

    const dupCheck = await pool.query(`
      SELECT id FROM manage_b_to_b_logistics_providers
      WHERE owner_id = $1
        AND id != $2
        AND deleted_at IS NULL
        AND (
          (provider_name IS NOT NULL AND LOWER(TRIM(provider_name)) = LOWER(TRIM($3))) OR
          (mobile IS NOT NULL AND TRIM(mobile) != '' AND TRIM(mobile) = TRIM($4))
        )
    `, [owner_id, id, provider_name || '', mobile || '']);

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Provider already exists' });
    }

    const query = `
      UPDATE manage_b_to_b_logistics_providers
      SET provider_name = COALESCE($1, provider_name),
          contact_person = COALESCE($2, contact_person),
          mobile = COALESCE($3, mobile),
          email = COALESCE($4, email),
          address = COALESCE($5, address),
          gst_number = COALESCE($6, gst_number),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND owner_id = $8 AND deleted_at IS NULL
      RETURNING *, CASE WHEN active_status THEN 'active' ELSE 'inactive' END as status;
    `;
    const result = await pool.query(query, [
      provider_name, contact_person, mobile, email, address, gst_number, id, owner_id
    ]);

    res.status(200).json({ success: true, message: 'Provider updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('updateProvider error:', error);
    res.status(500).json({ success: false, message: 'Failed to update provider' });
  }
};

export const toggleProviderStatus = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_logistics_providers WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's logistics provider, you cannot change its status." });
    }

    const isActive = status === 'active';
    const query = `
      UPDATE manage_b_to_b_logistics_providers
      SET active_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND owner_id = $3 AND deleted_at IS NULL
      RETURNING *, CASE WHEN active_status THEN 'active' ELSE 'inactive' END as status;
    `;
    const result = await pool.query(query, [isActive, id, owner_id]);

    res.status(200).json({ success: true, message: 'Provider status updated', data: result.rows[0] });
  } catch (error) {
    console.error('toggleProviderStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

export const deleteProvider = async (req, res) => {
  try {
    const owner_id = req.user.userId;
    const { id } = req.params;

    const checkRecord = await pool.query(
      `SELECT owner_id FROM manage_b_to_b_logistics_providers WHERE id = $1 AND deleted_at IS NULL;`,
      [id]
    );

    if (checkRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (String(checkRecord.rows[0].owner_id) !== String(owner_id)) {
      return res.status(403).json({ success: false, message: "This is a distributor's logistics provider, you cannot delete it." });
    }

    const query = `
      UPDATE manage_b_to_b_logistics_providers
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL
      RETURNING *;
    `;
    await pool.query(query, [id, owner_id]);

    res.status(200).json({ success: true, message: 'Provider deleted successfully' });
  } catch (error) {
    console.error('deleteProvider error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete provider' });
  }
};
