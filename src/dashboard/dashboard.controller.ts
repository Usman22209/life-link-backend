import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { NotificationService } from '../notification/notification.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly notificationService: NotificationService,
    ) { }

    @Get('stats')
    @ApiOperation({ summary: 'Get aggregated command center statistics' })
    @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
    getStats() {
        return this.dashboardService.getStats();
    }

    @Post('broadcast')
    @ApiOperation({ summary: 'Dispatch broadcast emergency alert to donors' })
    @ApiResponse({ status: 200, description: 'Broadcast dispatched successfully' })
    broadcastAlert(@Body() dto: any) {
        return this.notificationService.broadcastAlert(dto);
    }
}
