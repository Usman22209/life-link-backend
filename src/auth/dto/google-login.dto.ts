import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID token for authentication' })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}
