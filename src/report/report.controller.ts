import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReportActionDto } from './dto/report-action.dto';

@ApiTags('Reports & Moderation')
@Controller('reports')
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    @Post()
    @ApiOperation({ summary: 'Submit a report against a blood request or a user' })
    @ApiResponse({ status: 201, description: 'Report submitted successfully' })
    createReport(@Req() req: any, @Body() dto: CreateReportDto) {
        const reporterId = req.user ? req.user.id : null;
        return this.reportService.createReport(reporterId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all reports with filters and pagination (Admin/Dashboard)' })
    @ApiResponse({ status: 200, description: 'Reports list fetched successfully' })
    getReports(@Query() filter: ReportFilterDto) {
        return this.reportService.getReports(filter);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get aggregated moderation & report statistics' })
    @ApiResponse({ status: 200, description: 'Report stats fetched successfully' })
    getReportStats() {
        return this.reportService.getReportStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get details of a single report' })
    @ApiResponse({ status: 200, description: 'Report details fetched successfully' })
    @ApiResponse({ status: 404, description: 'Report not found' })
    getReportById(@Param('id') id: string) {
        return this.reportService.getReportById(id);
    }

    @Patch(':id/action')
    @ApiOperation({ summary: 'Resolve, dismiss, or take moderation action on a report' })
    @ApiResponse({ status: 200, description: 'Report acted on successfully' })
    resolveAction(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: ReportActionDto,
    ) {
        const adminId = req.user ? req.user.id : null;
        return this.reportService.resolveAction(adminId, id, dto);
    }
}
