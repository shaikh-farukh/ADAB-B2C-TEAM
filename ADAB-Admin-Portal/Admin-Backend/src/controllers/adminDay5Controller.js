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
      const result = await adminDay5Service.getAuditLogs(req.query);
      res.json({
        success: true,
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        },
        meta: {
          page: result.page,
          pageSize: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
  }

  async getAuditLogByEntity(req, res) {
    try {
      const { type, id } = req.params;
      const data = await adminDay5Service.getAuditLogByEntity(type, id);
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch entity audit log' });
    }
  }

  async getSalesReport(req, res) {
    try {
      const data = await adminDay5Service.getSalesReport();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch sales report' });
    }
  }

  async getOrdersReport(req, res) {
    try {
      const data = await adminDay5Service.getOrdersReport();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch orders report' });
    }
  }

  async getReturnsReport(req, res) {
    try {
      const data = await adminDay5Service.getReturnsReport();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch returns report' });
    }
  }

  async getReviewsReport(req, res) {
    try {
      const data = await adminDay5Service.getReviewsReport();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch reviews report' });
    }
  }

  async getSellersReport(req, res) {
    try {
      const data = await adminDay5Service.getSellersReport();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch sellers report' });
    }
  }

  async getCustomersReport(req, res) {
    try {
      const data = await adminDay5Service.getCustomersReport();
      res.json({ success: true, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch customers report' });
    }
  }

  async exportReport(req, res) {
    try {
      const { report_type = 'sales' } = req.body || {};
      const data = await adminDay5Service.exportReport(report_type);
      res.json({ success: true, message: 'Report exported successfully', download_url: null, data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to export report' });
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
