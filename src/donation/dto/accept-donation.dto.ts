import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AcceptDonationDto {
    @ApiProperty({ description: 'The ID of the blood request to accept' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsUUID('all')
    request_id: string;
}
