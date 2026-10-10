const adminDay5Service = require('../services/adminDay5Service');

class AdminDay5Controller {
  async getOffers(req, res) {
    try {
      const data = await adminDay5Service.getOffers();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch offers' });
    }
  }

  async getReportsSummary(req, res) {
    try {
      const data = await adminDay5Service.getReportsSummary();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch reports summary' });
    }
  }

  async getAuditLogs(req, res) {
    try {
      const data = await adminDay5Service.getAuditLogs();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
  }

  async getSettings(req, res) {
    try {
      const data = await adminDay5Service.getSettings();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
  }

  async updateSettings(req, res) {
    try {
      const data = await adminDay5Service.updateSettings(req.body);
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      if (error.message.startsWith('Invalid setting')) {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
  }
}

module.exports = new AdminDay5Controller();
