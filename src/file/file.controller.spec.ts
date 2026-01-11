import { Test, TestingModule } from '@nestjs/testing';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { AuthGuard } from '../auth/auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

// Mock FileService
const mockFileService = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
};

describe('FileController', () => {
  let controller: FileController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FileController],
      providers: [
        {
          provide: FileService,
          useValue: mockFileService,
        },
        {
          provide: SupabaseService,
          useValue: { client: {} },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FileController>(FileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    it('should return success with url and publicId on successful upload', async () => {
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test-image.jpg',
        public_id: 'user_uploads/test-image',
      };
      mockFileService.uploadImage.mockResolvedValue(mockUploadResult);

      const result = await controller.uploadImage(mockFile);

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockUploadResult.secure_url);
      expect(result.publicId).toBe(mockUploadResult.public_id);
      expect(mockFileService.uploadImage).toHaveBeenCalledWith(mockFile, 'user_uploads');
    });

    it('should return error response on upload failure', async () => {
      mockFileService.uploadImage.mockRejectedValue(new Error('Upload failed'));

      const result = await controller.uploadImage(mockFile);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Upload failed');
    });
  });

  // ==================== DELETE IMAGE TESTS ====================
  describe('deleteImage', () => {
    it('should return success when image is deleted', async () => {
      const deleteDto = { publicId: 'user_uploads/test-image' };
      mockFileService.deleteImage.mockResolvedValue({ result: 'ok' });

      const result = await controller.deleteImage(deleteDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('File deleted successfully');
      expect(mockFileService.deleteImage).toHaveBeenCalledWith(deleteDto.publicId);
    });

    it('should return not found when image does not exist', async () => {
      const deleteDto = { publicId: 'nonexistent/image' };
      mockFileService.deleteImage.mockResolvedValue({ result: 'not found' });

      const result = await controller.deleteImage(deleteDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('File not found');
    });

    it('should return error when delete fails', async () => {
      const deleteDto = { publicId: 'user_uploads/test-image' };
      mockFileService.deleteImage.mockResolvedValue({ result: 'error' });

      const result = await controller.deleteImage(deleteDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to delete file');
    });

    it('should handle exception during delete', async () => {
      const deleteDto = { publicId: 'user_uploads/test-image' };
      mockFileService.deleteImage.mockRejectedValue(new Error('Connection error'));

      const result = await controller.deleteImage(deleteDto);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection error');
    });
  });
});
