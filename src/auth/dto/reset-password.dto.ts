import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'New password for the user',
    minLength: 6,
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
