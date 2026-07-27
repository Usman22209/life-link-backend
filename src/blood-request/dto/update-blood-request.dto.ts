import { PartialType } from '@nestjs/swagger';
import { CreateBloodRequestDto } from './create-blood-request.dto';
import { IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum BloodRequestStatus {
    OPEN = 'open',
    PARTIALLY_FULFILLED = 'partially_fulfilled',
    FULFILLED = 'fulfilled',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
}

export class UpdateBloodRequestDto extends PartialType(CreateBloodRequestDto) {
    @ApiPropertyOptional({
        description: 'Status of the request',
        enum: BloodRequestStatus
    })
    @IsOptional()
    @IsEnum(BloodRequestStatus)
    status?: BloodRequestStatus;

    @ApiPropertyOptional({ description: 'Number of fulfilled units' })
    @IsOptional()
    @IsNumber()
    fulfilled_units?: number;
}
