import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

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

        let lastDonatedAt: string | null = profileData?.last_donated_at || null;
        let isEligible = true;
        let nextEligibleDate: string | null = null;

        if (donations && donations.length > 0) {
            const lastDonation = donations[0];
            const lastDateStr = lastDonation.updated_at || lastDonation.created_at;
            if (!lastDonatedAt || new Date(lastDateStr) > new Date(lastDonatedAt)) {
                lastDonatedAt = new Date(lastDateStr).toISOString().split('T')[0];
            }
        }

        if (lastDonatedAt) {
            const lastDate = new Date(lastDonatedAt);
            const nextEligible = new Date(lastDate);
            nextEligible.setDate(nextEligible.getDate() + 90);
            nextEligibleDate = nextEligible.toISOString().split('T')[0];
            isEligible = new Date() >= nextEligible;
        }

        return {
            success: true,
            data: {
                ...profileData,
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
        const { error } = await this.supabase.client
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            this.logger.error(`Error deleting profile for user ${userId}`, error.message);
            throw new BadRequestException(`Could not delete profile: ${error.message}`);
        }

        return {
            success: true,
            message: 'User account permanently deleted.',
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
}
