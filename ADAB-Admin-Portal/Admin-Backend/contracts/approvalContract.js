/**
 * Approval API Contract & DTO Definitions
 * Formal structure definitions for Day-2 Approval APIs (List, Approve, Reject, Request Changes, History, Counts)
 */

/**
 * Validates request contract for Approve action.
 */
function validateApproveDTO(body = {}) {
  const errors = [];
  if (body.notes && typeof body.notes !== 'string') {
    errors.push("'notes' must be a string if provided");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      notes: body.notes ? body.notes.trim() : null
    }
  };
}

/**
 * Validates request contract for Reject action.
 */
function validateRejectDTO(body = {}) {
  const errors = [];
  if (!body.rejection_reason || typeof body.rejection_reason !== 'string' || !body.rejection_reason.trim()) {
    errors.push("'rejection_reason' is required and must be a non-empty string");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      rejection_reason: body.rejection_reason ? body.rejection_reason.trim() : null,
      notes: body.notes ? body.notes.trim() : null
    }
  };
}

/**
 * Validates request contract for Request Changes action.
 */
function validateRequestChangesDTO(body = {}) {
  const errors = [];
  if (!body.notes || typeof body.notes !== 'string' || !body.notes.trim()) {
    errors.push("'notes' is required explaining the requested changes");
  }
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      notes: body.notes ? body.notes.trim() : null
    }
  };
}

/**
 * Standardized Approval Item DTO format
 */
function formatApprovalItemDTO(item = {}) {
  return {
    id: item.id || 'N/A',
    listing_id: item.listing_id || item.id || 'N/A',
    title: item.title || item.name || 'Untitled Listing',
    seller_id: item.seller_id || null,
    current_status: item.current_status || item.status || 'PENDING',
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString()
  };
}

/**
 * Standardized Approval History DTO format
 */
function formatApprovalHistoryDTO(record = {}) {
  return {
    id: record.id || 'N/A',
    listing_id: record.listing_id || 'N/A',
    admin_id: record.admin_id || null,
    previous_status: record.previous_status || 'UNKNOWN',
    new_status: record.new_status || 'UNKNOWN',
    rejection_reason: record.rejection_reason || null,
    notes: record.notes || null,
    action_at: record.action_at || new Date().toISOString()
  };
}

/**
 * Standardized Approval Counts DTO format
 */
function formatApprovalCountsDTO(counts = {}) {
  return {
    pending: Number(counts.pending) || 0,
    approved: Number(counts.approved) || 0,
    rejected: Number(counts.rejected) || 0,
    changes_requested: Number(counts.changes_requested) || 0,
    total: Number(counts.total) || 0
  };
}

module.exports = {
  validateApproveDTO,
  validateRejectDTO,
  validateRequestChangesDTO,
  formatApprovalItemDTO,
  formatApprovalHistoryDTO,
  formatApprovalCountsDTO
};
