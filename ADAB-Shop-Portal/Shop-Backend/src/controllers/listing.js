const ListingService = require('../services/listing');
const minioService = require('../services/minioService');
const { getAuthenticatedSellerContext } = require('../middlewares/auth');

class ListingController {
  async createListing(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });
      
      const listing = await ListingService.createListing(storeId, req.body);
      res.status(201).json(listing);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async uploadImage(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });
      if (!req.file) return res.status(400).json({ error: 'No image file provided' });

      // upload to minio
      const url = await minioService.uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
      res.status(201).json({ url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getListings(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });

      const filters = {
        status: req.query.status,
        type: req.query.type,
        search: req.query.search,
        stock: req.query.stock,
        buyer: req.query.buyer,
        limit: req.query.limit ? parseInt(req.query.limit) : 50,
        offset: req.query.offset ? parseInt(req.query.offset) : 0
      };

      const result = await ListingService.getListings(storeId, filters);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getListingById(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });

      const listing = await ListingService.getListingById(storeId, req.params.id);
      res.json(listing);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }

  async updateListing(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });

      const listing = await ListingService.updateListing(storeId, req.params.id, req.body);
      res.json(listing);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteListing(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });

      await ListingService.deleteListing(storeId, req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async submitListing(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });

      const listing = await ListingService.submitListing(storeId, req.params.id);
      res.json(listing);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // Admin endpoint mock
  async adminStartReview(req, res) {
    try {
      const storeId = req.headers['x-store-id'];
      const listing = await ListingService.adminStartReview(storeId, req.params.id);
      res.json(listing);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async adminReview(req, res) {
    try {
      const storeId = req.headers['x-store-id']; // Normally admin wouldn't need this, but using it for simplicity
      const listing = await ListingService.adminReviewListing(
        storeId, 
        req.params.id, 
        req.body.status, 
        req.body.reason
      );
      res.json(listing);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async publishListing(req, res) {
    try {
      const storeId = req.headers['x-store-id'];
      const listing = await ListingService.publishListing(storeId, req.params.id);
      res.json(listing);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  // Shabbir's Missing Day 2 endpoints
  async getApprovalHistory(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });
      const history = await ListingService.getApprovalHistory(storeId, req.params.id);
      res.json(history);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async addDocument(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });
      const doc = await ListingService.addDocument(storeId, req.params.id, req.body);
      res.status(201).json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteImage(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });
      await ListingService.deleteImage(storeId, req.params.id, req.params.imageId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getListingIssues(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ success: false, error: 'Missing store context' });
      const issues = await ListingService.getListingIssues(storeId, req.params.id);
      res.json({ success: true, data: issues });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async bulkUpload(req, res) {
    try {
      const { storeId, userId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ success: false, error: 'Missing store context' });
      if (!req.file) return res.status(400).json({ success: false, error: 'CSV file is required' });

      const { bulkUploadQueue, processCsvDirectly, connection } = require('../jobs/bulkUploadJob');
      
      // If Redis is not running locally (development fallback), process directly
      if (connection.status !== 'ready') {
        console.log('Redis is offline. Processing CSV synchronously instead of via BullMQ...');
        const result = await processCsvDirectly(storeId, req.file.path, userId);
        return res.status(200).json({ 
          success: true, 
          message: 'Bulk upload completed synchronously', 
          result 
        });
      }

      const job = await bulkUploadQueue.add('bulk-upload-csv', {
        storeId,
        userId,
        filePath: req.file.path
      });

      res.status(202).json({ success: true, message: 'Bulk upload started', jobId: job.id });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getBulkUploadStatus(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ success: false, error: 'Missing store context' });

      const { bulkUploadQueue } = require('../jobs/bulkUploadJob');
      const job = await bulkUploadQueue.getJob(req.params.jobId);
      
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      const state = await job.getState();
      const progress = job.progress;
      const result = job.returnvalue;

      res.json({
        success: true,
        data: {
          id: job.id,
          state,
          progress,
          result
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async bulkExport(req, res) {
    try {
      const { storeId, userId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ success: false, error: 'Missing store context' });

      const pool = require('../../db');
      const query = `
        SELECT title, sku, barcode, mrp, sell_price, stock_qty 
        FROM seller_listings 
        WHERE store_id = $1
      `;
      const dbRes = await pool.query(query, [storeId]);
      
      const headers = ['title', 'sku', 'barcode', 'mrp', 'sell_price', 'stock_qty'];
      let csvContent = headers.join(",") + "\n";
      dbRes.rows.forEach(row => {
        csvContent += headers.map(h => {
          let val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          val = val.replace(/"/g, '""');
          return `"${val}"`;
        }).join(",") + "\n";
      });

      // Send the WebSocket Notification
      try {
        const notificationService = require('../services/notification');
        await notificationService.createNotification(
          userId,
          'Listing Export Completed',
          `Successfully exported ${dbRes.rows.length} listings to CSV.`,
          'GENERAL'
        );
      } catch (notifErr) {
        console.error('Failed to send export notification:', notifErr);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="listings_export.csv"');
      res.status(200).send(csvContent);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getBulkExportStatus(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ success: false, error: 'Missing store context' });

      const { getBulkExportJobStatus } = require('../jobs/bulkExportJob');
      const status = await getBulkExportJobStatus(req.params.jobId);
      
      if (!status) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      res.json({ success: true, data: status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ListingController();
