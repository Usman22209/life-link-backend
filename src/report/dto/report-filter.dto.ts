import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReportFilterDto {
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

    @ApiPropertyOptional({
        description: 'Filter by report status',
        enum: ['pending', 'reviewed', 'resolved', 'dismissed', 'all'],
        default: 'all',
    })
    @IsOptional()
    @IsString()
    status?: string = 'all';

    @ApiPropertyOptional({
        description: 'Filter by target type',
        enum: ['request', 'user', 'all'],
        default: 'all',
    })
    @IsOptional()
    @IsString()
    target_type?: string = 'all';

    @ApiPropertyOptional({
        description: 'Filter by priority',
        enum: ['low', 'medium', 'high', 'urgent', 'all'],
    })
    @IsOptional()
    @IsString()
    priority?: string;

    @ApiPropertyOptional({ description: 'Search term for reason or description' })
    @IsOptional()
    @IsString()
    search?: string;

    get skip(): number {
        return ((this.page ?? 1) - 1) * (this.limit ?? 10);
    }
}
