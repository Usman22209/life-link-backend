import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@Injectable()
export class SupportService {
    private readonly logger = new Logger(SupportService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async submitContactTicket(userId: string | null, dto: CreateSupportTicketDto) {
        const ticketNumber = `#SUP-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            await this.supabase.client
                .from('support_tickets')
                .insert({
                    user_id: userId,
                    subject: dto.subject,
                    message: dto.message,
                    ticket_number: ticketNumber,
                    status: 'open',
                });
        } catch (err) {
            this.logger.warn(`Could not persist support ticket in database: ${err.message}`);
        }

        return {
            success: true,
            message: `Support query submitted successfully. Ticket ID ${ticketNumber}.`,
        };
    }
}
