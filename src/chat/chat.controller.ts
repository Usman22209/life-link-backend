import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Chat & Messaging')
@Controller('chat')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('threads')
    @ApiOperation({ summary: 'Get active chat threads for logged-in user' })
    @ApiResponse({ status: 200, description: 'Chat threads fetched successfully' })
    getThreads(@Req() req: any) {
        return this.chatService.getThreads(req.user.id);
    }

    @Get('threads/:threadId/messages')
    @ApiOperation({ summary: 'Get message history for a specific chat thread' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Messages fetched successfully' })
    getMessages(
        @Req() req: any,
        @Param('threadId') threadId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.chatService.getMessages(req.user.id, threadId, page ? Number(page) : 1, limit ? Number(limit) : 20);
    }

    @Post('messages')
    @ApiOperation({ summary: 'Send a message in a chat thread' })
    @ApiResponse({ status: 201, description: 'Message sent successfully' })
    sendMessage(@Req() req: any, @Body() dto: CreateMessageDto) {
        return this.chatService.sendMessage(req.user.id, dto);
    }
}
