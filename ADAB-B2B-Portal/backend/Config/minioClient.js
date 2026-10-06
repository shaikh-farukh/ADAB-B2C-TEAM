import * as Minio from 'minio';
import dotenv from 'dotenv';
dotenv.config();

const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
const minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
const useSSL = process.env.MINIO_USE_SSL === 'true';
const accessKey = process.env.MINIO_ROOT_USER || 'minioadmin';
const secretKey = process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

export const BUCKET_NAME = process.env.MINIO_DEFAULT_BUCKET || 'adab-uploads';

export const minioClient = new Minio.Client({
  endPoint: minioEndpoint,
  port: minioPort,
  useSSL: useSSL,
  accessKey: accessKey,
  secretKey: secretKey,
});

/**
  Ensure default bucket exists.
 */
export const ensureBucketExists = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ [MinIO] Bucket '${BUCKET_NAME}' created successfully.`);
    } else {
      console.log(`ℹ️ [MinIO] Bucket '${BUCKET_NAME}' already exists.`);
    }

    // Set public read policy for adab-uploads bucket so image URLs are accessible
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
  } catch (error) {
    console.warn(`⚠️ [MinIO] Bucket verification/policy notice:`, error.message);
  }
};

// Initialize bucket check on module load
ensureBucketExists().catch((err) => console.error('MinIO Bucket Init Error:', err.message));

export default minioClient;
