import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateMessageDto } from './dto/create-message.dto';

import { NotificationService } from '../notification/notification.service';

function timeAgo(date: string | Date): string {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private readonly supabase: SupabaseService,
        private readonly notificationService: NotificationService,
    ) { }

    async getThreads(userId: string) {
        const { data: threads, error } = await this.supabase.client
            .from('chat_threads')
            .select(`
                *,
                request:blood_requests(
                    id,
                    blood_group,
                    patient_name,
                    hospital_name,
                    city_id,
                    units_required,
                    urgency,
                    created_at
                ),
                requester:profiles!chat_threads_requester_fkey(id, full_name, profile_image),
                donor:profiles!chat_threads_donor_fkey(id, full_name, profile_image)
            `)
            .or(`requester_id.eq.${userId},donor_id.eq.${userId}`)
            .order('last_message_at', { ascending: false });

        if (error) {
            this.logger.error(`Error fetching chat threads for user ${userId}`, error.message);
            throw new BadRequestException(`Could not fetch chat threads: ${error.message}`);
        }

        const formatted = await Promise.all((threads || []).map(async (thread: any) => {
            const isRequester = thread.requester_id === userId;
            const participant = isRequester ? thread.donor : thread.requester;

            // Fetch unread count for user in this thread
            const { count: unreadCount } = await this.supabase.client
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('thread_id', thread.id)
                .neq('sender_id', userId)
                .eq('is_read', false);

            return {
                id: thread.id,
                request_id: thread.request_id,
                participant: {
                    id: participant?.id || 'usr_unknown',
                    name: participant?.full_name || 'User',
                    avatar: participant?.profile_image || 'https://cdn.lifelink.org/avatars/user.jpg',
                    is_online: true,
                },
                request: thread.request ? {
                    id: thread.request.id,
                    bloodType: thread.request.blood_group,
                    patientName: thread.request.patient_name,
                    hospital: thread.request.hospital_name,
                    city: thread.request.city_id,
                    units: thread.request.units_required,
                    urgency: thread.request.urgency,
                    time: timeAgo(thread.request.created_at),
                    distance: '2.5 km',
                } : null,
                lastMessage: thread.last_message || 'Chat started',
                time: timeAgo(thread.last_message_at || thread.created_at),
                unreadCount: unreadCount || 0,
                isOnline: true,
            };
        }));

        return {
            success: true,
            data: formatted,
        };
    }

    async getMessages(userId: string, threadId: string, page: number = 1, limit: number = 20) {
        // Verify thread exists
        const { data: thread } = await this.supabase.client
            .from('chat_threads')
            .select('id')
            .eq('id', threadId)
            .maybeSingle();

        if (!thread) {
            return {
                success: true,
                data: {
                    thread_id: threadId,
                    messages: [],
                    pagination: { page, limit, total: 0 },
                },
            };
        }

        // Mark unread messages as read
        await this.supabase.client
            .from('chat_messages')
            .update({ is_read: true })
            .eq('thread_id', threadId)
            .neq('sender_id', userId);

        const skip = (page - 1) * limit;

        const { count } = await this.supabase.client
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', threadId);

        const { data, error } = await this.supabase.client
            .from('chat_messages')
            .select('*')
            .eq('thread_id', threadId)
            .order('sent_at', { ascending: true })
            .range(skip, skip + limit - 1);

        if (error) {
            this.logger.error(`Error fetching messages for thread ${threadId}`, error.message);
            throw new BadRequestException(`Could not fetch messages: ${error.message}`);
        }

        const total = count || 0;

        return {
            success: true,
            data: {
                thread_id: threadId,
                messages: data || [],
                pagination: {
                    page,
                    limit,
                    total,
                },
            },
        };
    }

    async sendMessage(userId: string, dto: CreateMessageDto) {
        let threadId = dto.thread_id;

        // Verify if provided thread_id actually exists in database
        if (threadId) {
            const { data: existing } = await this.supabase.client
                .from('chat_threads')
                .select('id')
                .eq('id', threadId)
                .maybeSingle();

            if (!existing) {
                this.logger.warn(`Thread ID ${threadId} does not exist in chat_threads table.`);
                threadId = undefined; // Reset threadId so we can attempt auto-creation if request_id is present
            }
        }

        // If thread_id is missing/invalid but request_id is provided, find or create thread
        if (!threadId && dto.request_id) {
            const { data: request } = await this.supabase.client
                .from('blood_requests')
                .select('requester_id')
                .eq('id', dto.request_id)
                .single();

            if (!request) {
                throw new NotFoundException('Blood request not found');
            }

            const requesterId = request.requester_id;
            const donorId = userId;

            // Check if thread exists
            const { data: existingThread } = await this.supabase.client
                .from('chat_threads')
                .select('id')
                .eq('request_id', dto.request_id)
                .or(`and(requester_id.eq.${requesterId},donor_id.eq.${donorId}),and(requester_id.eq.${donorId},donor_id.eq.${requesterId})`)
                .maybeSingle();

            if (existingThread) {
                threadId = existingThread.id;
            } else {
                const { data: newThread, error: createError } = await this.supabase.client
                    .from('chat_threads')
                    .insert({
                        request_id: dto.request_id,
                        requester_id: requesterId,
                        donor_id: donorId,
                        last_message: dto.text,
                        last_message_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (createError) {
                    throw new BadRequestException(`Could not create chat thread: ${createError.message}`);
                }
                threadId = newThread.id;
            }
        }

        if (!threadId) {
            throw new NotFoundException('Chat thread not found. Please provide a valid request_id to start a thread.');
        }

        // Insert message
        const { data: message, error: messageError } = await this.supabase.client
            .from('chat_messages')
            .insert({
                thread_id: threadId,
                sender_id: userId,
                text: dto.text,
                sent_at: new Date().toISOString(),
                is_read: false,
            })
            .select()
            .single();

        if (messageError) {
            this.logger.error(`Error sending chat message in thread ${threadId}`, messageError.message);
            throw new BadRequestException(`Could not send message: ${messageError.message}`);
        }

        // Update thread last message
        await this.supabase.client
            .from('chat_threads')
            .update({
                last_message: dto.text,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', threadId);

        // Fetch thread details to trigger Push Notification for chat message recipient
        try {
            const { data: thread } = await this.supabase.client
                .from('chat_threads')
                .select('requester_id, donor_id, request_id')
                .eq('id', threadId)
                .single();

            if (thread) {
                const recipientId = thread.requester_id === userId ? thread.donor_id : thread.requester_id;

                // Fetch sender name
                const { data: senderProfile } = await this.supabase.client
                    .from('profiles')
                    .select('full_name')
                    .eq('id', userId)
                    .single();

                const senderName = senderProfile?.full_name || 'Someone';

                await this.notificationService.sendToUser(
                    recipientId,
                    `💬 ${senderName}`,
                    dto.text,
                    {
                        type: 'chat_message',
                        thread_id: threadId,
                        request_id: thread.request_id,
                    }
                );
            }
        } catch (notifErr) {
            this.logger.warn(`Failed to send push notification for chat message: ${notifErr.message}`);
        }

        return {
            success: true,
            data: message,
        };
    }
}
