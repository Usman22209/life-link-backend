import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNumber,
    IsOptional,
    IsDateString,
    IsNotEmpty,
    Min,
} from 'class-validator';

export enum UrgencyLevel {
    NORMAL = 'normal',
    HIGH = 'high',
    CRITICAL = 'critical',
}

export class CreateBloodRequestDto {
    @ApiPropertyOptional({ description: 'Patient full name' })
    @IsOptional()
    @IsString()
    patient_name?: string;

    @ApiProperty({ description: 'Blood group', example: 'A+' })
    @IsNotEmpty()
    @IsString()
    blood_group: string;

    @ApiProperty({ description: 'Units required', example: 1, minimum: 1 })
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    units_required: number;

    @ApiProperty({ description: 'Hospital name', example: 'Mayo Hospital' })
    @IsNotEmpty()
    @IsString()
    hospital_name: string;

    @ApiPropertyOptional({ description: 'Hospital address' })
    @IsOptional()
    @IsString()
    hospital_address?: string;

    @ApiPropertyOptional({ description: 'City ID' })
    @IsOptional()
    @IsString()
    city_id?: string;

    @ApiPropertyOptional({ description: 'Latitude' })
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional({ description: 'Longitude' })
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiPropertyOptional({
        description: 'Deprecated: Urgency level is now derived from required_date',
    })
    @IsOptional()
    urgency?: string;

    @ApiPropertyOptional({ description: 'Emergency contact number' })
    @IsOptional()
    @IsString()
    contact_number?: string;

    @ApiPropertyOptional({ description: 'Additional details or requirements' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Required date and time when blood is needed (ISO 8601 string)',
        example: '2026-09-24T18:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    required_date?: string;
}
