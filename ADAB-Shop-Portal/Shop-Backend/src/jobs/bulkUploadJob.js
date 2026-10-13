const { Queue, Worker } = require('bullmq');
const fs = require('fs');
const csv = require('csv-parser');
const ListingRepository = require('../repositories/listing');
const Redis = require('ioredis');

// Connect to Redis (assuming default localhost:6379 for local dev)
const connection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    // Retry connection after 5 seconds
    return 5000;
  }
});

// Catch errors so the server doesn't crash or spam if Redis is unavailable locally
connection.on('error', (err) => {
  // Silencing the error to prevent console spam when Redis is not installed locally
});

// Create the Queue
const bulkUploadQueue = new Queue('bulk-upload-queue', { connection });
bulkUploadQueue.on('error', () => {});

// Create the Worker
const processCsvDirectly = async (storeId, filePath, userId) => {
  const results = [];
  
  let detectedHeaders = [];

  // Parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        detectedHeaders = headers.map(h => (h || '').trim().toLowerCase());
      })
      .on('data', (data) => results.push(data))
      .on('end', () => resolve())
      .on('error', (error) => reject(error));
  });

  // Verify format and required columns
  if (detectedHeaders.length === 0 || !detectedHeaders.includes('title') || (!detectedHeaders.includes('sell_price') && !detectedHeaders.includes('price'))) {
    try { fs.unlinkSync(filePath); } catch(e) {}
    throw new Error("Invalid CSV format: Missing required columns ('title', 'sell_price'). Please download and use the official CSV template.");
  }

  let successCount = 0;
  let failCount = 0;

  // Insert each listing
  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    
    // Skip completely empty rows (common when exporting from Excel)
    if (!row.title || row.title.trim() === '') {
      continue;
    }
    
    try {
      const sellPrice = parseFloat(row.sell_price || row.price) || 0;
      const mrp = parseFloat(row.mrp) || sellPrice;
      const categoryId = row.category_id ? parseInt(row.category_id, 10) : null;
      const rawType = (row.product_type || 'OWN_BRAND').trim().toUpperCase();
      const productType = ['OWN_BRAND', 'LOOSE_WEIGHT', 'PACKED_ITEM'].includes(rawType) ? rawType : 'OWN_BRAND';
      const defaultUnit = productType === 'LOOSE_WEIGHT' ? 'kg' : productType === 'PACKED_ITEM' ? 'pack' : 'pcs';

      await ListingRepository.createListing(storeId, {
        title: row.title.trim(),
        sku: productType === 'OWN_BRAND' ? (row.sku || null) : null,
        barcode: productType === 'PACKED_ITEM' ? (row.barcode || null) : null,
        brand_tag: productType !== 'LOOSE_WEIGHT' ? (row.brand_tag || null) : null,
        product_type: productType,
        category_id: categoryId,
        unit: row.unit ? row.unit.trim() : defaultUnit,
        mrp: mrp,
        sell_price: sellPrice,
        min_order_qty: row.min_order_qty ? parseFloat(row.min_order_qty) : 1,
        allowed_buyers: row.allowed_buyers || 'ALL',
        approval_status: 'DRAFT',
        is_active: true,
        stock_qty: parseInt(row.stock_qty, 10) || 0
      });
      successCount++;
    } catch (err) {
      console.error(`Failed to insert row ${i+1}: ${err.message}`);
      failCount++;
    }
  }

  // Cleanup file
  try { fs.unlinkSync(filePath); } catch(e) {}

  const result = { successCount, failCount, total: successCount + failCount };
  
  // Send synchronous notification if userId is provided
  if (userId) {
    const notificationService = require('../services/notification');
    await notificationService.createNotification(
      userId,
      'Bulk Upload Completed',
      `Processed ${result.total} items: ${result.successCount} successful, ${result.failCount} failed.`,
      'GENERAL'
    ).catch(e => console.error(e));
  }
  
  return result;
};

const worker = new Worker('bulk-upload-queue', async job => {
  const { storeId, filePath, userId } = job.data;
  await job.updateProgress(10);
  
  // Don't pass userId here so it doesn't duplicate the notification for BullMQ, we'll handle BullMQ below
  const result = await processCsvDirectly(storeId, filePath, null);
  
  await job.updateProgress(100);
  return result;
}, { connection });

worker.on('completed', async job => {
  console.log(`Job ${job.id} has completed with result ${JSON.stringify(job.returnvalue)}`);
  if (job.data.userId) {
    const notificationService = require('../services/notification');
    const result = job.returnvalue;
    await notificationService.createNotification(
      job.data.userId,
      'Bulk Upload Completed',
      `Processed ${result.total} items: ${result.successCount} successful, ${result.failCount} failed.`,
      'GENERAL'
    ).catch(e => console.error(e));
  }
});

worker.on('failed', async (job, err) => {
  console.log(`Job ${job.id} has failed with ${err.message}`);
  if (job && job.data && job.data.userId) {
    const notificationService = require('../services/notification');
    await notificationService.createNotification(
      job.data.userId,
      'Bulk Upload Failed',
      `Your bulk upload failed to process. Error: ${err.message}`,
      'GENERAL'
    ).catch(e => console.error(e));
  }
});

worker.on('error', err => {
  // Silence worker-level redis connection errors
});

module.exports = { bulkUploadQueue, processCsvDirectly, connection };
