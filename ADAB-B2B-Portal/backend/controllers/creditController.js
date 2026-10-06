import pool from '../Config/database.js';

// Set credit limit & days for a debtor relation
export const setCredit = async (req, res) => {
  const creditorId = req.user.userId;
  const creditorRole = req.user.role; // 'manufacturer' or 'distributor'
  const { debtor_id, debtor_type, credit_limit, credit_days } = req.body;
  const normalizedDebtorType = String(debtor_type || '').toLowerCase();
  const normalizedCreditLimit = Number(credit_limit);
  const normalizedCreditDays = Number(credit_days);

  if (!debtor_id || !normalizedDebtorType) {
    return res.status(400).json({ success: false, message: 'Debtor details are required' });
  }
  if (!['distributor', 'shop'].includes(normalizedDebtorType)) {
    return res.status(400).json({ success: false, message: 'Invalid debtor type' });
  }
  if (!Number.isFinite(normalizedCreditLimit) || normalizedCreditLimit < 0) {
    return res.status(400).json({ success: false, message: 'Credit limit cannot be negative' });
  }
  if (!Number.isInteger(normalizedCreditDays) || normalizedCreditDays < 0) {
    return res.status(400).json({ success: false, message: 'Credit days must be a valid non-negative integer' });
  }
  if (!['manufacturer', 'distributor'].includes(creditorRole)) {
    return res.status(403).json({ success: false, message: 'Only manufacturers or distributors can set credit terms' });
  }

  // Validate creditor-debtor roles:
  // Manufacturer can only credit Distributor. Distributor can only credit Shop.
  if (creditorRole === 'manufacturer' && normalizedDebtorType !== 'distributor') {
    return res.status(403).json({ success: false, message: 'Manufacturers can only set credit for distributors' });
  }
  if (creditorRole === 'distributor' && normalizedDebtorType !== 'shop') {
    return res.status(403).json({ success: false, message: 'Distributors can only set credit for shops' });
  }

  try {
    if (normalizedDebtorType === 'distributor') {
      const debtorCheck = await pool.query(
        `SELECT id FROM manage_b_to_b_userdetail
         WHERE id = $1
           AND business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
           AND deleted_at IS NULL`,
        [debtor_id]
      );

      if (debtorCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Distributor not found' });
      }
    } else {
      const debtorCheck = await pool.query(
        'SELECT id FROM shopdetail WHERE id = $1 AND delete_at IS NULL',
        [debtor_id]
      );

      if (debtorCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Shop not found' });
      }
    }

    const checkQuery = `
      SELECT id FROM relationship_credits
      WHERE creditor_id = $1 AND debtor_id = $2 AND debtor_type = $3
    `;
    const checkRes = await pool.query(checkQuery, [creditorId, debtor_id, normalizedDebtorType]);

    let result;
    if (checkRes.rows.length > 0) {
      const updateQuery = `
        UPDATE relationship_credits
        SET credit_limit = $1, credit_days = $2, modified_at = CURRENT_TIMESTAMP
        WHERE creditor_id = $3 AND debtor_id = $4 AND debtor_type = $5
        RETURNING *
      `;
      result = await pool.query(updateQuery, [normalizedCreditLimit, normalizedCreditDays, creditorId, debtor_id, normalizedDebtorType]);
    } else {
      const insertQuery = `
        INSERT INTO relationship_credits (creditor_id, debtor_id, debtor_type, credit_limit, credit_days)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [creditorId, debtor_id, normalizedDebtorType, normalizedCreditLimit, normalizedCreditDays]);
    }

    res.status(200).json({
      success: true,
      message: 'Credit settings updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Set credit error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Credit relationship already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to set credit limits' });
  }
};

// Get credit limits & status
export const getCredits = async (req, res) => {
  const userId = req.user.userId;
  const role = req.user.role;

  try {
    let result;
    if (role === 'manufacturer') {
      // Get all credits set by this manufacturer for distributors
      const query = `
        SELECT c.*, d.company_name as debtor_name, d.email as debtor_email
        FROM relationship_credits c
        JOIN manage_b_to_b_userdetail d ON c.debtor_id = d.id
        WHERE c.creditor_id = $1 AND c.debtor_type = 'distributor'
      `;
      result = await pool.query(query, [userId]);
    } else if (role === 'distributor') {
      // Get:
      // 1. Credits set by manufacturers for this distributor
      // 2. Credits set by this distributor for shops
      const manCredits = await pool.query(`
        SELECT c.*, m.company_name as creditor_name, m.email as creditor_email
        FROM relationship_credits c
        JOIN manage_b_to_b_userdetail m ON c.creditor_id = m.id
        WHERE c.debtor_id = $1 AND c.debtor_type = 'distributor'
      `, [userId]);

      const shopCredits = await pool.query(`
        SELECT c.*, s.shop_name as debtor_name, s.email_id as debtor_email
        FROM relationship_credits c
        JOIN shopdetail s ON c.debtor_id = s.id
        WHERE c.creditor_id = $1 AND c.debtor_type = 'shop'
      `, [userId]);

      return res.status(200).json({
        success: true,
        data: {
          received_credits: manCredits.rows,
          given_credits: shopCredits.rows
        }
      });
    } else if (role === 'shop') {
      // Get all credits set by distributors for this shop
      const query = `
        SELECT c.*, d.company_name as creditor_name, d.email as creditor_email
        FROM relationship_credits c
        JOIN manage_b_to_b_userdetail d ON c.creditor_id = d.id
        WHERE c.debtor_id = $1 AND c.debtor_type = 'shop'
      `;
      result = await pool.query(query, [userId]);
    }

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch credit settings' });
  }
};

export const getCreditBalance = async (req, res) => {
  const userId = req.user.userId;
  const role = req.user.role;
  try {
    const creditRes = await pool.query(
      `SELECT COALESCE(SUM(credit_limit), 0) as total_limit, COALESCE(SUM(outstanding_amount), 0) as used_balance
       FROM relationship_credits
       WHERE debtor_id = $1 AND debtor_type = $2`,
      [userId, role === 'distributor' ? 'distributor' : 'shop']
    );
    const totalLimit = parseFloat(creditRes.rows[0]?.total_limit || 0);
    const usedBalance = parseFloat(creditRes.rows[0]?.used_balance || 0);
    const availableCredit = Math.max(0, totalLimit - usedBalance);

    const invoicesRes = await pool.query(
      `SELECT i.id, i.invoice_number as order_number, COALESCE(m.company_name, 'ADAB Supplier') as manufacturer_name, i.total_amount, i.due_date as net_30_due_date
       FROM manage_b_to_b_invoices i
       LEFT JOIN manage_b_to_b_userdetail m ON i.manufacturer_id = m.id
       WHERE i.distributor_id = $1 AND (i.status IS NULL OR i.status != 'paid')`,
      [userId]
    );

    const now = new Date();
    const hasOverdueInvoices = invoicesRes.rows.some(inv => inv.net_30_due_date && new Date(inv.net_30_due_date) < now);

    res.status(200).json({
      success: true,
      data: {
        totalLimit,
        usedBalance,
        availableCredit,
        hasOverdueInvoices,
        invoices: invoicesRes.rows
      }
    });
  } catch (error) {
    console.error('Get credit balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch credit balance' });
  }
};

