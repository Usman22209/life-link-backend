const http = require('http');

const BASE_URL = 'http://localhost:3001';
const results = [];

const credentials = {
    email: 'netnetlify@gmail.com',
    password: 'Admin@123'
};

let accessToken = null;

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
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
        endpoint: `${method} ${path}`,
        status: result.status,
        timeMs: result.time,
        success: result.status >= 200 && result.status < 300,
    };

    results.push(row);
    const statusIcon = row.success ? '✅' : '❌';
    console.log(`${statusIcon} ${row.endpoint} - ${row.status} - ${row.timeMs}ms`);

    return result;
}

async function runTests() {
    console.log('\n========================================');
    console.log('SIMPLIFIED API - ENDPOINT VERIFICATION');
    console.log('========================================\n');

    // Public endpoints
    console.log('--- PUBLIC ENDPOINTS ---\n');
    await testEndpoint('Health Check', 'GET', '/');
    await testEndpoint('Forgot Password', 'POST', '/auth/forgot-password', { email: 'test@example.com' });
    await testEndpoint('Signup', 'POST', '/auth/signup', { email: 'newuser@test.com', password: 'Test@12345' });

    // Login
    console.log('\n--- LOGIN ---\n');
    const loginResult = await testEndpoint('Login', 'POST', '/auth/login', credentials);

    if ((loginResult.status === 200 || loginResult.status === 201) && loginResult.data && loginResult.data.session) {
        accessToken = loginResult.data.session.access_token;
        console.log(`  -> Access Token: ${accessToken.substring(0, 30)}...`);
        console.log(`  -> Refresh Token: ${loginResult.data.session.refresh_token.substring(0, 20)}...`);
    } else {
        console.log('  ❌ Login failed');
        console.log(loginResult.data);
        return;
    }

    await testEndpoint('Google Login', 'POST', '/auth/google-login', { idToken: 'invalid-token' });

    // Protected endpoints (no more x-session-id needed!)
    console.log('\n--- PROTECTED ENDPOINTS ---\n');
    await testEndpoint('Reset Password', 'PATCH', '/auth/reset-password', { password: credentials.password }, true);
    await testEndpoint('File Upload', 'POST', '/file/upload', null, true);
    await testEndpoint('File Delete', 'POST', '/file/delete', { publicId: 'test-invalid-id' }, true);
    await testEndpoint('Logout', 'POST', '/auth/logout', null, true);

    // Summary
    console.log('\n========================================');
    console.log('PERFORMANCE SUMMARY');
    console.log('========================================\n');

    console.log('| Endpoint | Status | Time (ms) | Result |');
    console.log('|----------|--------|-----------|--------|');
    results.forEach(r => {
        const statusIcon = r.success ? '✅' : '❌';
        console.log(`| ${r.endpoint.padEnd(35)} | ${String(r.status).padEnd(6)} | ${String(r.timeMs).padEnd(9)} | ${statusIcon} |`);
    });

    const avgTime = results.reduce((sum, r) => sum + r.timeMs, 0) / results.length;
    const successCount = results.filter(r => r.success).length;

    console.log('\n--- STATISTICS ---');
    console.log(`Total Endpoints Tested: ${results.length}`);
    console.log(`Successful: ${successCount}/${results.length}`);
    console.log(`Average Response Time: ${Math.round(avgTime)}ms`);
    console.log(`Fastest: ${Math.min(...results.map(r => r.timeMs))}ms`);
    console.log(`Slowest: ${Math.max(...results.map(r => r.timeMs))}ms`);
}

runTests().catch(console.error);
