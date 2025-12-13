import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    try {
      const result = await this.fileService.uploadImage(file, 'user_uploads');
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Upload failed',
      };
    }
  }

  @Post('delete')
  async deleteImage(@Body() body: any) {
    const publicId = body.publicId;

    if (!publicId) {
      return {
        success: false,
        message: 'publicId is required',
      };
    }

    try {
      const result = await this.fileService.deleteImage(publicId);

      // Cloudinary returns 'ok' if deleted, 'not found' if file does not exist
      if (result.result === 'ok') {
        return {
          success: true,
          message: 'File deleted successfully',
          result,
        };
      } else if (result.result === 'not found') {
        return {
          success: false,
          message: 'File not found',
          result,
        };
      } else {
        return {
          success: false,
          message: 'Failed to delete file',
          result,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete file',
        details: error,
      };
    }
  }
}
