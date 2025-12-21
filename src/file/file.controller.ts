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
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SwaggerResponses, SwaggerHeaders, SwaggerBodies } from './swagger/file-responses';

@ApiTags('File Management')
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @UseGuards(AuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload an image file',
    description: 'Upload an image to Cloudinary. Returns secure URL and public ID. Supports automatic token refresh.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(SwaggerBodies.upload)
  @ApiHeader(SwaggerHeaders.authorization)
  @ApiHeader(SwaggerHeaders.sessionId)
  @ApiResponse(SwaggerResponses.upload.success)
  @ApiResponse(SwaggerResponses.upload.badRequest)
  @ApiResponse(SwaggerResponses.upload.unauthorized)
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete an uploaded file',
    description: 'Delete a file from Cloudinary using its public ID. Requires authentication.',
  })
  @ApiHeader(SwaggerHeaders.authorization)
  @ApiHeader(SwaggerHeaders.sessionId)
  @ApiResponse(SwaggerResponses.delete.success)
  @ApiResponse(SwaggerResponses.delete.notFound)
  @ApiResponse(SwaggerResponses.delete.badRequest)
  @ApiResponse(SwaggerResponses.delete.unauthorized)
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
