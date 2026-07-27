import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { UpdateBloodRequestDto, BloodRequestStatus } from './dto/update-blood-request.dto';
import { PaginationDto } from './dto/pagination.dto';

function calculateDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number): string {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 'N/A';
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return `${d.toFixed(1)} km`;
}

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
            message: 'Blood request created successfully.',
            data,
        };
    }

    async getFeed(pagination: PaginationDto) {
        const requestStatus = pagination.status || BloodRequestStatus.OPEN;

        let countQuery = this.supabase.client
            .from('blood_requests')
            .select('*', { count: 'exact', head: true });

        let dataQuery = this.supabase.client
            .from('blood_requests')
            .select(`
                *,
                requester:profiles(id, phone, blood_group, city_id, profile_image)
            `);

        if (requestStatus && requestStatus !== 'all') {
            countQuery = countQuery.eq('status', requestStatus);
            dataQuery = dataQuery.eq('status', requestStatus);
        }

        const bGroup = pagination.blood_group;
        const urg = pagination.urgency;
        const cId = pagination.city_id;
        const searchTerm = pagination.search;

        if (bGroup && bGroup !== 'All') {
            countQuery = countQuery.eq('blood_group', bGroup);
            dataQuery = dataQuery.eq('blood_group', bGroup);
        }
        if (urg && urg !== 'All') {
            countQuery = countQuery.eq('urgency', urg.toLowerCase());
            dataQuery = dataQuery.eq('urgency', urg.toLowerCase());
        }
        if (cId && cId !== 'All') {
            countQuery = countQuery.eq('city_id', cId);
            dataQuery = dataQuery.eq('city_id', cId);
        }
        if (searchTerm && searchTerm.trim()) {
            const pattern = `%${searchTerm.trim()}%`;
            const filterStr = `patient_name.ilike.${pattern},hospital_name.ilike.${pattern},hospital_address.ilike.${pattern},description.ilike.${pattern},city_id.ilike.${pattern}`;
            countQuery = countQuery.or(filterStr);
            dataQuery = dataQuery.or(filterStr);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
            this.logger.error(`Could not fetch count for feed`, countError.message);
        }

        const limit = pagination.limit ?? 10;
        const page = pagination.page ?? 1;
        const skip = pagination.skip ?? (page - 1) * limit;

        const rawSort = pagination.sort_by?.toLowerCase() || 'created_at';
        const isNearestSort = rawSort === 'nearest';

        let requestsList: any[] = [];
        const total = count ?? 0;
        const totalPages = Math.ceil(total / limit);

        if (isNearestSort) {
            // When sorting by 'nearest', fetch matching filtered dataset, compute distance for ALL records,
            // sort by distance ASC, and THEN apply pagination slicing so nearest items on Page 2 move to Page 1!
            const { data, error } = await dataQuery.order('created_at', { ascending: false });

            if (error) {
                this.logger.error(`Error fetching blood request feed for nearest sorting`, error.message);
                throw new BadRequestException(`Could not fetch feed: ${error.message}`);
            }

            const mapped = (data || []).map((req: any) => {
                const distanceStr = calculateDistance(pagination.lat, pagination.lng, req.latitude, req.longitude);
                const distNum = parseFloat(distanceStr) || 999999;
                return {
                    ...req,
                    distance: distanceStr,
                    distance_km: distNum,
                };
            });

            // Sort entire matching set by distance ascending
            mapped.sort((a: any, b: any) => a.distance_km - b.distance_km);

            // Slice for current page
            requestsList = mapped.slice(skip, skip + limit);
        } else {
            // Standard column sorting (created_at, units_required, urgency) via SQL range
            const sortColumn =
                rawSort === 'most_units'
                    ? 'units_required'
                    : rawSort === 'urgency'
                    ? 'urgency'
                    : 'created_at';

            const isAscending = pagination.sort_order === 'asc';

            const { data, error } = await dataQuery
                .order(sortColumn, { ascending: isAscending })
                .range(skip, skip + limit - 1);

            if (error) {
                this.logger.error(`Error fetching blood request feed`, error.message);
                throw new BadRequestException(`Could not fetch feed: ${error.message}`);
            }

            requestsList = (data || []).map((req: any) => {
                const distanceStr = calculateDistance(pagination.lat, pagination.lng, req.latitude, req.longitude);
                const distNum = parseFloat(distanceStr) || 999999;
                return {
                    ...req,
                    distance: distanceStr,
                    distance_km: distNum,
                };
            });
        }

        return {
            success: true,
            message: 'Feed fetched successfully.',
            data: {
                requests: requestsList,
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

    async getUrgentRequests(limit: number = 5, lat?: number, lng?: number) {
        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .select(`
                *,
                requester:profiles(full_name, profile_image, city_id, state)
            `)
            .eq('status', BloodRequestStatus.OPEN)
            .in('urgency', ['critical', 'high'])
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            this.logger.error('Error fetching urgent requests', error.message);
            throw new BadRequestException(`Could not fetch urgent requests: ${error.message}`);
        }

        const formatted = (data || []).map((req: any) => {
            const distanceStr = calculateDistance(lat, lng, req.latitude, req.longitude);
            return {
                id: req.id,
                bloodType: req.blood_group,
                patientName: req.patient_name || 'Patient',
                hospital: req.hospital_name,
                city: req.city_id || 'Lahore',
                state: req.requester?.state || 'Punjab',
                patientImage: req.requester?.profile_image || 'https://cdn.lifelink.org/avatars/patient1.jpg',
                units: req.units_required,
                urgency: req.urgency,
                time: timeAgo(req.created_at),
                distance: distanceStr,
                latitude: req.latitude,
                longitude: req.longitude,
            };
        });

        return {
            success: true,
            data: formatted,
        };
    }

    async getMyRequests(userId: string, pagination: PaginationDto) {
        const { count, error: countError } = await this.supabase.client
            .from('blood_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requester_id', userId);

        if (countError) {
            throw new BadRequestException(`Could not fetch count: ${countError.message}`);
        }

        const limit = pagination.limit ?? 10;
        const page = pagination.page ?? 1;
        const skip = pagination.skip ?? (page - 1) * limit;

        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .select('*')
            .eq('requester_id', userId)
            .order('created_at', { ascending: false })
            .range(skip, skip + limit - 1);

        if (error) {
            this.logger.error(`Error fetching my blood requests for user ${userId}`, error.message);
            throw new BadRequestException(`Could not fetch your requests: ${error.message}`);
        }

        const total = count ?? 0;
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                requests: data || [],
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

    async getOne(id: string) {
        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .select(`
                *,
                requester:profiles(id, phone, blood_group, city_id, profile_image)
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
            message: 'Blood request updated successfully.',
            data,
        };
    }
}
