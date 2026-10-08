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
const processCsvDirectly = async (storeId, filePath) => {
  const results = [];
  
  // Parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve())
      .on('error', (error) => reject(error));
  });

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
      await ListingRepository.createListing(storeId, {
        title: row.title,
        sku: row.sku || '',
        barcode: row.barcode || '',
        brand_tag: row.brand_tag || 'GENERIC',
        product_type: row.product_type || 'OWN_BRAND',
        unit: row.unit || '',
        mrp: parseFloat(row.mrp) || 0,
        sell_price: parseFloat(row.sell_price) || 0,
        min_order_qty: row.min_order_qty ? parseFloat(row.min_order_qty) : null,
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

  return { successCount, failCount, total: successCount + failCount };
};

const worker = new Worker('bulk-upload-queue', async job => {
  const { storeId, filePath } = job.data;
  await job.updateProgress(10);
  
  const result = await processCsvDirectly(storeId, filePath);
  
  await job.updateProgress(100);
  return result;
}, { connection });

worker.on('completed', job => {
  console.log(`Job ${job.id} has completed with result ${JSON.stringify(job.returnvalue)}`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} has failed with ${err.message}`);
});

worker.on('error', err => {
  // Silence worker-level redis connection errors
});

module.exports = { bulkUploadQueue, processCsvDirectly, connection };
