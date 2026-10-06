const {
  validateApproveDTO,
  validateRejectDTO,
  validateRequestChangesDTO,
  formatApprovalItemDTO,
  formatApprovalHistoryDTO,
  formatApprovalCountsDTO
} = require('../contracts/approvalContract');
const { transition, APPROVAL_STATES, ApprovalStateMachineError } = require('../services/approvalStateMachine');

/**
 * Approval API Contract Controller
 * Exposes contract handlers for Day-2 approval endpoints.
 */

// 1. Approval List / Read
async function getApprovalList(req, res) {
  const statusFilter = req.query.status || 'PENDING';
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const mockItems = [
    {
      id: 'list-101',
      listing_id: 'list-101',
      title: 'Organic Whole Milk 1L',
      seller_id: 'seller-55',
      current_status: statusFilter.toUpperCase(),
      created_at: new Date().toISOString()
    }
  ];

  return res.status(200).json({
    success: true,
    contractVersion: '1.0',
    pagination: { page, limit, total: mockItems.length },
    data: mockItems.map(formatApprovalItemDTO)
  });
}

// 2. Read Single Approval Item
async function getApprovalById(req, res) {
  const { id } = req.params;
  return res.status(200).json({
    success: true,
    contractVersion: '1.0',
    data: formatApprovalItemDTO({
      id,
      listing_id: id,
      title: 'Sample Moderation Item',
      current_status: APPROVAL_STATES.PENDING
    })
  });
}

// 3. Approve Action
async function approveItem(req, res) {
  const { id } = req.params;
  const validation = validateApproveDTO(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: 'INVALID_CONTRACT', errors: validation.errors });
  }

  const currentStatus = req.body.current_status || APPROVAL_STATES.PENDING;

  try {
    const transitionResult = transition(currentStatus, APPROVAL_STATES.APPROVED, {
      notes: validation.data.notes,
      listing_id: id,
      admin_id: req.user ? req.user.id : 'system'
    });

    req.auditPreviousState = transitionResult.previous_status;
    req.auditNewState = transitionResult.new_status;

    return res.status(200).json({
      success: true,
      message: `Item '${id}' successfully approved`,
      data: transitionResult
    });
  } catch (error) {
    if (error instanceof ApprovalStateMachineError) {
      return res.status(400).json({
        success: false,
        error: error.errorCode,
        message: error.message,
        details: error.details
      });
    }
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

// 4. Reject Action
async function rejectItem(req, res) {
  const { id } = req.params;
  const validation = validateRejectDTO(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: 'INVALID_CONTRACT', errors: validation.errors });
  }

  const currentStatus = req.body.current_status || APPROVAL_STATES.PENDING;

  try {
    const transitionResult = transition(currentStatus, APPROVAL_STATES.REJECTED, {
      rejection_reason: validation.data.rejection_reason,
      notes: validation.data.notes,
      listing_id: id,
      admin_id: req.user ? req.user.id : 'system'
    });

    req.auditPreviousState = transitionResult.previous_status;
    req.auditNewState = transitionResult.new_status;

    return res.status(200).json({
      success: true,
      message: `Item '${id}' rejected`,
      data: transitionResult
    });
  } catch (error) {
    if (error instanceof ApprovalStateMachineError) {
      return res.status(400).json({
        success: false,
        error: error.errorCode,
        message: error.message,
        details: error.details
      });
    }
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

// 5. Request Changes Action
async function requestChangesItem(req, res) {
  const { id } = req.params;
  const validation = validateRequestChangesDTO(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: 'INVALID_CONTRACT', errors: validation.errors });
  }

  const currentStatus = req.body.current_status || APPROVAL_STATES.PENDING;

  try {
    const transitionResult = transition(currentStatus, APPROVAL_STATES.CHANGES_REQUESTED, {
      notes: validation.data.notes,
      listing_id: id,
      admin_id: req.user ? req.user.id : 'system'
    });

    req.auditPreviousState = transitionResult.previous_status;
    req.auditNewState = transitionResult.new_status;

    return res.status(200).json({
      success: true,
      message: `Changes requested for item '${id}'`,
      data: transitionResult
    });
  } catch (error) {
    if (error instanceof ApprovalStateMachineError) {
      return res.status(400).json({
        success: false,
        error: error.errorCode,
        message: error.message,
        details: error.details
      });
    }
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
}

// 6. Approval History
async function getApprovalHistory(req, res) {
  const { id } = req.params;
  const historyRecords = [
    {
      id: 'hist-1',
      listing_id: id,
      admin_id: req.user ? req.user.id : 'admin-001',
      previous_status: APPROVAL_STATES.PENDING,
      new_status: APPROVAL_STATES.CHANGES_REQUESTED,
      notes: 'Clarify barcode and ingredients',
      action_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  return res.status(200).json({
    success: true,
    data: historyRecords.map(formatApprovalHistoryDTO)
  });
}

// 7. Approval Counts
async function getApprovalCounts(req, res) {
  return res.status(200).json({
    success: true,
    data: formatApprovalCountsDTO({
      pending: 12,
      approved: 145,
      rejected: 8,
      changes_requested: 5,
      total: 170
    })
  });
}

module.exports = {
  getApprovalList,
  getApprovalById,
  approveItem,
  rejectItem,
  requestChangesItem,
  getApprovalHistory,
  getApprovalCounts
};
