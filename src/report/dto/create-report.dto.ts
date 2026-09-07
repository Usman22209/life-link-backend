import { IsNotEmpty, IsString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReportDto {
    @ApiProperty({
        description: 'Target type of the report',
        enum: ['request', 'user'],
        example: 'request',
    })
    @IsNotEmpty()
    @IsString()
    @IsIn(['request', 'user'])
    target_type: 'request' | 'user';

    @ApiProperty({
        description: 'UUID of the reported blood request or user profile',
        example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    })
    @IsNotEmpty()
    @IsString()
    target_id: string;

    @ApiProperty({
        description: 'Category or reason for the report',
        example: 'fake_request',
    })
    @IsNotEmpty()
    @IsString()
    reason: string;

    @ApiPropertyOptional({
        description: 'Detailed description of the issue or violation',
        example: 'This requester is asking for money instead of actual blood donation.',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Priority level of the report',
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    })
    @IsOptional()
    @IsString()
    @IsIn(['low', 'medium', 'high', 'urgent'])
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}
