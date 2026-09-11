import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ReportService } from '../report/report.service';
import { ReportFilterDto } from '../report/dto/report-filter.dto';
import { ReportActionDto } from '../report/dto/report-action.dto';
import { CreateReportDto } from '../report/dto/create-report.dto';

@ApiTags('Support & Moderation')
@Controller('support')
export class SupportController {
    constructor(
        private readonly supportService: SupportService,
        private readonly reportService: ReportService,
    ) { }

    @Get('reports')
    @ApiOperation({ summary: 'Fetch user & blood request reports queue' })
    @ApiResponse({ status: 200, description: 'Reports fetched successfully' })
    getReports(@Query() filter: ReportFilterDto) {
        return this.reportService.getReports(filter);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Fetch moderation statistics' })
    @ApiResponse({ status: 200, description: 'Stats fetched successfully' })
    getReportStats() {
        return this.reportService.getReportStats();
    }

    @Post('reports')
    @ApiOperation({ summary: 'Submit a new report' })
    @ApiResponse({ status: 201, description: 'Report submitted successfully' })
    createReport(@Req() req: any, @Body() dto: CreateReportDto) {
        const reporterId = req.user ? req.user.id : null;
        return this.reportService.createReport(reporterId, dto);
    }

    @Get('reports/:id')
    @ApiOperation({ summary: 'Get single report details' })
    @ApiResponse({ status: 200, description: 'Report details fetched successfully' })
    getReportById(@Param('id') id: string) {
        return this.reportService.getReportById(id);
    }

    @Patch('reports/:id/action')
    @ApiOperation({ summary: 'Take moderation action on report' })
    @ApiResponse({ status: 200, description: 'Action applied successfully' })
    resolveAction(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: ReportActionDto,
    ) {
        const adminId = req.user ? req.user.id : null;
        return this.reportService.resolveAction(adminId, id, dto);
    }

    @Post('contact')
    @ApiOperation({ summary: 'Submit contact support form or user feedback ticket' })
    @ApiResponse({ status: 200, description: 'Support query submitted successfully.' })
    submitContact(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
        const userId = req.user ? req.user.id : null;
        return this.supportService.submitContactTicket(userId, dto);
    }
}
