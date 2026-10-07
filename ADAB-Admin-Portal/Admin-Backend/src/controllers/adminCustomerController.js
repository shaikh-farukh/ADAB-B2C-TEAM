const customerService = require('../services/adminCustomerService');

exports.getCustomers = async (req, res) => {
  try {
    const data = await customerService.getCustomers(req.query);
    res.status(200).json({ success: true, data: data.data, meta: { total: data.total, page: data.page, pageSize: data.pageSize } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getCustomerDetails = async (req, res) => {
  try {
    const data = await customerService.getCustomerById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
    const data = await customerService.updateCustomerStatus(req.params.id, status);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
