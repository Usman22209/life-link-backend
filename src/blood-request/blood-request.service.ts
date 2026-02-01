import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { UpdateBloodRequestDto, BloodRequestStatus } from './dto/update-blood-request.dto';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class BloodRequestService {
    private readonly logger = new Logger(BloodRequestService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async create(userId: string, dto: CreateBloodRequestDto) {
        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .insert({
                requester_id: userId,
                ...dto,
                status: BloodRequestStatus.OPEN,
            })
            .select()
            .single();

        if (error) {
            this.logger.error(`Error creating blood request for user ${userId}`, error.message);
            throw new BadRequestException(`Could not create blood request: ${error.message}`);
        }

        return {
            success: true,
            message: 'Blood request created successfully',
            data,
        };
    }

    async getFeed(pagination: PaginationDto) {
        // 1. Get total count for metadata
        const { count, error: countError } = await this.supabase.client
            .from('blood_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', BloodRequestStatus.OPEN);

        if (countError) {
            throw new BadRequestException(`Could not fetch count: ${countError.message}`);
        }

        // 2. Fetch paginated data
        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .select(`
        id,
        blood_group,
        urgency,
        units_required,
        hospital_name,
        city_id,
        latitude,
        longitude,
        created_at,
        status,
        patient_name,
        required_date,
        requester:profiles(full_name, profile_image)
      `)
            .eq('status', BloodRequestStatus.OPEN)
            .order('created_at', { ascending: false })
            .range(pagination.skip, pagination.skip + (pagination.limit ?? 10) - 1);

        if (error) {
            this.logger.error(`Error fetching blood request feed`, error.message);
            throw new BadRequestException(`Could not fetch feed: ${error.message}`);
        }

        const total = count ?? 0;
        const limit = pagination.limit ?? 10;
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data,
            meta: {
                total,
                page: pagination.page,
                limit,
                totalPages,
            }
        };
    }

    async getMyRequests(userId: string, pagination: PaginationDto) {
        // 1. Get total count
        const { count, error: countError } = await this.supabase.client
            .from('blood_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requester_id', userId);

        if (countError) {
            throw new BadRequestException(`Could not fetch count: ${countError.message}`);
        }

        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .select('*')
            .eq('requester_id', userId)
            .order('created_at', { ascending: false })
            .range(pagination.skip, pagination.skip + (pagination.limit ?? 10) - 1);

        if (error) {
            this.logger.error(`Error fetching my blood requests for user ${userId}`, error.message);
            throw new BadRequestException(`Could not fetch your requests: ${error.message}`);
        }

        const total = count ?? 0;
        const limit = pagination.limit ?? 10;
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data,
            meta: {
                total,
                page: pagination.page,
                limit,
                totalPages,
            }
        };
    }

    async getOne(id: string) {
        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .select(`
        *,
        requester:profiles(full_name, profile_image)
      `)
            .eq('id', id)
            .single();

        if (error) {
            this.logger.error(`Error fetching blood request ${id}`, error.message);
            if (error.code === 'PGRST116') {
                throw new NotFoundException('Blood request not found');
            }
            throw new BadRequestException(`Could not fetch blood request: ${error.message}`);
        }

        return {
            success: true,
            data,
        };
    }

    async update(userId: string, id: string, dto: UpdateBloodRequestDto) {
        // First, verify ownership
        const { data: request, error: fetchError } = await this.supabase.client
            .from('blood_requests')
            .select('requester_id')
            .eq('id', id)
            .single();

        if (fetchError || !request) {
            throw new NotFoundException('Blood request not found');
        }

        if (request.requester_id !== userId) {
            throw new ForbiddenException('You do not have permission to update this request');
        }

        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .update({
                ...dto,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            this.logger.error(`Error updating blood request ${id}`, error.message);
            throw new BadRequestException(`Could not update blood request: ${error.message}`);
        }

        return {
            success: true,
            message: 'Blood request updated successfully',
            data,
        };
    }
}
