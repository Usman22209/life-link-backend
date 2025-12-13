import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteFileDto {
  @IsNotEmpty()
  @IsString()
  publicId: string;
}
