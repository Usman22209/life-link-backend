import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DonorFilterDto } from './dto/donor-filter.dto';
import { resolveLocation } from '../common/utils/location.util';

const ABSTRACT_API_KEY = '9f114730630d45688a0f25dc3aac9a7e';

function generateAbstractAvatarUrl(name: string): string {
    const formattedName = encodeURIComponent(name && name.trim().length > 0 ? name.trim() : 'User');
    return `https://avatars.abstractapi.com/v1/?api_key=${ABSTRACT_API_KEY}&name=${formattedName}`;
}

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async getProfile(userId: string) {
        const { data, error } = await this.supabase.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        let profileData = data;
        let email = data?.email || '';

        if (!email) {
            try {
                const { data: authUserData } = await this.supabase.client.auth.admin.getUserById(userId);
                email = authUserData?.user?.email || '';
            } catch (authErr) {
                this.logger.warn(`Could not fetch email from auth.users: ${authErr.message}`);
            }
        }

        if (!profileData) {
            const userName = email ? email.split('@')[0] : 'User';
            profileData = {
                id: userId,
                email,
                is_onboarded: false,
                full_name: '',
                phone: '',
                gender: null,
                dob: null,
                blood_group: null,
                country: null,
                state: null,
                city_id: null,
                latitude: null,
                longitude: null,
                profile_image: generateAbstractAvatarUrl(userName),
                language_preference: 'en',
                notifications_enabled: true,
            };
        } else if (!profileData.profile_image) {
            const userName = profileData.full_name || email.split('@')[0] || 'User';
            profileData.profile_image = generateAbstractAvatarUrl(userName);
        }

        // Fetch completed donations stats
        const { data: donations } = await this.supabase.client
            .from('donations')
            .select('created_at, updated_at')
            .eq('donor_id', userId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });

        const donationsCount = donations?.length || 0;
        const livesSaved = donationsCount * 3;

        let lastDonatedAt: string | null = null;
        let isEligible = true;
        let nextEligibleDate: string | null = null;

        if (donations && donations.length > 0) {
            const lastDonation = donations[0];
            const lastDate = new Date(lastDonation.updated_at || lastDonation.created_at);
            lastDonatedAt = lastDate.toISOString().split('T')[0];

            const nextEligible = new Date(lastDate);
            nextEligible.setDate(nextEligible.getDate() + 90);
            nextEligibleDate = nextEligible.toISOString().split('T')[0];

            isEligible = new Date() >= nextEligible;
        } else if (profileData.last_donated_at) {
            const lastDate = new Date(profileData.last_donated_at);
            if (!isNaN(lastDate.getTime())) {
                lastDonatedAt = profileData.last_donated_at;
                const nextEligible = new Date(lastDate);
                nextEligible.setDate(nextEligible.getDate() + 90);
                nextEligibleDate = nextEligible.toISOString().split('T')[0];
                isEligible = new Date() >= nextEligible;
            }
        }

        // Automatic Age Evaluation from Date of Birth (must be 17-65)
        if (profileData.dob) {
            const birthDate = new Date(profileData.dob);
            if (!isNaN(birthDate.getTime())) {
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                if (age < 17 || age > 65) {
                    isEligible = false;
                }
            }
        }

        const loc = resolveLocation(profileData.city_id, profileData.city, profileData.state, profileData.country);
        return {
            success: true,
            data: {
                ...profileData,
                city_id: profileData.city_id || loc.city_id,
                city: loc.city,
                city_name: loc.city_name,
                state: loc.state,
                country: loc.country,
                location_formatted: loc.location_formatted,
                email: email || profileData.email,
                stats: {
                    donations_count: donationsCount,
                    lives_saved: livesSaved,
                    last_donated_at: lastDonatedAt,
                    is_eligible: isEligible,
                    next_eligible_date: nextEligibleDate,
                },
            },
        };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        // Fetch existing profile to check profile_image and full_name
        const { data: existingProfile } = await this.supabase.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        let email = existingProfile?.email || '';
        if (!email) {
            try {
                const { data: authUserData } = await this.supabase.client.auth.admin.getUserById(userId);
                email = authUserData?.user?.email || '';
            } catch (authErr) {
                this.logger.warn(`Could not fetch email from auth.users: ${authErr.message}`);
            }
        }

        let profileImage = dto.profile_image || existingProfile?.profile_image;
        if (!profileImage) {
            const name = dto.full_name || existingProfile?.full_name || (email ? email.split('@')[0] : 'User');
            profileImage = generateAbstractAvatarUrl(name);
        }

        const payload: any = {
            id: userId,
            ...dto,
            profile_image: profileImage,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await this.supabase.client
            .from('profiles')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            this.logger.error(`Error updating profile for user ${userId}`, error.message);
            throw new BadRequestException(`Could not update profile: ${error.message}`);
        }

        return {
            success: true,
            message: 'Profile updated successfully.',
            data: {
                ...data,
                email: email || data.email,
            },
        };
    }

    async deleteProfile(userId: string) {
        this.logger.log(`Initiating account deletion for user ${userId}`);

        // 1. Cancel all open blood requests created by this user so donors don't see orphaned requests
        await this.supabase.client
            .from('blood_requests')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('requester_id', userId)
            .eq('status', 'open');

        // 2. Delete user profile record (Cascades to notifications & chat threads via FK ON DELETE CASCADE)
        const { error: profileError } = await this.supabase.client
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            this.logger.error(`Error deleting profile for user ${userId}`, profileError.message);
            throw new BadRequestException(`Could not delete profile: ${profileError.message}`);
        }

        // 3. Delete user account from Supabase Auth admin so credentials & JWT tokens are permanently revoked
        try {
            await this.supabase.client.auth.admin.deleteUser(userId);
        } catch (authErr) {
            this.logger.warn(`Could not delete user ${userId} from Auth admin: ${authErr.message}`);
        }

        return {
            success: true,
            message: 'User account and associated profile permanently deleted.',
        };
    }

    async updateSettings(userId: string, dto: UpdateSettingsDto) {
        const { data, error } = await this.supabase.client
            .from('profiles')
            .update({
                ...dto,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            this.logger.error(`Error updating settings for user ${userId}`, error.message);
            throw new BadRequestException(`Could not update settings: ${error.message}`);
        }

        return {
            success: true,
            message: 'Settings updated.',
            data,
        };
    }

    async getDonors(filter: DonorFilterDto) {
        let countQuery = this.supabase.client
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        let dataQuery = this.supabase.client
            .from('profiles')
            .select('*');

        if (filter.blood_group && filter.blood_group !== 'All' && filter.blood_group !== 'all') {
            countQuery = countQuery.eq('blood_group', filter.blood_group);
            dataQuery = dataQuery.eq('blood_group', filter.blood_group);
        }

        if (filter.city_id && filter.city_id !== 'All' && filter.city_id !== 'all') {
            countQuery = countQuery.eq('city_id', filter.city_id);
            dataQuery = dataQuery.eq('city_id', filter.city_id);
        }

        if (filter.is_available !== undefined) {
            countQuery = countQuery.eq('is_available', filter.is_available);
            dataQuery = dataQuery.eq('is_available', filter.is_available);
        }

        if (filter.search && filter.search.trim()) {
            const pattern = `%${filter.search.trim()}%`;
            const filterStr = `full_name.ilike.${pattern},phone.ilike.${pattern},city.ilike.${pattern},city_id.ilike.${pattern},state.ilike.${pattern}`;
            countQuery = countQuery.or(filterStr);
            dataQuery = dataQuery.or(filterStr);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
            this.logger.error(`Error counting donors: ${countError.message}`);
        }

        const limit = filter.limit ?? 10;
        const page = filter.page ?? 1;
        const skip = filter.skip ?? (page - 1) * limit;

        const { data: profiles, error } = await dataQuery
            .order('created_at', { ascending: false })
            .range(skip, skip + limit - 1);

        if (error) {
            this.logger.error(`Error fetching donors list: ${error.message}`);
            throw new BadRequestException(`Could not fetch donors: ${error.message}`);
        }

        // Fetch donation stats for donors
        const donorIds = (profiles || []).map((p) => p.id);
        const { data: donations } = await this.supabase.client
            .from('donations')
            .select('donor_id, created_at, updated_at, status')
            .in('donor_id', donorIds.length > 0 ? donorIds : ['00000000-0000-0000-0000-000000000000'])
            .eq('status', 'completed');

        const donorStatsMap: { [key: string]: { count: number; lastDate: string | null } } = {};
        (donations || []).forEach((d) => {
            if (!donorStatsMap[d.donor_id]) {
                donorStatsMap[d.donor_id] = { count: 0, lastDate: null };
            }
            donorStatsMap[d.donor_id].count++;
            const dateStr = d.updated_at || d.created_at;
            if (!donorStatsMap[d.donor_id].lastDate || new Date(dateStr) > new Date(donorStatsMap[d.donor_id].lastDate!)) {
                donorStatsMap[d.donor_id].lastDate = dateStr;
            }
        });

        const formattedDonors = (profiles || []).map((profile) => {
            const statsInfo = donorStatsMap[profile.id];
            const donationsCount = statsInfo?.count || 0;
            const livesSaved = donationsCount * 3;
            let lastDonatedAt = profile.last_donated_at || (statsInfo?.lastDate ? new Date(statsInfo.lastDate).toISOString().split('T')[0] : null);
            let isEligible = true;
            let nextEligibleDate: string | null = null;

            if (lastDonatedAt) {
                const lastDate = new Date(lastDonatedAt);
                const nextEligible = new Date(lastDate);
                nextEligible.setDate(nextEligible.getDate() + 90);
                nextEligibleDate = nextEligible.toISOString().split('T')[0];
                isEligible = new Date() >= nextEligible;
            }

            const loc = resolveLocation(profile.city_id, profile.city, profile.state, profile.country);
            return {
                ...profile,
                city_id: profile.city_id || loc.city_id,
                city: loc.city,
                city_name: loc.city_name,
                state: loc.state,
                country: loc.country,
                location_formatted: loc.location_formatted,
                is_available: profile.is_available !== false,
                is_verified: profile.is_verified !== false,
                is_suspended: profile.is_suspended === true,
                is_banned: profile.is_banned === true,
                stats: {
                    donations_count: donationsCount,
                    lives_saved: livesSaved,
                    last_donated_at: lastDonatedAt,
                    is_eligible: isEligible,
                    next_eligible_date: nextEligibleDate,
                },
            };
        });

        const total = count ?? 0;
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                donors: formattedDonors,
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

    async updateAvailability(userId: string, isAvailable: boolean) {
        try {
            const { data, error } = await this.supabase.client
                .from('profiles')
                .update({
                    is_available: isAvailable,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select()
                .single();

            if (!error && data) {
                return {
                    success: true,
                    message: `Donor availability updated to ${isAvailable ? 'available' : 'unavailable'}.`,
                    data: {
                        id: userId,
                        is_available: isAvailable,
                        profile: data,
                    },
                };
            }
        } catch { }

        // Fallback update
        await this.supabase.client
            .from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', userId);

        return {
            success: true,
            message: `Donor availability updated to ${isAvailable ? 'available' : 'unavailable'}.`,
            data: {
                id: userId,
                is_available: isAvailable,
            },
        };
    }
}
