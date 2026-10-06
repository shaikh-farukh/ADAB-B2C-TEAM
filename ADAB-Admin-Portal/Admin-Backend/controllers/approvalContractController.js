const {
  validateApproveDTO,
  validateRejectDTO,
  validateRequestChangesDTO,
  formatApprovalItemDTO,
  formatApprovalHistoryDTO,
  formatApprovalCountsDTO
} = require('../contracts/approvalContract');
const { transition, APPROVAL_STATES, ApprovalStateMachineError } = require('../services/approvalStateMachine');
const {
  getApprovalQueue: fetchApprovalQueue,
  getApprovalItemById: fetchApprovalItemById,
  updateApprovalItemState,
  updateUserStatus: changeUserStatus
} = require('../services/approvalQueueService');

/**
 * Approval API & User Status Controller
 * Handlers for Approval Queue, State Machine Transitions, and Seller/Customer Status Updates.
 */

// 1. Approval Queue Listing
async function getApprovalQueue(req, res) {
  const result = await fetchApprovalQueue({
    status: req.query.status || 'PENDING',
    seller_id: req.query.seller_id,
    category_id: req.query.category_id,
    sort: req.query.sort || 'DESC',
    page: req.query.page || 1,
    limit: req.query.limit || 20
  });

  return res.status(200).json({
    success: true,
    contractVersion: '1.0',
    pagination: result.pagination,
    data: result.data.map(formatApprovalItemDTO)
  });
}

// 2. Read Single Approval Item with History
async function getApprovalById(req, res) {
  const { id } = req.params;
  const result = await fetchApprovalItemById(id);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: result.error || 'NOT_FOUND',
      message: result.message
    });
  }

  const formattedData = formatApprovalItemDTO(result.data);
  if (Array.isArray(result.data.history)) {
    formattedData.history = result.data.history.map(formatApprovalHistoryDTO);
  }

  return res.status(200).json({
    success: true,
    contractVersion: '1.0',
    data: formattedData
  });
}

// 3. Approve Item Action
async function approveItem(req, res) {
  const { id } = req.params;
  const validation = validateApproveDTO(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: 'INVALID_CONTRACT', errors: validation.errors });
  }

  const currentItemRes = await fetchApprovalItemById(id);
  const currentStatus = (currentItemRes.success && currentItemRes.data)
    ? currentItemRes.data.current_status || currentItemRes.data.status || APPROVAL_STATES.PENDING
    : req.body.current_status || APPROVAL_STATES.PENDING;

  try {
    const transitionResult = transition(currentStatus, APPROVAL_STATES.APPROVED, {
      notes: validation.data.notes,
      listing_id: id,
      admin_id: req.user ? req.user.id : 'system'
    });

    req.auditPreviousState = transitionResult.previous_status;
    req.auditNewState = transitionResult.new_status;

    await updateApprovalItemState({
      id,
      admin_id: req.user ? req.user.id : null,
      transitionResult
    });

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

// 4. Reject Item Action
async function rejectItem(req, res) {
  const { id } = req.params;
  const validation = validateRejectDTO(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: 'INVALID_CONTRACT', errors: validation.errors });
  }

  const currentItemRes = await fetchApprovalItemById(id);
  const currentStatus = (currentItemRes.success && currentItemRes.data)
    ? currentItemRes.data.current_status || currentItemRes.data.status || APPROVAL_STATES.PENDING
    : req.body.current_status || APPROVAL_STATES.PENDING;

  try {
    const transitionResult = transition(currentStatus, APPROVAL_STATES.REJECTED, {
      rejection_reason: validation.data.rejection_reason,
      notes: validation.data.notes,
      listing_id: id,
      admin_id: req.user ? req.user.id : 'system'
    });

    req.auditPreviousState = transitionResult.previous_status;
    req.auditNewState = transitionResult.new_status;

    await updateApprovalItemState({
      id,
      admin_id: req.user ? req.user.id : null,
      transitionResult
    });

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

  const currentItemRes = await fetchApprovalItemById(id);
  const currentStatus = (currentItemRes.success && currentItemRes.data)
    ? currentItemRes.data.current_status || currentItemRes.data.status || APPROVAL_STATES.PENDING
    : req.body.current_status || APPROVAL_STATES.PENDING;

  try {
    const transitionResult = transition(currentStatus, APPROVAL_STATES.CHANGES_REQUESTED, {
      notes: validation.data.notes,
      listing_id: id,
      admin_id: req.user ? req.user.id : 'system'
    });

    req.auditPreviousState = transitionResult.previous_status;
    req.auditNewState = transitionResult.new_status;

    await updateApprovalItemState({
      id,
      admin_id: req.user ? req.user.id : null,
      transitionResult
    });

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

// 6. Approval History Endpoint
async function getApprovalHistory(req, res) {
  const { id } = req.params;
  const result = await fetchApprovalItemById(id);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: result.error || 'NOT_FOUND',
      message: result.message
    });
  }

  const history = Array.isArray(result.data.history) ? result.data.history : [];
  return res.status(200).json({
    success: true,
    data: history.map(formatApprovalHistoryDTO)
  });
}

// 7. Approval Counts Endpoint
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

// 8. Seller / Customer User Status Authorization Endpoint
async function handleUserStatusUpdate(req, res) {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_CONTRACT',
      message: "Field 'status' is required"
    });
  }

  const result = await changeUserStatus({
    user_id: id,
    new_status: status,
    admin_id: req.user ? req.user.id : null,
    reason
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  req.auditPreviousState = 'UNKNOWN';
  req.auditNewState = status.toUpperCase();

  return res.status(200).json(result);
}

module.exports = {
  getApprovalList: getApprovalQueue,
  getApprovalQueue,
  getApprovalById,
  approveItem,
  rejectItem,
  requestChangesItem,
  getApprovalHistory,
  getApprovalCounts,
  handleUserStatusUpdate
};
