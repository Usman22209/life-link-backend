import { resolveLocation } from '../common/utils/location.util';
import { getCompatibleDonors } from '../common/utils/blood-compatibility.util';
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
            const { data: notifData, error: dbErr } = await this.supabase.client
                .from('notifications')
                .insert({
                    user_id: userId,
                    type: extraData.type || 'system',
                    title,
                    body: content,
                    is_read: false,
                    urgency: extraData.urgency || null,
                    blood_group: extraData.bloodType || extraData.blood_group || null,
                    hospital_name: extraData.hospital || extraData.hospital_name || null,
                    request_id: extraData.request_id || null,
                })
                .select()
                .maybeSingle();

            if (dbErr) {
                this.logger.error(`Failed to insert notification record in DB for user ${userId}: ${JSON.stringify(dbErr)}`);
            } else {
                this.logger.log(`Successfully inserted notification ${notifData?.id} for user ${userId}`);
            }
        } catch (dbErr) {
            this.logger.warn(`Exception inserting notification record in DB: ${dbErr.message}`);
        }

        // 2. Check if user has disabled notifications
        try {
            const { data: recipientProfile } = await this.supabase.client
                .from('profiles')
                .select('notifications_enabled')
                .eq('id', userId)
                .maybeSingle();

            if (recipientProfile && recipientProfile.notifications_enabled === false) {
                this.logger.log(`User ${userId} has push notifications disabled. Skipping push.`);
                return { success: true, skipped: true };
            }
        } catch (checkErr) {
            this.logger.warn(`Could not check notifications_enabled for user ${userId}: ${checkErr.message}`);
        }

        // 3. Push via OneSignal
        if (!this.apiKey || !this.appId) {
            this.logger.warn('OneSignal credentials missing in environment variables');
            return { success: true };
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    app_id: this.appId,
                    include_aliases: { external_id: [userId] },
                    include_external_user_ids: [userId],
                    target_channel: 'push',
                    headings: { en: title },
                    contents: { en: content },
                    data: extraData,
                }),
            });

            const data = await response.json();
            if (data.errors) {
                this.logger.warn(`OneSignal push response for user ${userId}: ${JSON.stringify(data.errors)}`);
            }
            return { success: true, id: data.id, details: data };
        } catch (error) {
            this.logger.error(`Failed to send push notification to user ${userId}`, error.stack);
            return { success: true, error: error.message };
        }
    }

    
    
    async notifyDonorsForRequest(request: any) {
        if (!request || !request.id) return { success: false, message: 'Invalid request' };

        const diffMs = request.required_date ? (new Date(request.required_date).getTime() - Date.now()) : null;
        const isCritical = (diffMs !== null && diffMs <= 24 * 60 * 60 * 1000) || request.urgency === 'critical' || request.urgency === 'urgent' || request.urgency === 'high';

        this.logger.log(`[notifyDonorsForRequest] Request ${request.id} (Urgency: ${request.urgency}) - sending to all users`);

        // 1. Fetch all eligible candidate users (non-admin, not the requester)
        let query = this.supabase.client
            .from('profiles')
            .select('id, full_name, blood_group, notifications_enabled, is_admin')
            .neq('id', request.requester_id)
            .or('is_admin.is.null,is_admin.eq.false');

        // If not critical, target medically compatible blood groups if available
        if (!isCritical && request.blood_group) {
            const compatibleGroups = getCompatibleDonors(request.blood_group);
            if (compatibleGroups && compatibleGroups.length > 0) {
                query = query.in('blood_group', compatibleGroups);
            }
        }

        const { data: candidates, error } = await query;
        if (error) {
            this.logger.error(`Error querying candidate users for request ${request.id}: ${error.message}`);
            return { success: false, error: error.message };
        }

        if (!candidates || candidates.length === 0) {
            this.logger.log(`No candidate users found for request ${request.id}`);
            return { success: true, count: 0 };
        }

        const notifType = isCritical ? 'urgent_request' : 'blood_request';
        const title = isCritical
            ? `🚨 Critical: ${request.blood_group || 'Blood'} Needed!`
            : `🩸 Blood Request: ${request.blood_group || 'Blood'} Needed`;

        const body = `${request.patient_name || 'A patient'} urgently needs ${request.units_required || 1} unit(s) of ${request.blood_group || ''} blood at ${request.hospital_name || 'Hospital'}.`;

        // 2. Bulk insert in-app notifications for all candidate users
        const notificationRows = candidates.map((u: any) => ({
            user_id: u.id,
            type: notifType,
            title,
            body,
            is_read: false,
            urgency: request.urgency || (isCritical ? 'critical' : 'normal'),
            blood_group: request.blood_group || null,
            hospital_name: request.hospital_name || null,
            request_id: request.id,
            created_at: new Date().toISOString(),
        }));

        for (let i = 0; i < notificationRows.length; i += 100) {
            const batch = notificationRows.slice(i, i + 100);
            const { error: insertErr } = await this.supabase.client
                .from('notifications')
                .insert(batch);
            if (insertErr) {
                this.logger.error(`Error inserting notifications batch: ${insertErr.message}`);
            }
        }
        this.logger.log(`Created ${notificationRows.length} in-app notification rows for request ${request.id}`);

        // 3. Send OneSignal push notification to all users
        if (this.apiKey && this.appId) {
            const pushUsers = candidates.filter((u: any) => u.notifications_enabled !== false);
            const userIds = pushUsers.map((u: any) => u.id);

            if (userIds.length > 0) {
                try {
                    const oneSignalPayload: any = {
                        app_id: this.appId,
                        include_aliases: { external_id: userIds },
                        include_external_user_ids: userIds,
                        target_channel: 'push',
                        headings: { en: title },
                        contents: { en: body },
                        priority: isCritical ? 10 : 7,
                        android_accent_color: 'FFE53935',
                        data: {
                            type: notifType,
                            request_id: request.id,
                            blood_group: request.blood_group,
                            urgency: request.urgency,
                            hospital_name: request.hospital_name,
                            patient_name: request.patient_name,
                        },
                    };

                    const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Key ${this.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(oneSignalPayload),
                    });
                    const pushResult = await response.json();
                    this.logger.log(`OneSignal push dispatched for request ${request.id}: ${JSON.stringify(pushResult)}`);
                } catch (pushErr) {
                    this.logger.error(`Failed to send OneSignal push for request ${request.id}: ${pushErr.message}`);
                }
            }
        }

        return {
            success: true,
            notified_count: candidates.length,
        };
    }

    async broadcastAlert(dto: {
        title: string;
        message: string;
        city?: string;
        blood_group?: string;
        urgency?: string;
    }) {
        const title = dto.title?.trim() || 'URGENT: Blood Donation Needed';
        const message = dto.message?.trim() || 'Emergency whole blood units needed. Please respond if available.';
        const urgency = dto.urgency || 'critical';
        const targetCity = dto.city?.toLowerCase().trim() || 'all';
        const targetGroup = dto.blood_group?.toUpperCase().trim() || 'ALL';

        // 1. Fetch non-admin candidate users from Supabase profiles
        let query = this.supabase.client
            .from('profiles')
            .select('id, full_name, city_id, blood_group, notifications_enabled, is_admin');

        // Exclude admin users
        query = query.or('is_admin.is.null,is_admin.eq.false');

        const isAllGroups = !targetGroup || targetGroup.toLowerCase() === 'all';
        if (!isAllGroups) {
            const compatibleGroups = getCompatibleDonors(targetGroup);
            if (compatibleGroups && compatibleGroups.length > 0) {
                query = query.in('blood_group', compatibleGroups);
            } else {
                query = query.eq('blood_group', targetGroup);
            }
        }

        const { data: allCandidates, error } = await query;
        if (error) {
            this.logger.error(`Error querying profiles for broadcast: ${error.message}`);
            throw new BadRequestException(`Could not query matching users: ${error.message}`);
        }

        const CITY_NAME_TO_IDS: Record<string, string[]> = {
            lahore: ['1172451', '1183539', 'city_lahore', 'lahore'],
            karachi: ['1174872', 'city_karachi', 'karachi'],
            islamabad: ['13406360', '1166993', 'city_islamabad', 'city_rawalpindi', 'islamabad', 'rawalpindi'],
            multan: ['10999891', 'city_multan', 'multan'],
            faisalabad: ['11726748', 'city_faisalabad', 'faisalabad'],
            peshawar: ['1168197', 'city_peshawar', 'peshawar'],
        };

        // Filter by city if not 'all'
        let targetUsers = allCandidates || [];
        const isAllCities = !targetCity || targetCity.toLowerCase() === 'all' || targetCity.toLowerCase().includes('all');
        if (!isAllCities) {
            const matchIds = CITY_NAME_TO_IDS[targetCity] || [targetCity];
            targetUsers = targetUsers.filter((u: any) => {
                if (!u.city_id) return true;
                const userCity = String(u.city_id).toLowerCase();
                return matchIds.some(id => userCity.includes(id) || id.includes(userCity));
            });
        }

        const notifiedRecipients = targetUsers.length > 0 ? targetUsers : (allCandidates || []);
        this.logger.log(`Broadcast targeted: matching=${targetUsers.length}, total_candidates=${allCandidates?.length || 0} (City: ${targetCity}, Group: ${targetGroup})`);

        // 2. Insert in-app notifications into Supabase table
        if (notifiedRecipients.length > 0) {
            const notificationRows = notifiedRecipients.map((u: any) => ({
                user_id: u.id,
                type: 'urgent_request',
                title,
                body: message,
                is_read: false,
                urgency,
                blood_group: targetGroup !== 'all' ? targetGroup : (u.blood_group || null),
                hospital_name: targetCity !== 'all' ? `${dto.city} Emergency Alert` : 'National Emergency Alert',
                created_at: new Date().toISOString(),
            }));

            const { error: insertErr } = await this.supabase.client
                .from('notifications')
                .insert(notificationRows);

            if (insertErr) {
                this.logger.warn(`Could not bulk insert notifications: ${insertErr.message}`);
            } else {
                this.logger.log(`Successfully inserted ${notificationRows.length} in-app notification rows.`);
            }
        }

        // 3. Dispatch Push Notification via OneSignal
        let pushResult: any = { skipped: false };
        if (this.apiKey && this.appId) {
            try {
                // Build a formatted headline with city and blood group context if specific
                let pushHeading = title;
                const badges: string[] = [];
                if (targetCity !== 'all') {
                    const capitalizedCity = targetCity.charAt(0).toUpperCase() + targetCity.slice(1);
                    badges.push(capitalizedCity);
                }
                if (targetGroup !== 'all') {
                    badges.push(targetGroup);
                }
                if (badges.length > 0 && !title.includes(badges[0])) {
                    pushHeading = `🚨 [${badges.join(' • ')}] ${title}`;
                }

                const oneSignalPayload: any = {
                    app_id: this.appId,
                    included_segments: ['Total Subscriptions'],
                    target_channel: 'push',
                    headings: { en: pushHeading },
                    contents: { en: message },
                    priority: 10,
                    android_accent_color: 'FFE53935',
                    data: {
                        type: 'urgent_request',
                        urgency,
                        city: targetCity,
                        blood_group: targetGroup,
                        broadcast: true,
                    },
                };

                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Key ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(oneSignalPayload),
                });

                pushResult = await response.json();
                this.logger.log(`OneSignal broadcast dispatched: ${JSON.stringify(pushResult)}`);
            } catch (pushErr) {
                this.logger.error(`OneSignal push failed: ${pushErr.message}`);
                pushResult = { error: pushErr.message };
            }
        }

        const successMessage = `Emergency broadcast dispatched successfully! Mobile push alert sent to all subscribers.`;
        return {
            success: true,
            message: successMessage,
            data: {
                message: successMessage,
                recipients_count: notifiedRecipients.length,
                city: targetCity,
                blood_group: targetGroup,
                push_result: pushResult,
            },
        };
    }

    async sendBroadcast(title: string, content: string, extraData: any = {}) {
        if (!this.apiKey || !this.appId) {
            this.logger.warn('OneSignal credentials missing in environment variables');
            return { success: true };
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    app_id: this.appId,
                    included_segments: ['Total Subscriptions'],
                    target_channel: 'push',
                    headings: { en: title },
                    contents: { en: content },
                    priority: 10,
                    android_accent_color: 'FFE53935',
                    data: extraData,
                }),
            });

            const data = await response.json();
            this.logger.log(`OneSignal broadcast dispatched. Response: ${JSON.stringify(data)}`);
            return { success: true, id: data.id, details: data };
        } catch (error) {
            this.logger.error('Failed to send broadcast push notification', error.stack);
            return { success: false, error: error.message };
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
