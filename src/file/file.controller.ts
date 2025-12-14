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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('file')
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @UseGuards(AuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        url: {
          type: 'string',
          example: 'https://res.cloudinary.com/.../image.jpg',
        },
        publicId: { type: 'string', example: 'user_uploads/abc123' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Upload failed' },
      },
    },
  })
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
  @ApiOperation({ summary: 'Delete an uploaded file' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'File deleted successfully' },
        result: { type: 'object', description: 'Cloudinary delete result' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'File not found.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'File not found' },
        result: { type: 'object', description: 'Cloudinary delete result' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Failed to delete file.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Failed to delete file' },
        result: { type: 'object', description: 'Cloudinary delete result' },
      },
    },
  })
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
