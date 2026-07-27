import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@ApiTags('Support & System')
@Controller('support')
export class SupportController {
    constructor(private readonly supportService: SupportService) { }

    @Get('faqs')
    @ApiOperation({ summary: 'Fetch FAQs for Help & Support screen' })
    @ApiResponse({ status: 200, description: 'FAQs fetched successfully' })
    getFaqs() {
        return this.supportService.getFaqs();
    }

    @Post('contact')
    @ApiOperation({ summary: 'Submit contact support form or user feedback ticket' })
    @ApiResponse({ status: 200, description: 'Support query submitted successfully.' })
    submitContact(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
        const userId = req.user ? req.user.id : null;
        return this.supportService.submitContactTicket(userId, dto);
    }
}
