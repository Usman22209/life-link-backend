import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DonationService } from './donation.service';
import { AcceptDonationDto } from './dto/accept-donation.dto';
import { UpdateDonationStatusDto } from './dto/update-donation-status.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Donations & Acceptance')
@Controller('donations')
export class DonationController {
    constructor(private readonly donationService: DonationService) { }

    @Post('accept')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Accept/Help with a blood request' })
    @ApiResponse({ status: 201, description: 'Acceptance recorded successfully' })
    acceptRequest(@Req() req: any, @Body() dto: AcceptDonationDto) {
        return this.donationService.acceptRequest(req.user.id, dto.request_id);
    }

    @Get('request/:id')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all donations (help offers) for a specific request' })
    @ApiResponse({ status: 200, description: 'Donations fetched successfully' })
    getDonationsByRequest(@Req() req: any, @Param('id') requestId: string) {
        return this.donationService.getDonationsByRequest(req.user.id, requestId);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update donation status (Complete or Cancel)' })
    @ApiResponse({ status: 200, description: 'Status updated successfully' })
    updateStatus(
        @Req() req: any,
        @Param('id') donationId: string,
        @Body() dto: UpdateDonationStatusDto,
    ) {
        return this.donationService.updateStatus(req.user.id, donationId, dto.status);
    }
}
