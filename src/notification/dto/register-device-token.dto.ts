import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM or APNS device push token' })
  @IsNotEmpty()
  @IsString()
  device_token: string;

  @ApiPropertyOptional({ description: 'Device platform: android / ios' })
  @IsOptional()
  @IsString()
  platform?: string;
}
