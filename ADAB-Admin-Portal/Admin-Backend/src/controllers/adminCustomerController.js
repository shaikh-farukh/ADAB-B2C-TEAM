const customerService = require('../services/adminCustomerService');

exports.getCustomers = async (req, res) => {
  try {
    const data = await customerService.getCustomers();
    res.status(200).json({ success: true, data });
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
