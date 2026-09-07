import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBloodRequestStatusDto {
    @ApiProperty({
        description: 'New status for the blood request',
        enum: ['open', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired'],
        example: 'fulfilled',
    })
    @IsNotEmpty()
    @IsString()
    @IsIn(['open', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired', 'OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'EXPIRED'])
    status: string;
}
