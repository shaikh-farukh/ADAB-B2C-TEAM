const {
  validateApproveDTO,
  validateRejectDTO,
  validateRequestChangesDTO,
  validateSuspendDTO,
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

// 6. Suspend Item Action
async function suspendItem(req, res) {
  const { id } = req.params;
  const validation = validateSuspendDTO(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, error: 'INVALID_CONTRACT', errors: validation.errors });
  }

  const currentItemRes = await fetchApprovalItemById(id);
  const currentStatus = (currentItemRes.success && currentItemRes.data)
    ? currentItemRes.data.current_status || currentItemRes.data.status || APPROVAL_STATES.PENDING
    : req.body.current_status || APPROVAL_STATES.PENDING;

  try {
    const transitionResult = transition(currentStatus, APPROVAL_STATES.SUSPENDED, {
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
      message: `Item '${id}' suspended`,
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

// 7. General Listing Status Update Action (PATCH /products/:id/status or /listings/:id/status)
async function updateListingStatus(req, res) {
  const { id } = req.params;
  const { status, action, reason, rejection_reason, notes } = req.body;
  const targetAction = (action || status || '').toUpperCase();

  if (targetAction === 'APPROVE' || targetAction === 'APPROVED') {
    return approveItem(req, res);
  }
  if (targetAction === 'REJECT' || targetAction === 'REJECTED') {
    req.body.rejection_reason = rejection_reason || reason || req.body.rejection_reason;
    return rejectItem(req, res);
  }
  if (targetAction === 'REQUEST_CHANGES' || targetAction === 'CHANGES_REQUESTED') {
    req.body.notes = notes || reason || req.body.notes;
    return requestChangesItem(req, res);
  }
  if (targetAction === 'SUSPEND' || targetAction === 'SUSPENDED') {
    req.body.reason = reason || rejection_reason || req.body.reason;
    return suspendItem(req, res);
  }

  return res.status(400).json({
    success: false,
    error: 'INVALID_STATUS',
    message: `Invalid or unsupported status/action '${targetAction}'. Allowed: APPROVE, REJECT, REQUEST_CHANGES, SUSPEND`
  });
}

// 8. Approval History Endpoint (Supports GET /approvals/:id/history & GET /approvals/:type/:id/history)
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

// 9. Approval Counts Endpoint
async function getApprovalCounts(req, res) {
  const queueRes = await fetchApprovalQueue({ status: 'ALL', limit: 1000 });
  const items = queueRes.data || [];

  const counts = {
    pending: items.filter(i => (i.status || i.current_status) === 'PENDING').length,
    approved: items.filter(i => (i.status || i.current_status) === 'APPROVED').length,
    rejected: items.filter(i => (i.status || i.current_status) === 'REJECTED').length,
    changes_requested: items.filter(i => (i.status || i.current_status) === 'CHANGES_REQUESTED').length,
    suspended: items.filter(i => (i.status || i.current_status) === 'SUSPENDED').length,
    total: items.length
  };

  return res.status(200).json({
    success: true,
    data: formatApprovalCountsDTO(counts)
  });
}

// 10. Seller / Customer User Status Authorization Endpoint
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
  suspendItem,
  updateListingStatus,
  getApprovalHistory,
  getApprovalCounts,
  handleUserStatusUpdate
};
