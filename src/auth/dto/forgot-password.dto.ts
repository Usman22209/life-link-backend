import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address for password reset' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
