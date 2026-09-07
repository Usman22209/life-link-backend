import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get aggregated command center statistics' })
    @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
    getStats() {
        return this.dashboardService.getStats();
    }
}
