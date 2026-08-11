import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

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
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly appId: string | undefined;
    private readonly apiKey: string | undefined;
    private readonly apiUrl = 'https://api.onesignal.com/api/v1/notifications';

    constructor(
        private configService: ConfigService,
        private supabase: SupabaseService,
    ) {
        this.appId = this.configService.get<string>('ONESIGNAL_APP_ID');
        this.apiKey = this.configService.get<string>('ONE_SIGNAL_API_KEY');
    }

    async sendToUser(userId: string, title: string, content: string, extraData: any = {}) {
        // 1. Store in DB
        try {
            await this.supabase.client
                .from('notifications')
                .insert({
                    user_id: userId,
                    type: extraData.type || 'system',
                    title,
                    body: content,
                    is_read: false,
                    urgency: extraData.urgency,
                    blood_group: extraData.bloodType || extraData.blood_group,
                    hospital_name: extraData.hospital || extraData.hospital_name,
                    request_id: extraData.request_id,
                });
        } catch (dbErr) {
            this.logger.warn(`Failed to insert notification record in DB: ${dbErr.message}`);
        }

        // 2. Push via OneSignal
        if (!this.apiKey || !this.appId) {
            this.logger.warn('OneSignal credentials missing in environment variables');
            return { success: true };
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    app_id: this.appId,
                    include_external_user_ids: [userId],
                    headings: { en: title },
                    contents: { en: content },
                    data: extraData,
                }),
            });

            const data = await response.json();
            return { success: true, id: data.id };
        } catch (error) {
            this.logger.error(`Failed to send push notification to user ${userId}`, error.stack);
            return { success: true, error: error.message };
        }
    }

    async getNotifications(userId: string) {
        const { data, error } = await this.supabase.client
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error(`Error fetching notifications for user ${userId}`, error.message);
            throw new BadRequestException(`Could not fetch notifications: ${error.message}`);
        }

        const formatted = (data || []).map((item: any) => ({
            id: item.id,
            type: item.type || 'blood_request',
            title: item.title,
            body: item.body,
            time: timeAgo(item.created_at),
            read: item.is_read,
            urgency: item.urgency,
            bloodType: item.blood_group,
            hospital: item.hospital_name,
            request_id: item.request_id,
            created_at: item.created_at,
        }));

        return {
            success: true,
            data: formatted,
        };
    }

    async getUnreadCount(userId: string) {
        const { count, error } = await this.supabase.client
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            this.logger.error(`Error counting unread notifications for user ${userId}`, error.message);
            throw new BadRequestException(`Could not get unread count: ${error.message}`);
        }

        return {
            success: true,
            data: {
                unreadCount: count || 0,
            },
        };
    }

    async markAsRead(userId: string, notificationId: string) {
        const { error } = await this.supabase.client
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) {
            throw new BadRequestException(`Could not mark notification as read: ${error.message}`);
        }

        return {
            success: true,
            message: 'Notification marked as read.',
        };
    }

    async markAllAsRead(userId: string) {
        const { error } = await this.supabase.client
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId);

        if (error) {
            throw new BadRequestException(`Could not clear notifications: ${error.message}`);
        }

        return {
            success: true,
            message: 'All notifications marked as read.',
        };
    }
}
