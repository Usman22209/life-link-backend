import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';

// Mock Cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

import { v2 as cloudinary } from 'cloudinary';

describe('FileService', () => {
  let service: FileService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Set environment variables
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-api-key';
    process.env.CLOUDINARY_API_SECRET = 'test-api-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileService],
    }).compile();

    service = module.get<FileService>(FileService);
  });

  afterEach(() => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should configure cloudinary on initialization', () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-api-key',
      api_secret: 'test-api-secret',
    });
  });

  // ==================== UPLOAD IMAGE TESTS ====================
  describe('uploadImage', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test image content'),
      size: 1024,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload image successfully', async () => {
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test-image.jpg',
        public_id: 'user_uploads/test-image',
        format: 'jpg',
        width: 800,
        height: 600,
      };

      // Mock upload_stream to call the callback with success
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          // Return a mock stream with end method
          return {
            end: jest.fn(() => {
              callback(null, mockUploadResult);
            }),
          };
        },
      );

      const result = await service.uploadImage(mockFile, 'user_uploads');

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { folder: 'user_uploads' },
        expect.any(Function),
      );
      expect(result).toEqual(mockUploadResult);
    });

    it('should use default folder when not specified', async () => {
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test-image.jpg',
        public_id: 'app_images/test-image',
      };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          return {
            end: jest.fn(() => {
              callback(null, mockUploadResult);
            }),
          };
        },
      );

      await service.uploadImage(mockFile);

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        { folder: 'app_images' },
        expect.any(Function),
      );
    });

    it('should reject when upload fails', async () => {
      const mockError = new Error('Upload failed');

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          return {
            end: jest.fn(() => {
              callback(mockError, null);
            }),
          };
        },
      );

      await expect(service.uploadImage(mockFile)).rejects.toThrow('Upload failed');
    });

    it('should reject when result is undefined', async () => {
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          return {
            end: jest.fn(() => {
              callback(null, undefined);
            }),
          };
        },
      );

      await expect(service.uploadImage(mockFile)).rejects.toThrow('Upload failed');
    });
  });

  // ==================== DELETE IMAGE TESTS ====================
  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const publicId = 'user_uploads/test-image';
      const mockDeleteResult = { result: 'ok' };

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await service.deleteImage(publicId);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(publicId);
      expect(result).toEqual(mockDeleteResult);
    });

    it('should return not found when image does not exist', async () => {
      const publicId = 'nonexistent/image';
      const mockDeleteResult = { result: 'not found' };

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await service.deleteImage(publicId);

      expect(result.result).toBe('not found');
    });

    it('should throw error when delete fails', async () => {
      const publicId = 'user_uploads/test-image';
      const mockError = new Error('Delete failed');

      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(mockError);

      await expect(service.deleteImage(publicId)).rejects.toThrow('Delete failed');
    });
  });
});
