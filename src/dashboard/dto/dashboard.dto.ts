import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
    @ApiProperty({ description: 'Total registered blood donors', example: 120 })
    total_donors: number;

    @ApiProperty({ description: 'Total currently active blood requests', example: 14 })
    active_requests: number;

    @ApiProperty({ description: 'Total active critical urgency requests', example: 3 })
    critical_requests: number;

    @ApiProperty({ description: 'Total completed blood donations', example: 85 })
    fulfilled_donations: number;

    @ApiProperty({ description: 'Estimated lives saved (3 lives per donation)', example: 255 })
    lives_saved: number;

    @ApiProperty({ description: 'Average response time for donation', example: '18 mins' })
    response_time_avg: string;
}
