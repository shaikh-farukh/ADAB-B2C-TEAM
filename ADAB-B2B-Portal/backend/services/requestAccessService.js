import crypto from 'crypto';
import pool from '../Config/database.js';

// Generate unique request ID
export const generateRequestId = () => {
  return `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

// Create access request
export const createAccessRequest = async (manufacturerId, distributorEmail, name, description) => {
  const uniqueRequestId = generateRequestId();

  const query = `
    INSERT INTO manage_b_to_b_request_access (
      manufacturer_id,
      email_distributer,
      name,
      description,
      unique_request_id,
      created_at,
      created_by,
      active
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $1, true)
    RETURNING *
  `;

  const result = await pool.query(query, [
    manufacturerId,
    distributorEmail,
    name,
    description,
    uniqueRequestId
  ]);

  return result.rows[0];
};

// Get all requests for a manufacturer
export const getManufacturerRequests = async (manufacturerId) => {
  const query = `
    SELECT * FROM manage_b_to_b_request_access
    WHERE manufacturer_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [manufacturerId]);
  return result.rows;
};

// Get request by ID
export const getRequestById = async (requestId, manufacturerId) => {
  const query = `
    SELECT * FROM manage_b_to_b_request_access
    WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
  `;

  const result = await pool.query(query, [requestId, manufacturerId]);
  return result.rows[0];
};

// Update request
export const updateAccessRequest = async (requestId, manufacturerId, updates) => {
  const allowedFields = ['email_distributer', 'name', 'description'];
  const updateData = {};

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return null;
  }

  const setClause = Object.keys(updateData)
    .map((key, index) => `${key} = ₹${index + 1}`)
    .join(', ');

  const values = [...Object.values(updateData), manufacturerId, requestId];

  const query = `
    UPDATE manage_b_to_b_request_access
    SET ${setClause}, modified_at = CURRENT_TIMESTAMP, modified_by = ₹${values.length - 1}
    WHERE id = ₹${values.length} AND manufacturer_id = ₹${values.length - 1} AND deleted_at IS NULL
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete request (soft delete)
export const deleteAccessRequest = async (requestId, manufacturerId) => {
  const query = `
    UPDATE manage_b_to_b_request_access
    SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
    WHERE id = $2 AND manufacturer_id = $1 AND deleted_at IS NULL
    RETURNING id
  `;

  const result = await pool.query(query, [manufacturerId, requestId]);
  return result.rows[0];
};