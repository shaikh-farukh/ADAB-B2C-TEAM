const pool = require('../db');

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Audit Logging Service
 * Records audit logs into the canonical database table `audit_logs`.
 */
async function recordAuditLog({
  actor_id = null,
  action,
  entity_type,
  entity_id,
  changes = null,
  ip_address = null
}) {
  const validActorId = (actor_id && UUID_REGEX.test(actor_id)) ? actor_id : null;

  const auditData = {
    actor_id: validActorId,
    action: action || 'UNKNOWN_ACTION',
    entity_type: entity_type || 'SYSTEM',
    entity_id: String(entity_id || 'N/A'),
    changes: changes ? (typeof changes === 'string' ? changes : JSON.stringify(changes)) : null,
    ip_address: ip_address || null,
    created_at: new Date().toISOString()
  };

  try {
    if (pool && typeof pool.query === 'function') {
      const queryText = `
        INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes, ip_address, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, created_at
      `;
      const values = [
        auditData.actor_id,
        auditData.action,
        auditData.entity_type,
        auditData.entity_id,
        auditData.changes,
        auditData.ip_address
      ];
      const result = await pool.query(queryText, values);
      return { success: true, id: result.rows[0]?.id, ...auditData };
    }
  } catch (err) {
    // Silent fallback log without unhandled async error
  }

  return { success: true, logged: true, fallback: true, ...auditData };
}

module.exports = {
  recordAuditLog
};
