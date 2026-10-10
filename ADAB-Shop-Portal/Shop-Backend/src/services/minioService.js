const Minio = require('minio');
const crypto = require('crypto');

// Initialize the MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'password123'
});

const BUCKET_NAME = 'adab-product-images';

// Ensure the bucket exists and is public readable on startup
const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ MinIO Bucket '${BUCKET_NAME}' created successfully.`);
      
      // Set the bucket policy to allow public read access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
          }
        ]
      };
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`✅ MinIO Bucket '${BUCKET_NAME}' is now public.`);
    } else {
      console.log(`✅ MinIO Bucket '${BUCKET_NAME}' already exists.`);
    }
  } catch (err) {
    console.error('❌ Error initializing MinIO:', err.message);
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
