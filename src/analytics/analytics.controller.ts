import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('trends')
    @ApiOperation({ summary: 'Get monthly trends and regional blood request metrics' })
    @ApiResponse({ status: 200, description: 'Analytics trends retrieved successfully' })
    getTrends() {
        return this.analyticsService.getTrends();
    }
}
