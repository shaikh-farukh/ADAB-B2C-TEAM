const Minio = require('minio');
const crypto = require('crypto');

// Initialize the MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'password123'
});

const BUCKET_NAME = 'adab-product-images';

// Ensure the bucket exists and is public readable on startup
const initMinio = async () => {
  try {
    const buckets = [BUCKET_NAME, 'adab-uploads'];
    for (const b of buckets) {
      const exists = await minioClient.bucketExists(b);
      if (!exists) {
        await minioClient.makeBucket(b, 'us-east-1');
        console.log(`✅ MinIO Bucket '${b}' created successfully.`);
        
        // Set the bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${b}/*`]
            }
          ]
        };
        await minioClient.setBucketPolicy(b, JSON.stringify(policy));
        console.log(`✅ MinIO Bucket '${b}' is now public.`);
      } else {
        console.log(`✅ MinIO Bucket '${b}' connected successfully.`);
      }
    }
  } catch (err) {
    console.error('❌ Error initializing MinIO:', err.message || err.code || err);
  }
};

// Start initialization
initMinio();

/**
 * Upload a file buffer to MinIO
 * @param {Buffer} fileBuffer - The file data
 * @param {string} originalName - Original filename
 * @param {string} mimeType - The file mime type
 * @returns {Promise<string>} The public URL to the uploaded file
 */
const uploadImage = async (fileBuffer, originalName, mimeType) => {
  // Generate a unique filename using UUID or crypto random bytes
  const ext = originalName.split('.').pop() || 'jpg';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  
  const metaData = {
    'Content-Type': mimeType
  };
  
  await minioClient.putObject(BUCKET_NAME, fileName, fileBuffer, metaData);
  
  // Return the constructed public URL
  return `http://localhost:9000/${BUCKET_NAME}/${fileName}`;
};

module.exports = {
  uploadImage
};
