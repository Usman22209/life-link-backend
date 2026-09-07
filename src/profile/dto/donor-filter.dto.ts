import { IsOptional, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DonorFilterDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Filter by blood group (e.g. O+, A-)' })
    @IsOptional()
    @IsString()
    blood_group?: string;

    @ApiPropertyOptional({ description: 'Filter by city ID (e.g. city_lahore)' })
    @IsOptional()
    @IsString()
    city_id?: string;

    @ApiPropertyOptional({ description: 'Filter by availability status' })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    is_available?: boolean;

    @ApiPropertyOptional({ description: 'Search term for name, phone, city, or state' })
    @IsOptional()
    @IsString()
    search?: string;

    get skip(): number {
        return ((this.page ?? 1) - 1) * (this.limit ?? 10);
    }
}
