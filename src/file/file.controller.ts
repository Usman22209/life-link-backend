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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SwaggerResponses, SwaggerBodies } from './swagger/file-responses';

@ApiTags('File Management')
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) { }

  @UseGuards(AuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload an image file',
    description: 'Upload an image to Cloudinary. Returns secure URL and public ID.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(SwaggerBodies.upload)
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
    description: 'Delete a file from Cloudinary using its public ID.',
  })
  @ApiResponse(SwaggerResponses.delete.success)
  @ApiResponse(SwaggerResponses.delete.notFound)
  @ApiResponse(SwaggerResponses.delete.badRequest)
  @ApiResponse(SwaggerResponses.delete.unauthorized)
  deleteImage(@Body() body: DeleteFileDto) {
    const { publicId } = body;

    // Fire-and-forget: Return immediately, deletion happens in background
    // This reduces response time from ~2000ms to ~10ms
    this.fileService.deleteImageAsync(publicId);

    return {
      success: true,
      message: 'File deletion initiated',
    };
  }
}
