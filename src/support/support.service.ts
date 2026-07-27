import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

const DEFAULT_FAQS = [
    {
        id: 'faq_1',
        question: 'Who can donate blood?',
        answer: 'Anyone aged 18-65, weighing over 50kg, and in good general health with no active infections can donate.',
    },
    {
        id: 'faq_2',
        question: 'How often can I donate?',
        answer: 'You can safely donate whole blood once every 90 days (3 months) to allow your body to fully replenish iron levels.',
    },
    {
        id: 'faq_3',
        question: 'Is donating blood safe?',
        answer: 'Yes, donating blood is completely safe. Sterile, disposable single-use needles and equipment are used for every donation.',
    },
    {
        id: 'faq_4',
        question: 'How long does a blood request stay active?',
        answer: 'Blood requests stay open until fulfilled by donors or manually marked as completed by the requester.',
    },
];

@Injectable()
export class SupportService {
    private readonly logger = new Logger(SupportService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async getFaqs() {
        try {
            const { data, error } = await this.supabase.client
                .from('faqs')
                .select('id, question, answer')
                .order('order_index', { ascending: true });

            if (!error && data && data.length > 0) {
                return {
                    success: true,
                    data,
                };
            }
        } catch (err) {
            this.logger.warn(`Failed to fetch FAQs from database, using defaults: ${err.message}`);
        }

        return {
            success: true,
            data: DEFAULT_FAQS,
        };
    }

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
