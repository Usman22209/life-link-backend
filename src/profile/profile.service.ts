import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async getProfile(userId: string) {
        const { data, error } = await this.supabase.client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            this.logger.error(`Error fetching profile for user ${userId}`, error.message);
            if (error.code === 'PGRST116') {
                throw new NotFoundException('Profile not found');
            }
            throw new BadRequestException('Could not fetch profile');
        }

        return {
            success: true,
            profile: data,
        };
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        // We use upsert to create or update the profile
        const { data, error } = await this.supabase.client
            .from('profiles')
            .upsert({
                id: userId,
                ...dto,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            this.logger.error(`Error updating profile for user ${userId}`, error.message);
            throw new BadRequestException('Could not update profile');
        }

        return {
            success: true,
            message: 'Profile updated successfully',
            profile: data,
        };
    }
}
