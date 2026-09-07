import { Controller, Get, Put, Delete, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DonorFilterDto } from './dto/donor-filter.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ProfileSwaggerResponses } from './swagger/profile-responses';

@ApiTags('Profile & Donors')
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get('donors')
    @ApiOperation({
        summary: 'List verified & active blood donors',
        description: 'Get paginated list of donors with blood group, city, availability, and search filters.',
    })
    @ApiResponse({ status: 200, description: 'Donors directory fetched successfully.' })
    async getDonors(@Query() query: DonorFilterDto) {
        return this.profileService.getDonors(query);
    }

    @Patch(':id/availability')
    @ApiOperation({
        summary: 'Toggle donor availability status',
        description: 'Quick toggle for donor availability status in directory.',
    })
    @ApiResponse({ status: 200, description: 'Donor availability updated successfully.' })
    async updateAvailability(
        @Param('id') id: string,
        @Body() dto: UpdateAvailabilityDto,
    ) {
        return this.profileService.updateAvailability(id, dto.is_available);
    }

    @Get('me')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get current user profile',
        description: 'Fetch profile data along with donor stats for the authenticated user.',
    })
    @ApiResponse(ProfileSwaggerResponses.getProfile.success)
    @ApiResponse(ProfileSwaggerResponses.getProfile.notFound)
    async getProfile(@Req() req: any) {
        return this.profileService.getProfile(req.user.id);
    }

    @Put('me')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update current user profile',
        description: 'Update or create the profile data for the authenticated user.',
    })
    @ApiResponse(ProfileSwaggerResponses.updateProfile.success)
    @ApiResponse(ProfileSwaggerResponses.updateProfile.badRequest)
    async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
        return this.profileService.updateProfile(req.user.id, dto);
    }

    @Delete('me')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Delete current user account',
        description: 'Permanently delete user profile and associated data.',
    })
    @ApiResponse({ status: 200, description: 'User account permanently deleted.' })
    async deleteProfile(@Req() req: any) {
        return this.profileService.deleteProfile(req.user.id);
    }

    @Patch('settings')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Update user settings/preferences',
        description: 'Quick toggle for notifications or language preferences.',
    })
    @ApiResponse({ status: 200, description: 'Settings updated.' })
    async updateSettings(@Req() req: any, @Body() dto: UpdateSettingsDto) {
        return this.profileService.updateSettings(req.user.id, dto);
    }
}
