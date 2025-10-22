import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Configure R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'quantumpips';
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Upload file to R2
export const uploadToR2 = async (
  file: Express.Multer.File,
  folder: string = 'kyc'
): Promise<string> => {
  try {
    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${randomUUID()}.${fileExtension}`;

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await r2Client.send(command);

    // Return public URL
    const fileUrl = `${PUBLIC_URL}/${fileName}`;
    return fileUrl;
  } catch (error) {
    console.error('R2 Upload Error:', error);
    throw new Error('Failed to upload file to storage');
  }
};

// Validate file type
export const validateFileType = (mimetype: string): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  return allowedTypes.includes(mimetype);
};

// Validate file size (max 5MB)
export const validateFileSize = (size: number): boolean => {
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  return size <= maxSize;
};