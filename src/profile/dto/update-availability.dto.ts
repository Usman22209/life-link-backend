import { IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAvailabilityDto {
    @ApiProperty({ description: 'Donor availability status toggle', example: true })
    @IsNotEmpty()
    @IsBoolean()
    is_available: boolean;
}
