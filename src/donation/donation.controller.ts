import { Controller, Post, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DonationService } from './donation.service';
import { AcceptDonationDto } from './dto/accept-donation.dto';
import { UpdateDonationStatusDto } from './dto/update-donation-status.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Donations')
@Controller('donations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DonationController {
    constructor(private readonly donationService: DonationService) { }

    @Post('accept')
    @ApiOperation({ summary: 'Accept a blood request (register donor intent)' })
    @ApiResponse({ status: 201, description: 'Donation intent registered.' })
    acceptRequest(@Req() req: any, @Body() dto: AcceptDonationDto) {
        return this.donationService.acceptRequest(req.user.id, dto.request_id || (dto as any).requestId);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get logged-in donor historical donation log and stats' })
    @ApiResponse({ status: 200, description: 'Donation log fetched successfully.' })
    getMyDonations(@Req() req: any) {
        return this.donationService.getMyDonations(req.user.id);
    }

    @Get('request/:requestId')
    @ApiOperation({ summary: 'Get all donations pledged for a specific blood request (Requester only)' })
    @ApiResponse({ status: 200, description: 'Donations list fetched successfully' })
    getDonationsByRequest(@Req() req: any, @Param('requestId') requestId: string) {
        return this.donationService.getDonationsByRequest(req.user.id, requestId);
    }

    @Patch(':id/status')
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
