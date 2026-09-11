import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Notifications & Alerts')
@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get all notification alerts for logged-in user' })
    @ApiResponse({ status: 200, description: 'Notifications fetched successfully' })
    getNotifications(@Req() req: any) {
        return this.notificationService.getNotifications(req.user.id);
    }


    @Post('broadcast')
    @ApiOperation({ summary: 'Dispatch broadcast emergency push notification & in-app alert to matching donors' })
    @ApiResponse({ status: 200, description: 'Broadcast dispatched successfully' })
    broadcast(@Body() dto: any) {
        return this.notificationService.broadcastAlert(dto);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get total unread notifications count for header badge' })
    @ApiResponse({ status: 200, description: 'Unread count fetched successfully' })
    getUnreadCount(@Req() req: any) {
        return this.notificationService.getUnreadCount(req.user.id);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark specific notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read.' })
    markAsRead(@Req() req: any, @Param('id') id: string) {
        return this.notificationService.markAsRead(req.user.id, id);
    }

    @Post('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read / clear unread badges' })
    @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
    markAllAsRead(@Req() req: any) {
        return this.notificationService.markAllAsRead(req.user.id);
    }
}
