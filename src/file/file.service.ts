import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class FileService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'app_images',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed'));
          resolve(result);
        },
      );
      stream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }

  /**
   * Fire-and-forget deletion - returns immediately while deletion happens in background
   * Use this for faster API responses when you don't need confirmation
   */
  deleteImageAsync(publicId: string): void {
    cloudinary.uploader.destroy(publicId).catch((error) => {
      console.error(`Background delete failed for ${publicId}:`, error.message);
    });
  }

  /**
   * Bulk delete multiple images - more efficient than individual deletes
   */
  async deleteImagesInBulk(publicIds: string[]) {
    return cloudinary.api.delete_resources(publicIds);
  }
}
