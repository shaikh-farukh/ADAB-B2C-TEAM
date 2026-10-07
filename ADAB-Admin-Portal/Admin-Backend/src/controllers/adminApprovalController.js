const approvalService = require('../services/adminApprovalService');

exports.getApprovals = async (req, res) => {
  try {
    const { type } = req.query; // 'seller', 'customer', 'product'
    if (!type) return res.status(400).json({ success: false, message: 'Type is required' });
    
    const data = await approvalService.getPendingApprovals(type, req.query);
    res.status(200).json({ success: true, data: data.data, meta: { total: data.total, page: data.page, pageSize: data.pageSize } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateApproval = async (req, res) => {
  try {
    const { type, action } = req.body;
    if (!type || !action) return res.status(400).json({ success: false, message: 'Type and action are required' });
    
    const data = await approvalService.updateApprovalStatus(type, req.params.id, action);
    if (!data) return res.status(404).json({ success: false, message: 'Not found or failed to update' });
    
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
