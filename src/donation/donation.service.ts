import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationService } from '../notification/notification.service';
import { DonationStatus } from './dto/update-donation-status.dto';

@Injectable()
export class DonationService {
    private readonly logger = new Logger(DonationService.name);

    constructor(
        private readonly supabase: SupabaseService,
        private readonly notificationService: NotificationService,
    ) { }

    async acceptRequest(donorId: string, requestId: string) {
        // 1. Check if request exists and is open
        const { data: request, error: requestError } = await this.supabase.client
            .from('blood_requests')
            .select('requester_id, status, patient_name')
            .eq('id', requestId)
            .single();

        if (requestError || !request) {
            throw new NotFoundException('Blood request not found');
        }

        if (request.status !== 'open' && request.status !== 'partially_fulfilled') {
            throw new BadRequestException('This request is no longer open for donations');
        }

        // 2. Prevent requester from accepting their own request
        if (request.requester_id === donorId) {
            throw new BadRequestException('You cannot accept your own blood request');
        }

        // 3. Create donation record
        const { data: donation, error: donationError } = await this.supabase.client
            .from('donations')
            .insert({
                request_id: requestId,
                donor_id: donorId,
                status: DonationStatus.INTENT,
            })
            .select()
            .single();

        if (donationError) {
            this.logger.error(`Error creating donation for user ${donorId} on request ${requestId}`, donationError.message);
            throw new BadRequestException(`Could not accept request: ${donationError.message}`);
        }

        // 4. Notify the requester
        try {
            const { data: donorProfile } = await this.supabase.client
                .from('profiles')
                .select('full_name')
                .eq('id', donorId)
                .single();

            const donorName = donorProfile?.full_name || 'A donor';
            await this.notificationService.sendToUser(
                request.requester_id,
                'Donation Accepted! 🩸',
                `${donorName} has offered to help with your request for ${request.patient_name || 'blood'}.`
            );
        } catch (notifyError) {
            this.logger.warn(`Failed to notify requester ${request.requester_id}: ${notifyError.message}`);
        }

        return {
            success: true,
            message: 'You have successfully offered to help!',
            data: donation,
        };
    }

    async getDonationsByRequest(userId: string, requestId: string) {
        // Verify ownership of the request
        const { data: request, error: requestError } = await this.supabase.client
            .from('blood_requests')
            .select('requester_id')
            .eq('id', requestId)
            .single();

        if (requestError || !request) {
            throw new NotFoundException('Blood request not found');
        }

        if (request.requester_id !== userId) {
            throw new ForbiddenException('You only view applications for requests you created');
        }

        const { data, error } = await this.supabase.client
            .from('donations')
            .select(`
        *,
        donor:profiles(id, full_name, profile_image, phone, blood_group)
      `)
            .eq('request_id', requestId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new BadRequestException(`Could not fetch donations: ${error.message}`);
        }

        return {
            success: true,
            data,
        };
    }

    async updateStatus(userId: string, donationId: string, status: DonationStatus) {
        // 1. Fetch donation and related request
        const { data: donation, error: fetchError } = await this.supabase.client
            .from('donations')
            .select('*, blood_requests(requester_id)')
            .eq('id', donationId)
            .single();

        if (fetchError || !donation) {
            throw new NotFoundException('Donation record not found');
        }

        const isDonor = donation.donor_id === userId;
        const isRequester = donation.blood_requests.requester_id === userId;

        if (!isDonor && !isRequester) {
            throw new ForbiddenException('You do not have permission to update this donation');
        }

        // 2. Permission checks:
        // - Only donor can cancel (intent -> cancelled)
        // - Only requester can complete (intent -> completed)
        if (status === DonationStatus.CANCELLED && !isDonor) {
            throw new ForbiddenException('Only the donor can cancel their intent');
        }
        if (status === DonationStatus.COMPLETED && !isRequester) {
            throw new ForbiddenException('Only the requester can mark a donation as completed');
        }

        // 3. Update donation
        const { data, error } = await this.supabase.client
            .from('donations')
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', donationId)
            .select()
            .single();

        if (error) {
            throw new BadRequestException(`Could not update donation: ${error.message}`);
        }

        return {
            success: true,
            message: `Donation status updated to ${status}`,
            data,
        };
    }
}
