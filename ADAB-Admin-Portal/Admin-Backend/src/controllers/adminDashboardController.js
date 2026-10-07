const dashboardService = require('../services/adminDashboardService');

exports.getDashboard = async (req, res) => {
  try {
    const data = await dashboardService.getDashboardMetrics();
    res.status(200).json(data);
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};
