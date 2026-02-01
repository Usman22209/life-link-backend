import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UrgencyLevel {
    CRITICAL = 'critical',
    HIGH = 'high',
    NORMAL = 'normal',
}

export class CreateBloodRequestDto {
    @ApiPropertyOptional({ description: 'Name of the patient needing blood' })
    @IsOptional()
    @IsString()
    patient_name?: string;

    @ApiProperty({ description: 'Required blood group', example: 'O+' })
    @IsString()
    blood_group: string;

    @ApiProperty({ description: 'Number of units required', default: 1 })
    @IsInt()
    @Min(1)
    units_required: number;

    @ApiProperty({ description: 'Name of the hospital' })
    @IsString()
    hospital_name: string;

    @ApiPropertyOptional({ description: 'Full address of the hospital' })
    @IsOptional()
    @IsString()
    hospital_address?: string;

    @ApiPropertyOptional({ description: 'City ID for localization' })
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
        description: 'Urgency level',
        enum: UrgencyLevel,
        default: UrgencyLevel.NORMAL
    })
    @IsOptional()
    @IsEnum(UrgencyLevel)
    urgency?: UrgencyLevel;

    @ApiPropertyOptional({ description: 'Emergency contact number' })
    @IsOptional()
    @IsString()
    contact_number?: string;

    @ApiPropertyOptional({ description: 'Additional details or requirements' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Deadline for donation', example: '2024-12-31T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    required_date?: string;
}
