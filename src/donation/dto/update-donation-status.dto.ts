import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DonationStatus {
    INTENT = 'intent',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export class UpdateDonationStatusDto {
    @ApiProperty({ description: 'New status for the donation', enum: DonationStatus })
    @IsEnum(DonationStatus)
    status: DonationStatus;
}
