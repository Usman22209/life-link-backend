import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteFileDto {
  @ApiProperty({ description: 'Public ID of the file to delete' })
  @IsNotEmpty()
  @IsString()
  publicId: string;
}
