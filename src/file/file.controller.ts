import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { DeleteFileDto } from './dto/delete-file.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
  @Post('delete')
  async deleteImage(@Body() body: DeleteFileDto) {
    const { publicId } = body;
    
    try {
      const result = await this.fileService.deleteImage(publicId);
      
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
