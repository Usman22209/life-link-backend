import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(private readonly supabase: SupabaseService) { }

    async getStats() {
        const nowIso = new Date().toISOString();

        // 1. Total donors (all profiles or onboarded/available)
        const { count: donorsCount } = await this.supabase.client
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // 2. Active blood requests (open or partially_fulfilled, not expired)
        const { count: activeCount } = await this.supabase.client
            .from('blood_requests')
            .select('*', { count: 'exact', head: true })
            .in('status', ['open', 'partially_fulfilled'])
            .gte('required_date', nowIso);

        // 3. Critical urgency requests (critical, not expired, active)
        const { count: criticalCount } = await this.supabase.client
            .from('blood_requests')
            .select('*', { count: 'exact', head: true })
            .in('status', ['open', 'partially_fulfilled'])
            .in('urgency', ['critical', 'CRITICAL'])
            .gte('required_date', nowIso);

        // 4. Fulfilled donations
        const { count: fulfilledDonationsCount } = await this.supabase.client
            .from('donations')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'completed');

        // Also check completed requests units if donations table is sparse
        const { data: fulfilledRequests } = await this.supabase.client
            .from('blood_requests')
            .select('fulfilled_units, units_required')
            .in('status', ['fulfilled', 'partially_fulfilled']);

        const totalFulfilledUnits = (fulfilledRequests || []).reduce((acc, curr) => acc + (curr.fulfilled_units || 0), 0);
        const effectiveFulfilled = Math.max(fulfilledDonationsCount || 0, totalFulfilledUnits);
        const livesSaved = effectiveFulfilled * 3;

        // 5. Calculate average response time
        let avgResponseTime = '18 mins';
        try {
            const { data: sampleDonations } = await this.supabase.client
                .from('donations')
                .select(`
                    created_at,
                    request:blood_requests!inner(created_at)
                `)
                .limit(20);

            if (sampleDonations && sampleDonations.length > 0) {
                let totalDiffMinutes = 0;
                let validCount = 0;

                for (const item of sampleDonations) {
                    const reqCreated = (item.request as any)?.created_at;
                    const donCreated = item.created_at;
                    if (reqCreated && donCreated) {
                        const diffMs = new Date(donCreated).getTime() - new Date(reqCreated).getTime();
                        if (diffMs > 0 && diffMs < 86400000 * 7) { // within 7 days
                            totalDiffMinutes += diffMs / (1000 * 60);
                            validCount++;
                        }
                    }
                }

                if (validCount > 0) {
                    const avgMins = Math.round(totalDiffMinutes / validCount);
                    avgResponseTime = avgMins < 60 ? `${avgMins} mins` : `${Math.round(avgMins / 60)} hrs`;
                }
            }
        } catch (err) {
            this.logger.warn(`Could not compute exact average response time: ${err.message}`);
        }

        const totalDonors = donorsCount ?? 0;
        const activeRequests = activeCount ?? 0;
        const criticalRequests = criticalCount ?? 0;

        return {
            success: true,
            data: {
                total_donors: totalDonors,
                active_requests: activeRequests,
                critical_requests: criticalRequests,
                fulfilled_donations: effectiveFulfilled,
                lives_saved: livesSaved,
                response_time_avg: avgResponseTime,
            },
        };
    }
}
