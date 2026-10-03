import { validationResult } from 'express-validator';
import pool from '../Config/database.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { getIO } from '../Config/socket.js';

// Safe Socket.io event emitter helper
const emitSocketEvent = (room, event, data) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, data);
    }
  } catch (e) {
    logger.warn(`Socket emit failed for room ${room}, event ${event}: ${e.message}`);
  }
};

// ===== MANUFACTURER FUNCTIONS =====

// Get all requests received by manufacturer (from distributors) with pagination
export const getReceivedRequests = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    const { search, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    logger.info(`Fetching all distributors & invitation status for manufacturer: ${manufacturerId}`, { search, status, page, limit });

    // Base WHERE clause (only registered distributors)
    let baseWhere = `
      WHERE u.business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
        AND u.deleted_at IS NULL
    `;

    const queryParams = [manufacturerId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      baseWhere += ` AND u.company_name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter (normalize to support CONNECTED or APPROVED values)
    const normalizedStatus = String(status || '').trim().toUpperCase().replace(/\s+/g, '_');

    if (normalizedStatus && normalizedStatus !== 'ALL') {
      if (normalizedStatus === 'APPROVED' || normalizedStatus === 'CONNECTED') {
        baseWhere += ` AND r.manufacture_request = 1 AND r.distributer_request = 1`;
      } else if (normalizedStatus === 'PENDING') {
        baseWhere += ` AND (
          (r.manufacture_request = 1 AND r.distributer_request IS NULL)
          OR (r.manufacture_request IS NULL AND r.distributer_request = 1)
        )`;
      } else if (normalizedStatus === 'REJECTED') {
        baseWhere += ` AND (
          r.distributer_request = 0
          OR r.manufacture_request = 0
        )`;
      } else if (normalizedStatus === 'NOT_CONNECTED') {
        baseWhere += ` AND r.id IS NULL`;
      }
    }

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT u.id)
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_request_access r ON u.email = r.email_distributer AND r.manufacturer_id = $1 AND r.deleted_at IS NULL
      ${baseWhere}
    `;

    const countResult = await pool.query(countQuery, [manufacturerId, ...queryParams.slice(1)]);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated results for all individual requests/RFQs
    const selectQuery = `
      SELECT 
        u.id as distributor_id,
        u.company_name as distributor_name,
        u.company_name,
        u.email as email_distributer,
        u.country as region,
        r.id as request_id,
        r.manufacturer_id,
        r.created_at as request_date,
        r.manufacture_request,
        r.distributer_request,
        r.request_type,
        r.product_id,
        r.product_name,
        r.quantity,
        r.target_price,
        r.counter_price,
        r.deadline,
        r.description,
        r.negotiation_history,
        r.status as raw_status,
        CASE 
          WHEN r.id IS NULL THEN 'NOT_CONNECTED'
          WHEN r.manufacture_request = 1 AND r.distributer_request = 1 THEN 'CONNECTED'
          WHEN r.distributer_request = 0 OR r.manufacture_request = 0 THEN 'REJECTED'
          ELSE COALESCE(r.status, 'PENDING')
        END as status
      FROM manage_b_to_b_userdetail u
      LEFT JOIN manage_b_to_b_request_access r ON (u.id = r.distributor_id OR u.email = r.email_distributer) AND r.manufacturer_id = $1 AND r.deleted_at IS NULL
      ${baseWhere}
      ORDER BY r.created_at DESC NULLS LAST, u.company_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(selectQuery, queryParams);

    res.status(200).json({
      success: true,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      },
      data: result.rows.map(row => ({
        id: row.request_id || row.distributor_id,
        request_id: row.request_id,
        distributor_id: row.distributor_id,
        manufacturer_id: row.manufacturer_id || manufacturerId,
        distributor_name: row.distributor_name || row.company_name,
        company_name: row.company_name,
        email_distributer: row.email_distributer,
        region: row.region,
        request_date: row.request_date ? new Date(row.request_date).toLocaleDateString() : 'N/A',
        manufacture_request: row.manufacture_request,
        distributer_request: row.distributer_request,
        status: row.status,
        request_type: row.request_type,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
        target_price: row.target_price ? parseFloat(row.target_price) : null,
        counter_price: row.counter_price ? parseFloat(row.counter_price) : null,
        deadline: row.deadline,
        description: row.description,
        negotiation_history: row.negotiation_history
      }))
    });

  } catch (error) {
    logger.error('Get received requests error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests'
    });
  }
};

// Get single request details
export const getRequest = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Fetching partnership request. ID: ${id}, Manufacturer: ${manufacturerId}`);

    const query = `
      SELECT
        r.*,
        u.company_name,
        u.email as distributor_email,
        u.mobile as distributor_mobile,
        u.country,
        u.address,
        CASE
          WHEN r.manufacture_request = 1 AND r.distributer_request = 1 THEN 'APPROVED'
          WHEN r.distributer_request = 0 THEN 'REJECTED'
          ELSE 'PENDING'
        END as status
      FROM manage_b_to_b_request_access r
      LEFT JOIN manage_b_to_b_userdetail u ON r.email_distributer = u.email
      WHERE r.id = $1 AND r.manufacturer_id = $2 AND r.deleted_at IS NULL
    `;

    const result = await pool.query(query, [id, manufacturerId]);

    if (result.rows.length === 0) {
      logger.warn(`Request not found. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Get request details error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request'
    });
  }
};

// Accept request from distributor
export const acceptRequest = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Accepting partnership request. ID: ${id}, Manufacturer: ${manufacturerId}`);

    const query = `
      UPDATE manage_b_to_b_request_access
      SET manufacture_request = 1,
          status = 'APPROVED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND manufacturer_id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [manufacturerId, id]);

    if (result.rows.length === 0) {
      logger.warn(`Request not found for acceptance. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    logger.info(`Request accepted successfully. ID: ${id}`, { manufacturerId });

    res.status(200).json({
      success: true,
      message: 'Request accepted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Accept request error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to accept request'
    });
  }
};

