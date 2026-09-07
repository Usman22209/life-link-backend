const http = require('http');

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;
const results = [];

function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers,
        };

        const start = Date.now();
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const timeMs = Date.now() - start;
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, timeMs, data: parsed });
            });
        });

        req.on('error', (err) => {
            resolve({ status: 'ERROR', timeMs: Date.now() - start, data: err.message });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            resolve({ status: 'TIMEOUT', timeMs: 10000, data: 'Request timed out' });
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function test(name, method, path, body = null, token = null) {
    const res = await makeRequest(method, path, body, token);
    const success = res.status >= 200 && res.status < 300;
    const row = {
        name,
        endpoint: `${method} ${path}`,
        status: res.status,
        timeMs: res.timeMs,
        success,
        data: res.data,
    };
    results.push(row);
    const statusIcon = success ? '✅' : '❌';
    console.log(`${statusIcon} [${res.status}] ${method.padEnd(6)} ${path} (${res.timeMs}ms)`);
    if (!success) {
        console.log('   Error:', JSON.stringify(res.data).substring(0, 150));
    }
    return res;
}

async function run() {
    console.log('\n======================================================');
    console.log('VERIFYING DASHBOARD, ANALYTICS & REPORTS BACKEND APIS');
    console.log('======================================================\n');

    // 1. Dashboard Stats
    const statsRes = await test('1. Dashboard Command Center Stats', 'GET', '/dashboard/stats');
    console.log('   Stats Data:', JSON.stringify(statsRes.data?.data || statsRes.data));

    // 2. Analytics Trends
    const trendsRes = await test('2. Analytics Trends & Regional Metrics', 'GET', '/analytics/trends');
    console.log('   Trends Summary: Monthly items count:', trendsRes.data?.data?.monthly_trends?.length, 'Cities count:', trendsRes.data?.data?.city_distribution?.length);

    // 3. Blood Request Feed (All statuses, paginated)
    const feedRes = await test('3. Blood Requests Feed (status=all)', 'GET', '/blood-requests/feed?page=1&limit=5&status=all');
    let sampleRequestId = feedRes.data?.data?.requests?.[0]?.id;

    // 4. Donors Directory
    const donorsRes = await test('4. Donors Directory with stats', 'GET', '/profile/donors?page=1&limit=5');
    let sampleDonorId = donorsRes.data?.data?.donors?.[0]?.id;

    // 5. Audited Donations History
    const donHistRes = await test('5. Audited Donations Ledger & Stats', 'GET', '/donations/history?page=1&limit=5');
    console.log('   Donation Global Stats:', JSON.stringify(donHistRes.data?.data?.stats));

    // 6. Reports Stats
    const repStatsRes = await test('6. Reports & Moderation Stats', 'GET', '/reports/stats');
    console.log('   Report Stats:', JSON.stringify(repStatsRes.data?.data || repStatsRes.data));

    // 7. Submit Report (on request or user)
    let createdReportId = null;
    if (sampleRequestId) {
        const createRepRes = await test('7. Submit Report against Blood Request', 'POST', '/reports', {
            target_type: 'request',
            target_id: sampleRequestId,
            reason: 'fake_request',
            description: 'Automated verification test report for blood request.',
            priority: 'medium',
        });
        createdReportId = createRepRes.data?.data?.id;
    } else if (sampleDonorId) {
        const createRepRes = await test('7. Submit Report against User Profile', 'POST', '/reports', {
            target_type: 'user',
            target_id: sampleDonorId,
            reason: 'spam',
            description: 'Automated verification test report for user profile.',
            priority: 'low',
        });
        createdReportId = createRepRes.data?.data?.id;
    }

    // 8. List Reports (Admin Feed)
    const listRepRes = await test('8. List Reports with Hydrated Targets', 'GET', '/reports?page=1&limit=10&status=all');

    // 9. Single Report Details
    if (createdReportId) {
        await test('9. Get Single Report Details', 'GET', `/reports/${createdReportId}`);

        // 10. Admin Action on Report
        await test('10. Resolve / Act on Report', 'PATCH', `/reports/${createdReportId}/action`, {
            status: 'resolved',
            action_taken: 'dismissed',
            admin_notes: 'Verified and resolved during test execution.',
        });
    }

    // 11. Donor Availability Toggle
    if (sampleDonorId) {
        await test('11. Toggle Donor Availability', 'PATCH', `/profile/${sampleDonorId}/availability`, {
            is_available: true,
        });
    }

    // 12. Blood Request Status Update
    if (sampleRequestId) {
        await test('12. Update Blood Request Status', 'PATCH', `/blood-requests/${sampleRequestId}/status`, {
            status: 'open',
        });
    }

    console.log('\n======================================================');
    console.log(`COMPLETED: ${results.filter(r => r.success).length}/${results.length} PASSED`);
    console.log('======================================================\n');
}

run().catch(console.error);
