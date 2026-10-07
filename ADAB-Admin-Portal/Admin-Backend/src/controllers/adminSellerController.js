const sellerService = require('../services/adminSellerService');

exports.getSellers = async (req, res) => {
  try {
    const data = await sellerService.getSellers();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getSellerDetails = async (req, res) => {
  try {
    const data = await sellerService.getSellerById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
