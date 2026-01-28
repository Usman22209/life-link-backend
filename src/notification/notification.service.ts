import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);
    private readonly appId: string | undefined;
    private readonly apiKey: string | undefined;
    private readonly apiUrl = 'https://api.onesignal.com/api/v1/notifications';

    constructor(private configService: ConfigService) {
        this.appId = this.configService.get<string>('ONESIGNAL_APP_ID');
        this.apiKey = this.configService.get<string>('ONE_SIGNAL_API_KEY');
    }

    /**
     * Sends a push notification to a specific user using their external_user_id.
     * @param userId The external_user_id (usually the Supabase user ID)
     * @param title The heading of the notification
     * @param content The main message content
     */
    async sendToUser(userId: string, title: string, content: string) {
        if (!this.apiKey || !this.appId) {
            this.logger.error('OneSignal credentials are missing in environment variables');
            return { success: false, error: 'Configuration missing' };
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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                this.logger.error(`OneSignal API error: ${JSON.stringify(data)}`);
                return { success: false, error: data };
            }

            this.logger.log(`Notification sent to user ${userId}: ${data.id}`);
            return { success: true, id: data.id };
        } catch (error) {
            this.logger.error(`Failed to send notification to user ${userId}`, error.stack);
            return { success: false, error: error.message };
        }
    }
}
