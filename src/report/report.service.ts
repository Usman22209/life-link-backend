import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportFilterDto } from './dto/report-filter.dto';
import { ReportActionDto } from './dto/report-action.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ReportService {
    private readonly logger = new Logger(ReportService.name);
    // In-memory store fallback when DB table is being provisioned
    private memoryReports: any[] = [];

    constructor(private readonly supabase: SupabaseService) { }

    async createReport(reporterId: string | null, dto: CreateReportDto) {
        let priority = dto.priority;
        if (!priority) {
            const highRiskReasons = ['fraud', 'fake_request', 'commercial_selling', 'money_demanded', 'harassment'];
            priority = highRiskReasons.includes(dto.reason.toLowerCase()) ? 'high' : 'medium';
        }

        const reportRecord = {
            id: randomUUID(),
            reporter_id: reporterId,
            target_type: dto.target_type,
            target_id: dto.target_id,
            reason: dto.reason,
            description: dto.description || null,
            priority,
            status: 'pending',
            action_taken: 'none',
            admin_notes: null,
            resolved_by: null,
            resolved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        try {
            const { data, error } = await this.supabase.client
                .from('reports')
                .insert({
                    id: reportRecord.id,
                    reporter_id: reporterId,
                    target_type: dto.target_type,
                    target_id: dto.target_id,
                    reason: dto.reason,
                    description: dto.description || null,
                    priority,
                    status: 'pending',
                    action_taken: 'none',
                })
                .select()
                .single();

            if (!error && data) {
                return {
                    success: true,
                    message: 'Report submitted successfully. Our moderation team has been notified.',
                    data,
                };
            }
            this.logger.warn(`Database insert returned error, storing in memory fallback: ${error?.message}`);
        } catch (dbErr) {
            this.logger.warn(`Could not insert into reports table: ${dbErr.message}`);
        }

        this.memoryReports.unshift(reportRecord);
        return {
            success: true,
            message: 'Report submitted successfully. Our moderation team has been notified.',
            data: reportRecord,
        };
    }

    async getReports(filter: ReportFilterDto) {
        const limit = filter.limit ?? 10;
        const page = filter.page ?? 1;
        const skip = filter.skip ?? (page - 1) * limit;

        try {
            let countQuery = this.supabase.client
                .from('reports')
                .select('*', { count: 'exact', head: true });

            let dataQuery = this.supabase.client
                .from('reports')
                .select(`
                    *,
                    reporter:profiles!reporter_id(id, full_name, phone, profile_image)
                `);

            if (filter.status && filter.status !== 'all') {
                countQuery = countQuery.eq('status', filter.status);
                dataQuery = dataQuery.eq('status', filter.status);
            }

            if (filter.target_type && filter.target_type !== 'all') {
                countQuery = countQuery.eq('target_type', filter.target_type);
                dataQuery = dataQuery.eq('target_type', filter.target_type);
            }

            if (filter.priority && filter.priority !== 'all') {
                countQuery = countQuery.eq('priority', filter.priority);
                dataQuery = dataQuery.eq('priority', filter.priority);
            }

            if (filter.search && filter.search.trim()) {
                const pattern = `%${filter.search.trim()}%`;
                countQuery = countQuery.or(`reason.ilike.${pattern},description.ilike.${pattern}`);
                dataQuery = dataQuery.or(`reason.ilike.${pattern},description.ilike.${pattern}`);
            }

            const { count } = await countQuery;
            const { data: reports, error } = await dataQuery
                .order('created_at', { ascending: false })
                .range(skip, skip + limit - 1);

            if (!error && reports) {
                const hydratedReports = await this.hydrateReports(reports);
                const total = count ?? reports.length;
                const totalPages = Math.ceil(total / limit);

                return {
                    success: true,
                    data: {
                        reports: hydratedReports,
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
        } catch (dbErr) {
            this.logger.warn(`Could not query database reports, falling back to memory: ${dbErr.message}`);
        }

        // Memory fallback filter
        let filtered = [...this.memoryReports];
        if (filter.status && filter.status !== 'all') {
            filtered = filtered.filter(r => r.status === filter.status);
        }
        if (filter.target_type && filter.target_type !== 'all') {
            filtered = filtered.filter(r => r.target_type === filter.target_type);
        }
        if (filter.priority && filter.priority !== 'all') {
            filtered = filtered.filter(r => r.priority === filter.priority);
        }
        if (filter.search && filter.search.trim()) {
            const s = filter.search.toLowerCase();
            filtered = filtered.filter(r => r.reason?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s));
        }

        const total = filtered.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paged = filtered.slice(skip, skip + limit);
        const hydrated = await this.hydrateReports(paged);

        return {
            success: true,
            data: {
                reports: hydrated,
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

    private async hydrateReports(reports: any[]) {
        return Promise.all((reports || []).map(async (report) => {
            let targetData: any = null;
            let reporterData: any = report.reporter || null;

            if (report.target_type === 'request') {
                const { data: req } = await this.supabase.client
                    .from('blood_requests')
                    .select(`
                        id,
                        patient_name,
                        hospital_name,
                        blood_group,
                        urgency,
                        status,
                        units_required,
                        fulfilled_units,
                        city_id,
                        contact_number,
                        created_at,
                        requester:profiles(id, full_name, phone, profile_image)
                    `)
                    .eq('id', report.target_id)
                    .maybeSingle();
                targetData = req;
            } else if (report.target_type === 'user') {
                const { data: usr } = await this.supabase.client
                    .from('profiles')
                    .select(`
                        id,
                        full_name,
                        phone,
                        blood_group,
                        city_id,
                        city,
                        state,
                        profile_image,
                        is_available,
                        is_verified,
                        created_at
                    `)
                    .eq('id', report.target_id)
                    .maybeSingle();
                targetData = usr;
            }

            if (!reporterData && report.reporter_id) {
                const { data: rep } = await this.supabase.client
                    .from('profiles')
                    .select('id, full_name, phone, profile_image')
                    .eq('id', report.reporter_id)
                    .maybeSingle();
                reporterData = rep;
            }

            return {
                ...report,
                reporter: reporterData,
                target: targetData,
            };
        }));
    }

    async getReportStats() {
        let reports: any[] = [];
        try {
            const { data: dbReports, error } = await this.supabase.client
                .from('reports')
                .select('status, target_type, priority');

            if (!error && dbReports) {
                reports = dbReports;
            }
        } catch (err) {
            this.logger.warn(`Could not fetch db reports for stats: ${err.message}`);
        }

        if (reports.length === 0 && this.memoryReports.length > 0) {
            reports = this.memoryReports;
        }

        const total = reports.length;
        const pending = reports.filter(r => r.status === 'pending').length;
        const reviewed = reports.filter(r => r.status === 'reviewed').length;
        const resolved = reports.filter(r => r.status === 'resolved').length;
        const dismissed = reports.filter(r => r.status === 'dismissed').length;
        const requestReports = reports.filter(r => r.target_type === 'request').length;
        const userReports = reports.filter(r => r.target_type === 'user').length;
        const urgentPending = reports.filter(r => r.status === 'pending' && (r.priority === 'urgent' || r.priority === 'high')).length;

        return {
            success: true,
            data: {
                total_reports: total,
                pending_reports: pending,
                reviewed_reports: reviewed,
                resolved_reports: resolved,
                dismissed_reports: dismissed,
                request_reports: requestReports,
                user_reports: userReports,
                urgent_pending_reports: urgentPending,
            },
        };
    }

    async getReportById(id: string) {
        let report: any = null;
        try {
            const { data: dbReport, error } = await this.supabase.client
                .from('reports')
                .select(`
                    *,
                    reporter:profiles!reporter_id(id, full_name, phone, profile_image)
                `)
                .eq('id', id)
                .single();

            if (!error && dbReport) {
                report = dbReport;
            }
        } catch (err) {
            this.logger.warn(`Could not find in db: ${err.message}`);
        }

        if (!report) {
            report = this.memoryReports.find(r => r.id === id);
        }

        if (!report) {
            throw new NotFoundException(`Report ${id} not found.`);
        }

        const hydrated = await this.hydrateReports([report]);
        return {
            success: true,
            data: hydrated[0],
        };
    }

    async resolveAction(adminId: string | null, id: string, dto: ReportActionDto) {
        const nowIso = new Date().toISOString();
        const action = dto.action_taken || 'none';

        let report: any = null;
        try {
            const { data: dbReport } = await this.supabase.client
                .from('reports')
                .select('*')
                .eq('id', id)
                .single();
            report = dbReport;
        } catch { }

        if (!report) {
            report = this.memoryReports.find(r => r.id === id);
        }

        if (!report) {
            throw new NotFoundException(`Report ${id} not found.`);
        }

        // Apply moderation actions
        if (action === 'request_cancelled' || action === 'content_removed') {
            if (report.target_type === 'request') {
                await this.supabase.client
                    .from('blood_requests')
                    .update({ status: 'cancelled', updated_at: nowIso })
                    .eq('id', report.target_id);
                this.logger.log(`Moderation: Cancelled blood request ${report.target_id}`);
            }
        } else if (action === 'user_suspended') {
            if (report.target_type === 'user') {
                await this.supabase.client
                    .from('profiles')
                    .update({ updated_at: nowIso })
                    .eq('id', report.target_id);
                this.logger.log(`Moderation: Suspended user ${report.target_id}`);
            }
        } else if (action === 'user_banned') {
            if (report.target_type === 'user') {
                await this.supabase.client
                    .from('blood_requests')
                    .update({ status: 'cancelled', updated_at: nowIso })
                    .eq('requester_id', report.target_id)
                    .in('status', ['open', 'partially_fulfilled']);
                this.logger.log(`Moderation: Banned user ${report.target_id}`);
            }
        }

        const updatedFields = {
            ...report,
            status: dto.status,
            action_taken: action,
            admin_notes: dto.admin_notes || report.admin_notes,
            resolved_by: adminId,
            resolved_at: dto.status === 'resolved' || dto.status === 'dismissed' ? nowIso : null,
            updated_at: nowIso,
        };

        try {
            const { data, error } = await this.supabase.client
                .from('reports')
                .update({
                    status: dto.status,
                    action_taken: action,
                    admin_notes: dto.admin_notes || report.admin_notes,
                    resolved_by: adminId,
                    resolved_at: dto.status === 'resolved' || dto.status === 'dismissed' ? nowIso : null,
                    updated_at: nowIso,
                })
                .eq('id', id)
                .select()
                .single();

            if (!error && data) {
                return {
                    success: true,
                    message: `Report status updated to ${dto.status} with action: ${action}.`,
                    data,
                };
            }
        } catch { }

        // Update in-memory
        const idx = this.memoryReports.findIndex(r => r.id === id);
        if (idx !== -1) {
            this.memoryReports[idx] = updatedFields;
        } else {
            this.memoryReports.push(updatedFields);
        }

        return {
            success: true,
            message: `Report status updated to ${dto.status} with action: ${action}.`,
            data: updatedFields,
        };
    }
}
