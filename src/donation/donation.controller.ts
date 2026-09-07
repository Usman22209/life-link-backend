import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DonationService } from './donation.service';
import { AcceptDonationDto } from './dto/accept-donation.dto';
import { UpdateDonationStatusDto } from './dto/update-donation-status.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Donations')
@Controller('donations')
export class DonationController {
    constructor(private readonly donationService: DonationService) { }

    @Get('history')
    @ApiOperation({ summary: 'Get all audited donation records with global platform statistics (Dashboard/Admin)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String, enum: ['all', 'completed', 'intent', 'cancelled'] })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Donation history and stats fetched successfully.' })
    getDonationHistory(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: string,
        @Query('search') search?: string,
    ) {
        return this.donationService.getDonationHistory({
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            status,
            search,
        });
    }

    @Post('accept')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Accept a blood request (register donor intent)' })
    @ApiResponse({ status: 201, description: 'Donation intent registered.' })
    acceptRequest(@Req() req: any, @Body() dto: AcceptDonationDto) {
        return this.donationService.acceptRequest(req.user.id, dto.request_id || (dto as any).requestId);
    }

    @Get('my')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get logged-in donor historical donation log and stats' })
    @ApiResponse({ status: 200, description: 'Donation log fetched successfully.' })
    getMyDonations(@Req() req: any) {
        return this.donationService.getMyDonations(req.user.id);
    }

    @Get('request/:requestId')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all donations pledged for a specific blood request (Requester only)' })
    @ApiResponse({ status: 200, description: 'Donations list fetched successfully' })
    getDonationsByRequest(@Req() req: any, @Param('requestId') requestId: string) {
        return this.donationService.getDonationsByRequest(req.user.id, requestId);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update donation status (Complete or Cancel)' })
    @ApiResponse({ status: 200, description: 'Donation status updated.' })
    updateStatus(
        @Req() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateDonationStatusDto,
    ) {
        return this.donationService.updateStatus(req.user.id, id, dto.status);
    }
}
