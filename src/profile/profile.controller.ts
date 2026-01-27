import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ProfileSwaggerResponses } from './swagger/profile-responses';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get('me')
    @ApiOperation({
        summary: 'Get current user profile',
        description: 'Fetch the profile data for the authenticated user.',
    })
    @ApiResponse(ProfileSwaggerResponses.getProfile.success)
    @ApiResponse(ProfileSwaggerResponses.getProfile.notFound)
    async getProfile(@Req() req: any) {
        return this.profileService.getProfile(req.user.id);
    }

    @Put('me')
    @ApiOperation({
        summary: 'Update current user profile',
        description: 'Update or create the profile data for the authenticated user. Used for onboarding.',
    })
    @ApiResponse(ProfileSwaggerResponses.updateProfile.success)
    @ApiResponse(ProfileSwaggerResponses.updateProfile.badRequest)
    async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
        return this.profileService.updateProfile(req.user.id, dto);
    }
}
