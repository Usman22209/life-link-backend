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

function getDefaultRequiredDate(urgency?: string): string {
    const date = new Date();
    const urg = urgency?.toLowerCase();
    if (urg === 'critical') {
        date.setHours(date.getHours() + 48); // 48 Hours for Critical
    } else if (urg === 'high' || urg === 'urgent') {
        date.setDate(date.getDate() + 7); // 7 Days for High
    } else {
        date.setDate(date.getDate() + 14); // 14 Days for Normal
    }
    return date.toISOString();
}

function calculateTimeLeft(requiredDateStr?: string): { isExpired: boolean; timeLeft: string } {
    if (!requiredDateStr) return { isExpired: false, timeLeft: 'Active' };
    const diffMs = new Date(requiredDateStr).getTime() - new Date().getTime();
    if (diffMs <= 0) return { isExpired: true, timeLeft: 'Expired' };

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 24) return { isExpired: false, timeLeft: `${hours}h left` };
    const days = Math.floor(hours / 24);
    return { isExpired: false, timeLeft: `${days}d left` };
}

@Injectable()
export class BloodRequestService {
    private readonly logger = new Logger(BloodRequestService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async create(userId: string, dto: CreateBloodRequestDto) {
        const requiredDate = dto.required_date || getDefaultRequiredDate(dto.urgency);

        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .insert({
                requester_id: userId,
                ...dto,
                required_date: requiredDate,
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
        const nowIso = new Date().toISOString();

        let countQuery = this.supabase.client
            .from('blood_requests')
            .select('*', { count: 'exact', head: true });

        let dataQuery = this.supabase.client
            .from('blood_requests')
            .select(`
                *,
                requester:profiles(id, phone, blood_group, city_id, profile_image)
            `);

        // Include all active/open requests for public feed (supporting all 17 database requests)
        if (requestStatus === BloodRequestStatus.OPEN || requestStatus === 'open') {
            countQuery = countQuery.neq('status', 'cancelled');
            dataQuery = dataQuery.neq('status', 'cancelled');
        } else if (requestStatus && requestStatus !== 'all') {
            countQuery = countQuery.ilike('status', requestStatus);
            dataQuery = dataQuery.ilike('status', requestStatus);
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
            const { data, error } = await dataQuery.order('created_at', { ascending: false });

            if (error) {
                this.logger.error(`Error fetching blood request feed for nearest sorting`, error.message);
                throw new BadRequestException(`Could not fetch feed: ${error.message}`);
            }

            const mapped = (data || []).map((req: any) => {
                const distanceStr = calculateDistance(pagination.lat, pagination.lng, req.latitude, req.longitude);
                const distNum = parseFloat(distanceStr) || 999999;
                const { isExpired, timeLeft } = calculateTimeLeft(req.required_date);
                const unitsReq = req.units_required || 1;
                const fulfilled = req.fulfilled_units || 0;
                return {
                    ...req,
                    units_required: unitsReq,
                    fulfilled_units: fulfilled,
                    units_remaining: Math.max(0, unitsReq - fulfilled),
                    progress_percentage: Math.min(100, Math.round((fulfilled / unitsReq) * 100)),
                    distance: distanceStr,
                    distance_km: distNum,
                    is_expired: isExpired,
                    time_left: timeLeft,
                };
            });

            mapped.sort((a: any, b: any) => a.distance_km - b.distance_km);
            requestsList = mapped.slice(skip, skip + limit);
        } else {
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
                const { isExpired, timeLeft } = calculateTimeLeft(req.required_date);
                const unitsReq = req.units_required || 1;
                const fulfilled = req.fulfilled_units || 0;
                return {
                    ...req,
                    units_required: unitsReq,
                    fulfilled_units: fulfilled,
                    units_remaining: Math.max(0, unitsReq - fulfilled),
                    progress_percentage: Math.min(100, Math.round((fulfilled / unitsReq) * 100)),
                    distance: distanceStr,
                    distance_km: distNum,
                    is_expired: isExpired,
                    time_left: timeLeft,
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
        const nowIso = new Date().toISOString();

        const { data, error } = await this.supabase.client
            .from('blood_requests')
            .select(`
                *,
                requester:profiles(full_name, profile_image, city_id, state)
            `)
            .neq('status', 'cancelled')
            .in('urgency', ['critical', 'high', 'CRITICAL', 'HIGH', 'urgent', 'URGENT'])
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            this.logger.error('Error fetching urgent requests', error.message);
            throw new BadRequestException(`Could not fetch urgent requests: ${error.message}`);
        }

        const formatted = (data || []).map((req: any) => {
            const distanceStr = calculateDistance(lat, lng, req.latitude, req.longitude);
            const { isExpired, timeLeft } = calculateTimeLeft(req.required_date);
            const unitsReq = req.units_required || 1;
            const fulfilled = req.fulfilled_units || 0;
            return {
                id: req.id,
                bloodType: req.blood_group,
                patientName: req.patient_name || 'Patient',
                hospital: req.hospital_name,
                city: req.city_id || 'Lahore',
                state: req.requester?.state || 'Punjab',
                patientImage: req.requester?.profile_image || 'https://cdn.lifelink.org/avatars/patient1.jpg',
                units: unitsReq,
                fulfilledUnits: fulfilled,
                unitsRemaining: Math.max(0, unitsReq - fulfilled),
                progressPercentage: Math.min(100, Math.round((fulfilled / unitsReq) * 100)),
                urgency: req.urgency,
                time: timeAgo(req.created_at),
                timeLeft,
                isExpired,
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

        const formatted = (data || []).map((req: any) => {
            const { isExpired, timeLeft } = calculateTimeLeft(req.required_date);
            const unitsReq = req.units_required || 1;
            const fulfilled = req.fulfilled_units || 0;
            return {
                ...req,
                units_required: unitsReq,
                fulfilled_units: fulfilled,
                units_remaining: Math.max(0, unitsReq - fulfilled),
                progress_percentage: Math.min(100, Math.round((fulfilled / unitsReq) * 100)),
                status: isExpired && req.status === BloodRequestStatus.OPEN ? BloodRequestStatus.EXPIRED : req.status,
                is_expired: isExpired,
                time_left: timeLeft,
            };
        });

        const total = count ?? 0;
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                requests: formatted,
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

        const { isExpired, timeLeft } = calculateTimeLeft(data.required_date);
        const unitsReq = data.units_required || 1;
        const fulfilled = data.fulfilled_units || 0;

        return {
            success: true,
            data: {
                ...data,
                units_required: unitsReq,
                fulfilled_units: fulfilled,
                units_remaining: Math.max(0, unitsReq - fulfilled),
                progress_percentage: Math.min(100, Math.round((fulfilled / unitsReq) * 100)),
                is_expired: isExpired,
                time_left: timeLeft,
            },
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
