import pool from '../Config/database.js';

export const submitKYB = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { company_name, registration_number, tax_id, document_url } = req.body;

    if (!company_name || !document_url) {
      return res.status(400).json({ success: false, message: 'Company name and document URL are required' });
    }

    const checkExisting = await pool.query('SELECT * FROM manage_b2b_kyb_requests WHERE user_id = $1', [userId]);
    if (checkExisting.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'KYB request already submitted' });
    }

    const insertQuery = `
      INSERT INTO manage_b2b_kyb_requests (user_id, company_name, registration_number, tax_id, document_url)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, status
    `;

    const result = await pool.query(insertQuery, [userId, company_name, registration_number, tax_id, document_url]);

    res.status(201).json({
      success: true,
      message: 'KYB request submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit KYB', error: error.message });
  }
};

export const getKYBStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query('SELECT status, rejection_reason, submitted_at, reviewed_at FROM manage_b2b_kyb_requests WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, data: { status: 'unsubmitted' } });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch KYB status', error: error.message });
  }
};
