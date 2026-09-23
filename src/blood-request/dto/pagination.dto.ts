import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Number of items per page', default: 10, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Search term for patient name, hospital, address, or description' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by blood group (e.g. B+, O-)' })
    @IsOptional()
    @IsString()
    blood_group?: string;

    @ApiPropertyOptional({ description: 'Filter by urgency (critical, high, normal)' })
    @IsOptional()
    @IsString()
    urgency?: string;

    @ApiPropertyOptional({ description: 'Filter by city ID (e.g. city_lahore)' })
    @IsOptional()
    @IsString()
    city_id?: string;

    @ApiPropertyOptional({ description: 'Filter by status (open, partially_fulfilled, fulfilled)', default: 'open' })
    @IsOptional()
    @IsString()
    status?: string = 'open';

    @ApiPropertyOptional({ description: 'Field to sort by', enum: ['created_at', 'closing_soon', 'required_date', 'most_units', 'units_required'], default: 'created_at' })
    @IsOptional()
    @IsString()
    sort_by?: string = 'created_at';

    @ApiPropertyOptional({ description: 'Sort direction (asc or desc)', enum: ['asc', 'desc'], default: 'desc' })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sort_order?: 'asc' | 'desc' = 'desc';

    @ApiPropertyOptional({ description: 'User latitude for distance calculation & nearest sorting' })
    @IsOptional()
    @Type(() => Number)
    lat?: number;

    @ApiPropertyOptional({ description: 'User longitude for distance calculation & nearest sorting' })
    @IsOptional()
    @Type(() => Number)
    lng?: number;

    get skip(): number {
        return ((this.page ?? 1) - 1) * (this.limit ?? 10);
    }
}
