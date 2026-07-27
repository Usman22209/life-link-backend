import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BloodRequestService } from './blood-request.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { UpdateBloodRequestDto } from './dto/update-blood-request.dto';
import { PaginationDto } from './dto/pagination.dto';
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
    @ApiOperation({ summary: 'Get all open blood requests (Paginated & Filterable)' })
    @ApiResponse({ status: 200, description: 'Feed fetched successfully' })
    getFeed(@Query() query: PaginationDto) {
        return this.bloodRequestService.getFeed(query);
    }

    @Get('urgent')
    @ApiOperation({ summary: 'Get top urgent blood requests for homepage carousel' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'lat', required: false, type: Number })
    @ApiQuery({ name: 'lng', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Urgent requests fetched successfully' })
    getUrgent(
        @Query('limit') limit?: number,
        @Query('lat') lat?: number,
        @Query('lng') lng?: number,
    ) {
        return this.bloodRequestService.getUrgentRequests(limit ? Number(limit) : 5, lat ? Number(lat) : undefined, lng ? Number(lng) : undefined);
    }

    @Get('my')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user\'s blood requests (Paginated)' })
    @ApiResponse({ status: 200, description: 'My requests fetched successfully' })
    getMyRequests(@Req() req: any, @Query() pagination: PaginationDto) {
        return this.bloodRequestService.getMyRequests(req.user.id, pagination);
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
