import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Notifications enabled toggle' })
  @IsOptional()
  @IsBoolean()
  notifications_enabled?: boolean;

  @ApiPropertyOptional({ description: 'Hide phone number and only allow in-app chat' })
  @IsOptional()
  @IsBoolean()
  hide_phone_number?: boolean;

  @ApiPropertyOptional({ description: 'Language preference' })
  @IsOptional()
  @IsString()
  language_preference?: string;
}
