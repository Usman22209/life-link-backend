const http = require('http');

const BASE_URL = 'http://localhost:3001';
const results = [];

const credentials = {
    email: 'netnetlify@gmail.com',
    password: 'Admin@123'
};

let accessToken = null;
let bloodRequestId = null;
let uploadId = null;
let donationId = null;

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const start = Date.now();
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const time = Date.now() - start;
                let parsed;
                try { parsed = JSON.parse(data); } catch { parsed = data; }
                resolve({ status: res.statusCode, time, data: parsed });
            });
        });

        req.on('error', (err) => {
            resolve({ status: 'ERROR', time: Date.now() - start, data: err.message });
        });

        req.setTimeout(10000, () => {
            req.destroy();
            resolve({ status: 'TIMEOUT', time: 10000, data: 'Request timed out' });
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testEndpoint(name, method, path, body = null, authRequired = false) {
    const headers = {};
    if (authRequired && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const result = await makeRequest(method, path, body, headers);
    const row = {
        name,
        endpoint: `${method} ${path}`,
        status: result.status,
        timeMs: result.time,
        success: result.status >= 200 && result.status < 300,
        data: result.data
    };

    results.push(row);
    const statusIcon = row.success ? '✅' : '❌';
    console.log(`${statusIcon} ${row.endpoint} - ${row.status} - ${row.timeMs}ms`);
    if (!row.success) {
        console.log('   Response:', JSON.stringify(result.data).substring(0, 100));
    }

    return result;
}

async function runTests() {
    console.log('\n========================================');
    console.log('COMPREHENSIVE API - ENDPOINT VERIFICATION');
    console.log('========================================\n');

    // 1. PUBLIC ENDPOINTS
    console.log('--- PUBLIC ENDPOINTS ---\n');
    await testEndpoint('Health Check', 'GET', '/');

    // 2. AUTHENTICATION
    console.log('\n--- AUTHENTICATION ---\n');
    // Login
    const loginResult = await testEndpoint('Login', 'POST', '/auth/login', credentials);
    if ((loginResult.status === 200 || loginResult.status === 201) && loginResult.data && loginResult.data.session) {
        accessToken = loginResult.data.session.access_token;
    } else {
        console.log('❌ Login failed, some protected routes will fail.');
    }

    await testEndpoint('Forgot Password', 'POST', '/auth/forgot-password', { email: credentials.email });
    // This will fail since it's a dummy token
    await testEndpoint('Google Login', 'POST', '/auth/google-login', { idToken: 'invalid-token' });

    // 3. PROFILE
    console.log('\n--- PROFILE ---\n');
    await testEndpoint('Get Profile', 'GET', '/profile/me', null, true);
    await testEndpoint('Update Profile', 'PUT', '/profile/me', {
        name: 'Test User',
        bloodType: 'O+',
        phone: '+1234567890',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        isAvailableForDonation: true,
        fcmToken: 'test-token'
    }, true);

    // 4. BLOOD REQUESTS
    console.log('\n--- BLOOD REQUESTS ---\n');
    const reqResult = await testEndpoint('Create Blood Request', 'POST', '/blood-requests', {
        bloodType: 'O+',
        hospitalName: 'General Hospital',
        patientName: 'John Doe',
        unitsRequired: 2,
        urgency: 'HIGH',
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'New York, NY',
        notes: 'Urgent requirement'
    }, true);

    if (reqResult.success && reqResult.data && reqResult.data.id) {
        bloodRequestId = reqResult.data.id;
    } else if (reqResult.success && reqResult.data && reqResult.data.data && reqResult.data.data.id) {
        bloodRequestId = reqResult.data.data.id;
    }

    await testEndpoint('Get Feed', 'GET', '/blood-requests/feed?page=1&limit=10', null, false);
    await testEndpoint('Get My Requests', 'GET', '/blood-requests/my', null, true);
    
    if (bloodRequestId) {
        await testEndpoint('Get Request by ID', 'GET', `/blood-requests/${bloodRequestId}`, null, true);
        await testEndpoint('Update Request Status', 'PATCH', `/blood-requests/${bloodRequestId}`, { status: 'FULFILLED' }, true);
    } else {
        console.log('⚠️ Skipping blood request ID endpoints since creation failed.');
    }

    // 5. DONATIONS
    console.log('\n--- DONATIONS ---\n');
    // Since we created and fulfilled the blood request, accepting it might fail, but let's test the endpoint anyway.
    if (bloodRequestId) {
        const acceptResult = await testEndpoint('Accept Donation', 'POST', '/donations/accept', { requestId: bloodRequestId }, true);
        if (acceptResult.success && acceptResult.data && acceptResult.data.id) {
            donationId = acceptResult.data.id;
        } else if (acceptResult.success && acceptResult.data && acceptResult.data.data && acceptResult.data.data.id) {
            donationId = acceptResult.data.data.id;
        }

        await testEndpoint('Get Donations for Request', 'GET', `/donations/request/${bloodRequestId}`, null, true);
        
        if (donationId) {
            await testEndpoint('Update Donation Status', 'PATCH', `/donations/${donationId}/status`, { status: 'COMPLETED' }, true);
        } else {
             console.log('⚠️ Skipping donation status update since acceptance failed (expected if request is FULFILLED or similar).');
        }
    }

    // 6. FILES
    console.log('\n--- FILES ---\n');
    await testEndpoint('Upload File', 'POST', '/file/upload', null, true);
    await testEndpoint('Delete File', 'POST', '/file/delete', { publicId: 'test-invalid-id' }, true);

    // 7. AUTH (Refresh & Logout)
    console.log('\n--- AUTHENTICATION (End) ---\n');
    await testEndpoint('Refresh Token', 'POST', '/auth/refresh', { refresh_token: loginResult?.data?.session?.refresh_token || 'invalid' });
    await testEndpoint('Reset Password', 'PATCH', '/auth/reset-password', { password: 'NewPassword@123' }, true);
    await testEndpoint('Logout', 'POST', '/auth/logout', null, true);

    // Summary
    console.log('\n========================================');
    console.log('PERFORMANCE SUMMARY');
    console.log('========================================\n');

    console.log('| Name | Endpoint | Status | Time (ms) | Result |');
    console.log('|------|----------|--------|-----------|--------|');
    results.forEach(r => {
        const statusIcon = r.success ? '✅' : '❌';
        console.log(`| ${r.name.padEnd(25)} | ${r.endpoint.padEnd(45)} | ${String(r.status).padEnd(6)} | ${String(r.timeMs).padEnd(9)} | ${statusIcon} |`);
    });

    const fs = require('fs');
    fs.writeFileSync('api-test-results.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed results saved to api-test-results.json');
}

runTests().catch(console.error);
