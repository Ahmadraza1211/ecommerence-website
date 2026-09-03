import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../config/cloudinary';
import { env } from '../config/env';

export function buildUploader(folder: string) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `${env.CLOUDINARY_FOLDER_PREFIX}/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ width: 1200, crop: 'limit' }, { quality: 'auto' }],
    } as any,
  });
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  });
}