// Reject request from distributor
export const rejectRequest = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Rejecting partnership request. ID: ${id}, Manufacturer: ${manufacturerId}`);

    const query = `
      UPDATE manage_b_to_b_request_access
      SET manufacture_request = 0,
          status = 'REJECTED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND manufacturer_id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [manufacturerId, id]);

    if (result.rows.length === 0) {
      logger.warn(`Request not found for rejection. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    logger.info(`Request rejected successfully. ID: ${id}`, { manufacturerId });

    res.status(200).json({
      success: true,
      message: 'Request rejected successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Reject request error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to reject request'
    });
  }
};

// ===== DISTRIBUTOR FUNCTIONS =====

// Send request to manufacturer
export const sendRequest = async (req, res) => {
  const distributorId = req.user.userId;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      manufacturer_id,
      description,
      target_price,
      quantity,
      product_id,
      product_name,
      deadline,
      request_type
    } = req.body;
    logger.info(`Distributor sending request. Distributor ID: ${distributorId}, Manufacturer ID: ${manufacturer_id}`);

    // Get distributor details
    const distributorQuery = await pool.query(
      'SELECT email, company_name FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }
    const distributor = distributorQuery.rows[0];

    // Check if manufacturer exists
    const manufacturerCheck = await pool.query(
      `SELECT id FROM manage_b_to_b_userdetail
       WHERE id = $1
         AND business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Manufacturer' LIMIT 1)
         AND deleted_at IS NULL`,
      [manufacturer_id]
    );

    if (manufacturerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found'
      });
    }

    // DAY 2: Handle RFQ Request Creation
    const isRFQ = target_price !== undefined || request_type === 'RFQ';
    if (isRFQ) {
      const parsedPrice = parseFloat(target_price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid positive target price is required for RFQ'
        });
      }

      const uniqueRequestId = `RFQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const initialHistory = [{
        sender_type: 'distributor',
        sender_id: distributorId,
        sender_name: distributor.company_name || 'Distributor',
        action: 'CREATE_RFQ',
        target_price: parsedPrice,
        notes: description || '',
        timestamp: new Date().toISOString()
      }];

      const insertQuery = `
        INSERT INTO manage_b_to_b_request_access (
          manufacturer_id,
          distributor_id,
          email_distributer,
          email_manufacturer,
          name,
          description,
          request_type,
          product_id,
          product_name,
          quantity,
          target_price,
          counter_price,
          negotiation_history,
          deadline,
          status,
          distributer_request,
          manufacture_request,
          unique_request_id,
          created_at,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'RFQ', $7, $8, $9, $10, NULL, $11::jsonb, $12, 'PENDING', 1, NULL, $13, CURRENT_TIMESTAMP, $2
        )
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        manufacturer_id,
        distributorId,
        distributor.email,
        manufacturerCheck.rows[0].email,
        product_name || req.body.name || 'RFQ Request',
        description || null,
        product_id ? parseInt(product_id) : null,
        product_name || req.body.name || 'Custom Quotation Request',
        quantity ? parseInt(quantity) : 1,
        parsedPrice,
        JSON.stringify(initialHistory),
        deadline ? new Date(deadline) : null,
        uniqueRequestId
      ]);

      const createdRFQ = result.rows[0];
      logger.info(`RFQ created successfully. ID: ${createdRFQ.id}`, { distributorId, manufacturer_id });

      // Real-time notification to manufacturer
      emitSocketEvent(`user_${manufacturer_id}`, 'RFQ_UPDATE', {
        type: 'RFQ_CREATED',
        requestId: createdRFQ.id,
        rfq: createdRFQ
      });

      return res.status(201).json({
        success: true,
        message: 'RFQ created successfully',
        data: createdRFQ
      });
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      `SELECT id, manufacture_request, distributer_request FROM manage_b_to_b_request_access
       WHERE manufacturer_id = $1 AND email_distributer = $2 AND deleted_at IS NULL`,
      [manufacturer_id, distributor.email]
    );

    if (existingRequest.rows.length > 0) {
      const existing = existingRequest.rows[0];
      const isApproved = existing.manufacture_request === 1 && existing.distributer_request === 1;

      if (isApproved) {
        return res.status(400).json({
          success: false,
          message: 'Already connected with this manufacturer'
        });
      }

      const isPending = existing.distributer_request === 1 && existing.manufacture_request === null;
      if (isPending) {
        return res.status(400).json({
          success: false,
          message: 'Connection request already sent and is pending'
        });
      }

      const uniqueRequestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const updateQuery = `
        UPDATE manage_b_to_b_request_access
        SET distributer_request = 1,
            manufacture_request = NULL,
            description = $1,
            unique_request_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, manufacturer_id, name, created_at
      `;

      const result = await pool.query(updateQuery, [
        description,
        uniqueRequestId,
        existing.id
      ]);

      return res.status(200).json({
        success: true,
        message: 'Connection request re-sent successfully',
        data: result.rows[0]
      });
    }

    const uniqueRequestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const query = `
      INSERT INTO manage_b_to_b_request_access (
        manufacturer_id,
        distributor_id,
        email_distributer,
        email_manufacturer,
        name,
        description,
        unique_request_id,
        manufacture_request,
        distributer_request,
        created_at,
        created_by,
        active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, 1, CURRENT_TIMESTAMP, $2, true)
      RETURNING id, manufacturer_id, name, created_at
    `;

    const result = await pool.query(query, [
      manufacturer_id,
      distributorId,
      distributor.email,
      manufacturerCheck.rows[0].email,
      distributor.company_name,
      description,
      uniqueRequestId
    ]);

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Send connection request error', error, { distributorId });
    res.status(500).json({
      success: false,
      message: 'Failed to send connection request'
    });
  }
};

// Send connection request to distributor (from manufacturer)
export const sendConnectionRequest = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { distributor_id, description } = req.body;
    logger.info(`Manufacturer sending connection request. Manufacturer ID: ${manufacturerId}, Distributor ID: ${distributor_id}`);

    // Check if distributor exists
    const distributorCheck = await pool.query(
      `SELECT id, company_name, email
       FROM manage_b_to_b_userdetail
       WHERE id = $1
         AND business_type_id = (SELECT id FROM manage_b_to_b_user_type WHERE typename = 'Distributor' LIMIT 1)
         AND deleted_at IS NULL`,
      [distributor_id]
    );

    if (distributorCheck.rows.length === 0) {
      logger.warn(`Send connection request failed: Distributor not found. ID: ${distributor_id}`);
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributor = distributorCheck.rows[0];

    // Get manufacturer details
    const manufacturerQuery = await pool.query(
      'SELECT email, company_name FROM manage_b_to_b_userdetail WHERE id = $1',
      [manufacturerId]
    );

    if (manufacturerQuery.rows.length === 0) {
      logger.warn(`Send connection request failed: Manufacturer not found. ID: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found'
      });
    }

    const manufacturer = manufacturerQuery.rows[0];

    // Check if request already exists
    const existingRequest = await pool.query(
      `SELECT id, manufacture_request, distributer_request FROM manage_b_to_b_request_access
       WHERE manufacturer_id = $1 AND email_distributer = $2 AND deleted_at IS NULL`,
      [manufacturerId, distributor.email]
    );

    if (existingRequest.rows.length > 0) {
      const existing = existingRequest.rows[0];
      const isApproved = existing.manufacture_request === 1 && existing.distributer_request === 1;

      if (isApproved) {
        return res.status(400).json({
          success: false,
          message: 'Already connected with this distributor'
        });
      }

      const isPending = existing.manufacture_request === 1 && existing.distributer_request === null;
      if (isPending) {
        return res.status(400).json({
          success: false,
          message: 'Connection request already sent and is pending'
        });
      }

      // If rejected (distributer_request = 0) or rejected by manufacturer (manufacture_request = 0), allow re-sending
      const uniqueRequestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const updateQuery = `
        UPDATE manage_b_to_b_request_access
        SET manufacture_request = 1,
            distributer_request = NULL,
            description = $1,
            unique_request_id = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, manufacturer_id, name, created_at
      `;

      const result = await pool.query(updateQuery, [
        description,
        uniqueRequestId,
        existing.id
      ]);

      logger.info(`Connection request re-sent successfully. ID: ${existing.id}`);

      return res.status(200).json({
        success: true,
        message: 'Connection request re-sent successfully',
        data: result.rows[0]
      });
    }

    const uniqueRequestId = `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const query = `
      INSERT INTO manage_b_to_b_request_access (
        manufacturer_id,
        distributor_id,
        email_distributer,
        email_manufacturer,
        name,
        description,
        unique_request_id,
        manufacture_request,
        distributer_request,
        created_at,
        created_by,
        active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NULL, CURRENT_TIMESTAMP, $1, true)
      RETURNING id, manufacturer_id, name, created_at
    `;

    const result = await pool.query(query, [
      manufacturerId,
      distributor_id,
      distributor.email,
      manufacturer.email,
      manufacturer.company_name,
      description,
      uniqueRequestId
    ]);

    logger.info(`Connection request sent successfully. ID: ${result.rows[0].id}`);

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Send connection request error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to send connection request'
    });
  }
};

// Accept request from manufacturer (by distributor)
export const acceptRequestDistributor = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Distributor accepting connection request. ID: ${id}, Distributor: ${distributorId}`);

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    const query = `
      UPDATE manage_b_to_b_request_access
      SET distributer_request = 1,
          distributor_id = COALESCE(distributor_id, $3),
          status = 'APPROVED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND email_distributer = $2 AND manufacture_request = 1 AND distributer_request IS NULL AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [id, distributorEmail, distributorId]);

    if (result.rows.length === 0) {
      logger.warn(`Request not found for acceptance. ID: ${id}, Distributor: ${distributorId}`);
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    logger.info(`Request accepted successfully by distributor. ID: ${id}`, { distributorId });

    res.status(200).json({
      success: true,
      message: 'Connection request accepted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Accept request error for distributor. ID: ${id}`, error, { distributorId });
    res.status(500).json({
      success: false,
      message: 'Failed to accept request'
    });
  }
};

