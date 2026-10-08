const returnService = require('../services/adminReturnService');

async function getReturns(req, res) {
  try {
    const { search, status, exceptions, page, limit } = req.query;
    const result = await returnService.getAdminReturns({
      search,
      status,
      exceptions,
      page: page || 1,
      limit: limit || 20
    });

    return res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching admin returns:', error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to fetch returns: ' + error.message
    });
  }
}

async function getReturnById(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'Return ID is required' });
    }

    const returnRecord = await returnService.getAdminReturnById(id);
    if (!returnRecord) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: `Return #${id} not found` });
    }

    return res.status(200).json({
      success: true,
      data: returnRecord
    });
  } catch (error) {
    console.error('Error fetching admin return details:', error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to fetch return details: ' + error.message
    });
  }
}

async function resolveReturn(req, res) {
  try {
    const { id } = req.params;
    const { action, rejection_reason, notes } = req.body;

    if (!id || !action) {
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Return ID and resolution action (approve/reject) are required'
      });
    }

    if (action === 'reject' && (!rejection_reason || !rejection_reason.trim())) {
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Rejection reason is required when rejecting a return request'
      });
    }

    const adminId = req.user ? req.user.id : null;
    const result = await returnService.resolveReturn(id, {
      action,
      rejection_reason,
      notes,
      admin_id: adminId
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'RESOLUTION_FAILED',
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error resolving return request:', error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to resolve return request: ' + error.message
    });
  }
}

module.exports = {
  getReturns,
  getReturnById,
  resolveReturn
};
