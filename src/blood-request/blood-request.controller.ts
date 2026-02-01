import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BloodRequestService } from './blood-request.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { UpdateBloodRequestDto } from './dto/update-blood-request.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Blood Requests')
@Controller('blood-requests')
export class BloodRequestController {
    constructor(private readonly bloodRequestService: BloodRequestService) { }

    @Post()
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new blood request' })
    @ApiResponse({ status: 201, description: 'Request created successfully' })
    create(@Req() req: any, @Body() createBloodRequestDto: CreateBloodRequestDto) {
        return this.bloodRequestService.create(req.user.id, createBloodRequestDto);
    }

    @Get('feed')
    @ApiOperation({ summary: 'Get all open blood requests' })
    @ApiResponse({ status: 200, description: 'Feed fetched successfully' })
    getFeed() {
        return this.bloodRequestService.getFeed();
    }

    @Get('my')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user\'s blood requests' })
    @ApiResponse({ status: 200, description: 'My requests fetched successfully' })
    getMyRequests(@Req() req: any) {
        return this.bloodRequestService.getMyRequests(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get details of a single blood request' })
    @ApiResponse({ status: 200, description: 'Request details fetched successfully' })
    @ApiResponse({ status: 404, description: 'Request not found' })
    findOne(@Param('id') id: string) {
        return this.bloodRequestService.getOne(id);
    }

    @Patch(':id')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update or cancel a blood request' })
    @ApiResponse({ status: 200, description: 'Request updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
    update(
        @Req() req: any,
        @Param('id') id: string,
        @Body() updateBloodRequestDto: UpdateBloodRequestDto,
    ) {
        return this.bloodRequestService.update(req.user.id, id, updateBloodRequestDto);
    }
}
