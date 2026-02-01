import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptDonationDto {
    @ApiProperty({ description: 'The ID of the blood request to accept' })
    @IsUUID()
    request_id: string;
}