// Reject request from manufacturer (by distributor)
export const rejectRequestDistributor = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Distributor rejecting connection request. ID: ${id}, Distributor: ${distributorId}`);

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    const query = `
      UPDATE manage_b_to_b_request_access
      SET distributer_request = 0,
          distributor_id = COALESCE(distributor_id, $3),
          status = 'REJECTED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND email_distributer = $2 AND manufacture_request = 1 AND distributer_request IS NULL AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, [id, distributorEmail, distributorId]);

    if (result.rows.length === 0) {
      logger.warn(`Request not found for rejection. ID: ${id}, Distributor: ${distributorId}`);
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    logger.info(`Request rejected successfully by distributor. ID: ${id}`, { distributorId });

    res.status(200).json({
      success: true,
      message: 'Connection request rejected successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Reject request error for distributor. ID: ${id}`, error, { distributorId });
    res.status(500).json({
      success: false,
      message: 'Failed to reject request'
    });
  }
};

// Get request status (for "Request Status" page)
export const getRequestStatus = async (req, res) => {
  const distributorId = req.user.userId;
  try {
    logger.info(`Fetching request statuses for distributor: ${distributorId}`);

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      logger.warn(`Distributor not found. ID: ${distributorId}`);
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    const query = `
      SELECT
        r.id,
        r.id as request_id,
        r.manufacturer_id,
        r.distributor_id,
        r.request_type,
        r.product_id,
        r.product_name,
        r.quantity,
        r.target_price,
        r.counter_price,
        r.deadline,
        r.description,
        r.negotiation_history,
        r.unique_request_id,
        r.distributer_request,
        r.manufacture_request,
        u.company_name as manufacturer_name,
        u.country as region,
        r.created_at as request_date,
        CASE
          WHEN r.manufacture_request = 1 AND r.distributer_request = 1 THEN 'APPROVED'
          WHEN r.distributer_request = 0 OR r.manufacture_request = 0 THEN 'REJECTED'
          WHEN r.status = 'COUNTERED' THEN 'PENDING'
          ELSE COALESCE(r.status, 'PENDING')
        END as current_status
      FROM manage_b_to_b_request_access r
      LEFT JOIN manage_b_to_b_userdetail u ON r.manufacturer_id = u.id
      WHERE (r.email_distributer = $1 OR r.distributor_id = $2) AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [distributorEmail, distributorId]);

    // Count statistics
    const stats = {
      total_requests: result.rows.length,
      pending: result.rows.filter(r => r.current_status === 'PENDING').length,
      approved: result.rows.filter(r => r.current_status === 'APPROVED').length,
      rejected: result.rows.filter(r => r.current_status === 'REJECTED').length
    };

    res.status(200).json({
      success: true,
      count: result.rows.length,
      stats: stats,
      data: result.rows.map(row => ({
        id: row.id,
        request_id: row.id,
        manufacturer_id: row.manufacturer_id,
        distributor_id: row.distributor_id,
        manufacturer_name: row.manufacturer_name,
        region: row.region,
        request_date: row.request_date,
        current_status: row.current_status,
        status: row.current_status,
        request_type: row.request_type,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
        target_price: row.target_price ? parseFloat(row.target_price) : null,
        counter_price: row.counter_price ? parseFloat(row.counter_price) : null,
        deadline: row.deadline,
        description: row.description,
        negotiation_history: row.negotiation_history,
        unique_request_id: row.unique_request_id
      }))
    });

  } catch (error) {
    logger.error('Get request status error', error, { distributorId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request status'
    });
  }
};

// Get single request details (distributor view)
export const getRequestDetails = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Fetching request details. ID: ${id}, Distributor: ${distributorId}`);

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      logger.warn(`Distributor not found. ID: ${distributorId}`);
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    const query = `
      SELECT
        r.*,
        u.company_name as manufacturer_company_name,
        u.email as manufacturer_email,
        u.mobile as manufacturer_mobile,
        u.country,
        CASE
          WHEN r.manufacture_request = 1 AND r.distributer_request = 1 THEN 'APPROVED'
          WHEN r.distributer_request = 0 THEN 'REJECTED'
          ELSE 'PENDING'
        END as current_status
      FROM manage_b_to_b_request_access r
      LEFT JOIN manage_b_to_b_userdetail u ON r.manufacturer_id = u.id
      WHERE r.id = $1 AND r.email_distributer = $2 AND r.deleted_at IS NULL
    `;

    const result = await pool.query(query, [id, distributorEmail]);

    if (result.rows.length === 0) {
      logger.warn(`Request not found. ID: ${id}, Distributor: ${distributorId}`);
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Get request details error. ID: ${id}`, error, { distributorId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request details'
    });
  }
};

// ===== DAY 2 RFQ NEGOTIATION FUNCTIONS =====

/**
 * Manufacturer submits a counter-offer to an RFQ.
 * Route: PUT /api/manufacturer/requests/:id/counter
 */
export const counterOfferRFQ = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { counter_price, notes, deadline } = req.body;

  try {
    const parsedPrice = parseFloat(counter_price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive counter-offer price is required'
      });
    }

    logger.info(`Manufacturer submitting counter-offer on RFQ. ID: ${id}, Manufacturer: ${manufacturerId}, Price: ${parsedPrice}`);

    // Fetch existing request
    const existing = await pool.query(
      `SELECT r.*, u.company_name as mfg_name
       FROM manage_b_to_b_request_access r
       LEFT JOIN manage_b_to_b_userdetail u ON u.id = $1
       WHERE r.id = $2 AND r.manufacturer_id = $1 AND r.deleted_at IS NULL`,
      [manufacturerId, id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RFQ request not found or unauthorized'
      });
    }

    const rfq = existing.rows[0];

    if (rfq.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot counter-offer: Quote has already been accepted'
      });
    }

    if (rfq.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot counter-offer: Quote has been rejected'
      });
    }

    // Append to negotiation history
    let history = rfq.negotiation_history || [];
    if (typeof history === 'string') {
      try { history = JSON.parse(history); } catch (e) { history = []; }
    }

    history.push({
      sender_type: 'manufacturer',
      sender_id: manufacturerId,
      sender_name: rfq.mfg_name || 'Manufacturer',
      action: 'COUNTER_OFFER',
      counter_price: parsedPrice,
      notes: notes || '',
      deadline: deadline ? new Date(deadline).toISOString() : rfq.deadline,
      timestamp: new Date().toISOString()
    });

    const updateQuery = `
      UPDATE manage_b_to_b_request_access
      SET counter_price = $1,
          status = 'COUNTERED',
          deadline = COALESCE($2, deadline),
          negotiation_history = $3::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND manufacturer_id = $4 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      parsedPrice,
      deadline ? new Date(deadline) : null,
      JSON.stringify(history),
      manufacturerId,
      id
    ]);

    const updatedRFQ = result.rows[0];

    // Real-time notification: emit RFQ_COUNTER_OFFER as specifically required
    const eventPayload = {
      type: 'RFQ_COUNTER_OFFER',
      requestId: updatedRFQ.id,
      counter_price: updatedRFQ.counter_price,
      target_price: updatedRFQ.target_price,
      deadline: updatedRFQ.deadline,
      negotiation_history: updatedRFQ.negotiation_history,
      status: updatedRFQ.status,
      rfq: updatedRFQ
    };

    // 1. Notify distributor's room user_${distributor_id}
    if (updatedRFQ.distributor_id) {
      emitSocketEvent(`user_${updatedRFQ.distributor_id}`, 'RFQ_COUNTER_OFFER', eventPayload);
      emitSocketEvent(`user_${updatedRFQ.distributor_id}`, 'RFQ_UPDATE', eventPayload);
    }

    // 2. Notify manufacturer's room
    emitSocketEvent(`user_${manufacturerId}`, 'RFQ_UPDATE', eventPayload);

    logger.info(`Counter-offer submitted successfully on RFQ ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Counter-offer submitted successfully',
      data: updatedRFQ
    });

  } catch (error) {
    logger.error(`Counter-offer error on RFQ ID: ${id}`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit counter-offer'
    });
  }
};

/**
 * Distributor responds to an RFQ/quote (Accept or Reject).
 * Route: POST /api/distributor/requests/:id/respond
 */
export const respondRFQ = async (req, res) => {
  const distributorId = req.user.userId;
  const { id } = req.params;
  const { action, notes } = req.body;

  try {
    const normalizedAction = String(action || '').trim().toUpperCase();
    if (!['ACCEPT', 'REJECT'].includes(normalizedAction)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either ACCEPT or REJECT'
      });
    }

    logger.info(`Distributor responding to RFQ. ID: ${id}, Distributor: ${distributorId}, Action: ${normalizedAction}`);

    // Fetch distributor details
    const distributorQuery = await pool.query(
      'SELECT email, company_name FROM manage_b_to_b_userdetail WHERE id = $1',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }
    const distributor = distributorQuery.rows[0];

    const existing = await pool.query(
      `SELECT * FROM manage_b_to_b_request_access
       WHERE id = $1
         AND (distributor_id = $2 OR email_distributer = $3)
         AND deleted_at IS NULL`,
      [id, distributorId, distributor.email]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'RFQ request not found or unauthorized'
      });
    }

    const rfq = existing.rows[0];

    if (rfq.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'RFQ has already been accepted'
      });
    }

    if (rfq.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'RFQ has already been rejected'
      });
    }

    const isAccept = normalizedAction === 'ACCEPT';
    const newStatus = isAccept ? 'ACCEPTED' : 'REJECTED';

    // Append to negotiation history
    let history = rfq.negotiation_history || [];
    if (typeof history === 'string') {
      try { history = JSON.parse(history); } catch (e) { history = []; }
    }

    history.push({
      sender_type: 'distributor',
      sender_id: distributorId,
      sender_name: distributor.company_name || 'Distributor',
      action: newStatus,
      agreed_price: isAccept ? (rfq.counter_price || rfq.target_price) : null,
      notes: notes || '',
      timestamp: new Date().toISOString()
    });

    const updateQuery = `
      UPDATE manage_b_to_b_request_access
      SET status = $1,
          distributer_request = $2,
          manufacture_request = $3,
          distributor_id = COALESCE(distributor_id, $4),
          negotiation_history = $5::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      newStatus,
      isAccept ? 1 : 0,
      isAccept ? 1 : 0,
      distributorId,
      JSON.stringify(history),
      id
    ]);

    const updatedRFQ = result.rows[0];

    // Real-time notification
    const eventPayload = {
      type: isAccept ? 'RFQ_ACCEPTED' : 'RFQ_REJECTED',
      requestId: updatedRFQ.id,
      status: updatedRFQ.status,
      negotiation_history: updatedRFQ.negotiation_history,
      rfq: updatedRFQ
    };

    // Notify manufacturer's room
    emitSocketEvent(`user_${updatedRFQ.manufacturer_id}`, 'RFQ_UPDATE', eventPayload);
    // Notify distributor's room
    emitSocketEvent(`user_${distributorId}`, 'RFQ_UPDATE', eventPayload);

    logger.info(`RFQ ${newStatus} successfully. ID: ${id}`);

    return res.status(200).json({
      success: true,
      message: isAccept ? 'Quote accepted successfully' : 'Quote rejected successfully',
      data: updatedRFQ
    });

  } catch (error) {
    logger.error(`Respond to RFQ error on ID: ${id}`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to respond to RFQ'
    });
  }
};

export const createRFQ = sendRequest;