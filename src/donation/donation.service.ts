import { isBloodCompatible } from '../common/utils/blood-compatibility.util';
import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationService } from '../notification/notification.service';
import { DonationStatus } from './dto/update-donation-status.dto';
import { resolveLocation } from '../common/utils/location.util';

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
            .select('requester_id, status, patient_name, blood_group')
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

        // Check donor eligibility (90-day cooldown)
        const { data: donorProfile } = await this.supabase.client
            .from('profiles')
            .select('last_donated_at, blood_group')
            .eq('id', donorId)
            .maybeSingle();

        if (donorProfile?.last_donated_at) {
            const lastDate = new Date(donorProfile.last_donated_at);
            const nextEligible = new Date(lastDate);
            nextEligible.setDate(nextEligible.getDate() + 90);
            if (new Date() < nextEligible) {
                const formattedDate = nextEligible.toISOString().split('T')[0];
                throw new BadRequestException(`You cannot donate blood yet. Your 90-day cooldown period ends on ${formattedDate}.`);
            }
        }

        // Check medical ABO/Rh blood compatibility
        if (donorProfile?.blood_group && request.blood_group) {
            if (!isBloodCompatible(donorProfile.blood_group, request.blood_group)) {
                throw new BadRequestException(
                    `Your blood group (${donorProfile.blood_group}) is not medically compatible with this patient's blood group (${request.blood_group}). Only compatible donors can pledge donations.`
                );
            }
        }

        // 2b. Prevent multiple donations by the same donor for the same request
        const { data: existingDonation } = await this.supabase.client
            .from('donations')
            .select('id, status')
            .eq('request_id', requestId)
            .eq('donor_id', donorId)
            .neq('status', 'cancelled')
            .maybeSingle();

        if (existingDonation) {
            if (existingDonation.status === 'completed') {
                throw new BadRequestException('You have already completed a donation for this request.');
            }
            throw new BadRequestException('You have already pledged to donate for this blood request.');
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
            message: 'Donation intent registered.',
            data: donation,
        };
    }

    async getMyDonations(donorId: string) {
        const { data, error } = await this.supabase.client
            .from('donations')
            .select(`
                id,
                created_at,
                updated_at,
                status,
                request:blood_requests(
                    id,
                    patient_name,
                    hospital_name,
                    city_id,
                    blood_group,
                    units_required,
                    urgency,
                    created_at
                )
            `)
            .eq('donor_id', donorId)
            .order('created_at', { ascending: false });

        if (error) {
            this.logger.error(`Error fetching donations for donor ${donorId}`, error.message);
            throw new BadRequestException(`Could not fetch donations: ${error.message}`);
        }

        const completedDonations = (data || []).filter((d: any) => d.status === 'completed');
        const totalDonations = completedDonations.length;
        const totalUnits = totalDonations; // 1 unit per donation by default
        const livesSaved = totalUnits * 3;

        let lastDonationDate: string | null = null;
        let isEligible = true;
        let nextEligibleDateStr: string | null = null;

        if (completedDonations.length > 0) {
            const lastRecord = completedDonations[0];
            const dateObj = new Date(lastRecord.updated_at || lastRecord.created_at);
            lastDonationDate = dateObj.toISOString().split('T')[0];

            const nextEligible = new Date(dateObj);
            nextEligible.setDate(nextEligible.getDate() + 90);
            isEligible = new Date() >= nextEligible;
            nextEligibleDateStr = nextEligible.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        const history = (data || []).map((d: any) => ({
            id: d.id,
            hospitalName: d.request?.hospital_name || 'Hospital',
            date: (d.updated_at || d.created_at).split('T')[0],
            units: 1,
            bloodType: d.request?.blood_group || 'O+',
            status: d.status,
            request: d.request ? {
                id: d.request.id,
                patientName: d.request.patient_name,
                hospital: d.request.hospital_name,
                city: d.request.city_id,
                bloodType: d.request.blood_group,
                units: d.request.units_required,
                urgency: d.request.urgency,
            } : null,
        }));

        return {
            success: true,
            data: {
                stats: {
                    totalDonations,
                    totalUnits,
                    livesSaved,
                    isEligible,
                    lastDonationDate,
                    nextEligibleDateStr,
                },
                history,
            },
        };
    }

    async getDonationsByRequest(userId: string, requestId: string) {
        const { data: request, error: requestError } = await this.supabase.client
            .from('blood_requests')
            .select('requester_id')
            .eq('id', requestId)
            .single();

        if (requestError || !request) {
            throw new NotFoundException('Blood request not found');
        }

        if (request.requester_id !== userId) {
            const { data: profile } = await this.supabase.client
                .from('profiles')
                .select('is_admin')
                .eq('id', userId)
                .maybeSingle();

            if (!profile?.is_admin) {
                throw new ForbiddenException('You only view applications for requests you created');
            }
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

        const rawDonations = data || [];

        // Enrich donor details directly from profiles table to ensure real full_name is always present
        const donations = await Promise.all(
            rawDonations.map(async (d: any) => {
                let donor = d.donor;
                if (!donor || !donor.full_name) {
                    const { data: donorProfile } = await this.supabase.client
                        .from('profiles')
                        .select('id, full_name, profile_image, phone, blood_group')
                        .eq('id', d.donor_id)
                        .maybeSingle();
                    if (donorProfile) {
                        donor = donorProfile;
                    }
                }
                return {
                    ...d,
                    donor: donor || {
                        id: d.donor_id,
                        full_name: 'Donor',
                    },
                };
            })
        );

        const stats = {
            total: donations.length,
            intent: donations.filter((d: any) => d.status === 'intent').length,
            completed: donations.filter((d: any) => d.status === 'completed').length,
            cancelled: donations.filter((d: any) => d.status === 'cancelled').length,
        };

        return {
            success: true,
            data: {
                request_id: requestId,
                donations,
                stats,
            },
        };
    }

    async updateStatus(userId: string, donationId: string, status: DonationStatus) {
        const { data: donation, error: fetchError } = await this.supabase.client
            .from('donations')
            .select('*, blood_requests(requester_id)')
            .eq('id', donationId)
            .single();

        if (fetchError || !donation) {
            throw new NotFoundException('Donation record not found');
        }

        const isDonor = donation.donor_id === userId;
        const isRequester = donation.blood_requests?.requester_id === userId;

        if (!isDonor && !isRequester) {
            throw new ForbiddenException('You do not have permission to update this donation');
        }

        if (status === DonationStatus.CANCELLED && !isDonor) {
            throw new ForbiddenException('Only the donor can cancel their intent');
        }
        if (status === DonationStatus.COMPLETED && !isRequester) {
            throw new ForbiddenException('Only the requester can mark a donation as completed');
        }

        const { data, error } = await this.supabase.client
            .from('donations')
            .update({
                status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', donationId)
            .select()
            .single();

        if (status === DonationStatus.COMPLETED) {
            // 1. Update donor's last_donated_at date in profiles table
            await this.supabase.client
                .from('profiles')
                .update({ last_donated_at: new Date().toISOString().split('T')[0] })
                .eq('id', donation.donor_id);

            // 2. Increment fulfilled_units on blood_requests
            const { data: bReq } = await this.supabase.client
                .from('blood_requests')
                .select('units_required, fulfilled_units')
                .eq('id', donation.request_id)
                .single();

            if (bReq) {
                const newFulfilled = (bReq.fulfilled_units || 0) + 1;
                const newReqStatus = newFulfilled >= bReq.units_required ? 'fulfilled' : 'partially_fulfilled';
                await this.supabase.client
                    .from('blood_requests')
                    .update({
                        fulfilled_units: newFulfilled,
                        status: newReqStatus,
                    })
                    .eq('id', donation.request_id);
            }
        }

        return {
            success: true,
            message: 'Donation status updated.',
            data,
        };
    }

    async getDonationHistory(pagination?: { page?: number; limit?: number; status?: string; search?: string }) {
        const page = pagination?.page ?? 1;
        const limit = pagination?.limit ?? 10;
        const skip = (page - 1) * limit;
        const statusFilter = pagination?.status;

        // 1. Fetch overall donation stats
        const { data: allDonations } = await this.supabase.client
            .from('donations')
            .select('status');

        const totalAll = allDonations?.length || 0;
        const completedCount = (allDonations || []).filter(d => d.status === 'completed').length;
        const intentCount = (allDonations || []).filter(d => d.status === 'intent').length;
        const cancelledCount = (allDonations || []).filter(d => d.status === 'cancelled').length;

        // 2. Query paginated list
        let countQuery = this.supabase.client
            .from('donations')
            .select('*', { count: 'exact', head: true });

        let dataQuery = this.supabase.client
            .from('donations')
            .select(`
                id,
                created_at,
                updated_at,
                status,
                request:blood_requests(
                    id,
                    patient_name,
                    blood_group,
                    hospital_name,
                    city_id,
                    urgency,
                    units_required,
                    fulfilled_units,
                    status
                ),
                donor:profiles(
                    id,
                    full_name,
                    phone,
                    blood_group,
                    city_id,
                    profile_image
                )
            `);

        if (statusFilter && statusFilter !== 'all') {
            countQuery = countQuery.eq('status', statusFilter.toLowerCase());
            dataQuery = dataQuery.eq('status', statusFilter.toLowerCase());
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
            this.logger.error(`Error counting donations: ${countError.message}`);
        }

        const { data: donations, error } = await dataQuery
            .order('created_at', { ascending: false })
            .range(skip, skip + limit - 1);

        if (error) {
            this.logger.error(`Error fetching donation history: ${error.message}`);
            throw new BadRequestException(`Could not fetch donation history: ${error.message}`);
        }

        const formattedDonations = (donations || []).map((d: any) => {
            const reqLoc = d.request ? resolveLocation(d.request.city_id, d.request.city, d.request.state, d.request.country) : null;
            const donorLoc = d.donor ? resolveLocation(d.donor.city_id, d.donor.city, d.donor.state, d.donor.country) : null;
            return {
                ...d,
                request: d.request ? {
                    ...d.request,
                    city: reqLoc?.city,
                    city_name: reqLoc?.city_name,
                    state: reqLoc?.state,
                    country: reqLoc?.country,
                    location_formatted: reqLoc?.location_formatted,
                } : d.request,
                donor: d.donor ? {
                    ...d.donor,
                    city: donorLoc?.city,
                    city_name: donorLoc?.city_name,
                    state: donorLoc?.state,
                    country: donorLoc?.country,
                    location_formatted: donorLoc?.location_formatted,
                } : d.donor,
            };
        });

        const total = count ?? 0;
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                donations: formattedDonations,
                stats: {
                    total: totalAll,
                    completed: completedCount,
                    intent: intentCount,
                    cancelled: cancelledCount,
                },
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            },
        };
    }
}
