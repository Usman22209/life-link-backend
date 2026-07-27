const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';
const results = [];

const account1 = {
    email: 'netnetify@gmail.com',
    password: 'Admin@123',
    token: null,
    refreshToken: null,
    userId: null,
};

const account2 = {
    email: 'usman22209@gmail.com',
    password: 'Admin@123',
    token: null,
    refreshToken: null,
    userId: null,
};

let createdRequestId = null;
let createdDonationId = null;
let createdThreadId = null;
let createdNotificationId = null;

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

async function recordTest(id, name, method, path, body = null, token = null) {
    const res = await makeRequest(method, path, body, token);
    const success = res.status >= 200 && res.status < 300;
    const item = {
        id,
        name,
        endpoint: `${method} ${path}`,
        status: res.status,
        timeMs: res.timeMs,
        success,
        response: res.data,
    };
    results.push(item);

    const icon = success ? '✅' : '❌';
    console.log(`${icon} [${id}] ${item.endpoint} - ${res.status} (${res.timeMs}ms)`);
    if (!success) {
        console.log('   Response:', JSON.stringify(res.data).substring(0, 150));
    }
    return res;
}

async function runAllTests() {
    console.log('\n=============================================================');
    console.log('🚀 LIFELINK BACKEND - 33 APIS VERIFICATION & TIMING TEST SUITE');
    console.log('=============================================================\n');

    // -------------------------------------------------------------
    // MODULE 1: AUTHENTICATION (7 APIs)
    // -------------------------------------------------------------
    console.log('--- 1. AUTHENTICATION MODULE ---');
    
    // Login Account 1
    let loginRes1 = await recordTest('1.2a', 'Login Account 1 (netnetify@gmail.com)', 'POST', '/auth/login', {
        email: account1.email,
        password: account1.password,
    });

    if (loginRes1.data?.session?.access_token) {
        account1.token = loginRes1.data.session.access_token;
        account1.refreshToken = loginRes1.data.session.refresh_token;
        account1.userId = loginRes1.data.user.id;
    } else {
        let signupRes1 = await recordTest('1.1a', 'Signup Account 1', 'POST', '/auth/signup', {
            email: account1.email,
            password: account1.password,
        });
        account1.token = signupRes1.data?.session?.access_token;
        account1.refreshToken = signupRes1.data?.session?.refresh_token;
        account1.userId = signupRes1.data?.user?.id;
    }

    // Login Account 2
    let loginRes2 = await recordTest('1.2b', 'Login Account 2 (usman22209@gmail.com)', 'POST', '/auth/login', {
        email: account2.email,
        password: account2.password,
    });
    if (loginRes2.data?.session?.access_token) {
        account2.token = loginRes2.data.session.access_token;
        account2.refreshToken = loginRes2.data.session.refresh_token;
        account2.userId = loginRes2.data.user.id;
    } else {
        let signupRes2 = await recordTest('1.1b', 'Signup Account 2', 'POST', '/auth/signup', {
            email: account2.email,
            password: account2.password,
        });
        account2.token = signupRes2.data?.session?.access_token;
        account2.refreshToken = signupRes2.data?.session?.refresh_token;
        account2.userId = signupRes2.data?.user?.id;
    }

    // 1.3 Google Login Check
    await recordTest('1.3', 'Google Login Endpoint Check', 'POST', '/auth/google-login', { idToken: 'mock_google_token' });

    // 1.4 Forgot Password
    await recordTest('1.4', 'Forgot Password', 'POST', '/auth/forgot-password', { email: account1.email });

    // 1.5 Reset Password
    if (account1.token) {
        await recordTest('1.5', 'Reset Password', 'PATCH', '/auth/reset-password', { password: account1.password }, account1.token);
    }

    // 1.7 Refresh Token
    if (account1.refreshToken) {
        let refreshRes = await recordTest('1.7', 'Refresh Token', 'POST', '/auth/refresh', { refresh_token: account1.refreshToken });
        if (refreshRes.data?.access_token) {
            account1.token = refreshRes.data.access_token;
        }
    }

    // 1.6 Logout Test
    if (account1.token) {
        await recordTest('1.6', 'Logout Account 1', 'POST', '/auth/logout', null, account1.token);
    }

    // Re-login Account 1
    let reloginRes = await recordTest('1.2c', 'Re-login Account 1', 'POST', '/auth/login', {
        email: account1.email,
        password: account1.password,
    });
    if (reloginRes.data?.session?.access_token) {
        account1.token = reloginRes.data.session.access_token;
    }

    // -------------------------------------------------------------
    // MODULE 2: PROFILE & USER SETTINGS (4 APIs)
    // -------------------------------------------------------------
    console.log('\n--- 2. PROFILE & SETTINGS MODULE ---');

    // 2.1 Get Profile (Me)
    if (account1.token) {
        await recordTest('2.1', 'Get Profile Me (Account 1)', 'GET', '/profile/me', null, account1.token);
    }

    // 2.2 Update Profile (Me)
    if (account1.token) {
        await recordTest('2.2', 'Update Profile Me (Account 1)', 'PUT', '/profile/me', {
            full_name: 'Ali Khan',
            phone: '+923001234567',
            gender: 'male',
            dob: '1995-06-15',
            blood_group: 'O+',
            country: 'Pakistan',
            state: 'Punjab',
            city_id: 'city_lahore',
            latitude: 31.5204,
            longitude: 74.3587,
            profile_image: 'https://cdn.lifelink.org/avatars/user.jpg',
            is_onboarded: true,
            language_preference: 'en',
            notifications_enabled: true,
        }, account1.token);
    }

    // Update Profile for Account 2
    if (account2.token) {
        await recordTest('2.2b', 'Update Profile Me (Account 2)', 'PUT', '/profile/me', {
            full_name: 'Usman Donor',
            phone: '+923009876543',
            gender: 'male',
            dob: '1996-08-20',
            blood_group: 'B+',
            country: 'Pakistan',
            state: 'Punjab',
            city_id: 'city_lahore',
            latitude: 31.5723,
            longitude: 74.3213,
            profile_image: 'https://cdn.lifelink.org/avatars/donor.jpg',
            is_onboarded: true,
            language_preference: 'en',
            notifications_enabled: true,
        }, account2.token);
    }

    // 2.4 Update Settings
    if (account1.token) {
        await recordTest('2.4', 'Update Profile Settings', 'PATCH', '/profile/settings', {
            notifications_enabled: true,
            language_preference: 'en',
        }, account1.token);
    }

    // -------------------------------------------------------------
    // MODULE 3: BLOOD REQUESTS MODULE (6 APIs)
    // -------------------------------------------------------------
    console.log('\n--- 3. BLOOD REQUESTS MODULE ---');

    // 3.1 Create Blood Request (Account 1)
    if (account1.token) {
        let createReqRes = await recordTest('3.1', 'Create Blood Request', 'POST', '/blood-requests', {
            patient_name: 'Ahmed Khan',
            blood_group: 'B+',
            units_required: 3,
            hospital_name: 'Mayo Hospital',
            hospital_address: 'Hospital Road, Anarkali',
            city_id: 'city_lahore',
            latitude: 31.5723,
            longitude: 74.3213,
            urgency: 'critical',
            contact_number: '+923001234567',
            description: 'Patient needs urgent B+ blood for surgery.',
            required_date: '2026-07-27T10:00:00Z',
        }, account1.token);

        if (createReqRes.data?.data?.id) {
            createdRequestId = createReqRes.data.data.id;
        }
    }

    // 3.2 Get Feed
    await recordTest('3.2', 'Get Feed', 'GET', '/blood-requests/feed?page=1&limit=10&blood_group=B+&urgency=critical');

    // 3.3 Get Urgent Requests Carousel
    await recordTest('3.3', 'Get Urgent Requests', 'GET', '/blood-requests/urgent?limit=5&lat=31.5204&lng=74.3587');

    // 3.4 Get My Requests
    if (account1.token) {
        await recordTest('3.4', 'Get My Requests', 'GET', '/blood-requests/my?page=1&limit=10', null, account1.token);
    }

    // 3.5 Get Single Request
    if (createdRequestId) {
        await recordTest('3.5', 'Get Request Details', 'GET', `/blood-requests/${createdRequestId}`);
    }

    // 3.6 Patch Request
    if (createdRequestId && account1.token) {
        await recordTest('3.6', 'Update Request Status', 'PATCH', `/blood-requests/${createdRequestId}`, {
            fulfilled_units: 1,
        }, account1.token);
    }

    // -------------------------------------------------------------
    // MODULE 4: DONATIONS & DONOR LOG MODULE (4 APIs)
    // -------------------------------------------------------------
    console.log('\n--- 4. DONATIONS & DONOR LOG MODULE ---');

    // 4.1 Accept Request (Account 2 accepts Account 1's request)
    if (createdRequestId && account2.token) {
        let acceptRes = await recordTest('4.1', 'Accept Request (Donate Now)', 'POST', '/donations/accept', {
            request_id: createdRequestId,
        }, account2.token);
        if (acceptRes.data?.data?.id) {
            createdDonationId = acceptRes.data.data.id;
        }
    }

    // 4.2 Get My Donations Log (Account 2)
    if (account2.token) {
        await recordTest('4.2', 'Get My Donations Log', 'GET', '/donations/my', null, account2.token);
    }

    // 4.3 Get Donations by Request (Account 1 views pledged donors)
    if (createdRequestId && account1.token) {
        await recordTest('4.3', 'Get Donations for Request', 'GET', `/donations/request/${createdRequestId}`, null, account1.token);
    }

    // 4.4 Patch Donation Status (Account 1 completes donation)
    if (createdDonationId && account1.token) {
        await recordTest('4.4', 'Update Donation Status', 'PATCH', `/donations/${createdDonationId}/status`, {
            status: 'completed',
        }, account1.token);
    }

    // Re-check My Donations Log for Account 2 after completion to verify stats math
    if (account2.token) {
        await recordTest('4.2b', 'Get My Donations Log (Post Complete)', 'GET', '/donations/my', null, account2.token);
    }

    // -------------------------------------------------------------
    // MODULE 5: CHAT & MESSAGING MODULE (3 APIs)
    // -------------------------------------------------------------
    console.log('\n--- 5. CHAT & MESSAGING MODULE ---');

    // 5.3 Send Message (Account 2 sends chat message to Account 1 for request)
    if (createdRequestId && account2.token) {
        let sendMsgRes = await recordTest('5.3', 'Send Chat Message', 'POST', '/chat/messages', {
            request_id: createdRequestId,
            text: 'I will arrive at Mayo Hospital in 15 minutes!',
        }, account2.token);
        if (sendMsgRes.data?.data?.thread_id) {
            createdThreadId = sendMsgRes.data.data.thread_id;
        }
    }

    // 5.1 Get Chat Threads (Account 1)
    if (account1.token) {
        let threadsRes = await recordTest('5.1', 'Get Chat Threads', 'GET', '/chat/threads', null, account1.token);
        if (!createdThreadId && threadsRes.data?.data?.length > 0) {
            createdThreadId = threadsRes.data.data[0].id;
        }
    }

    // 5.2 Get Thread Messages (Account 1)
    if (createdThreadId && account1.token) {
        await recordTest('5.2', 'Get Thread Messages', 'GET', `/chat/threads/${createdThreadId}/messages?page=1&limit=20`, null, account1.token);
    }

    // -------------------------------------------------------------
    // MODULE 6: NOTIFICATIONS & ALERTS MODULE (5 APIs)
    // -------------------------------------------------------------
    console.log('\n--- 6. NOTIFICATIONS & ALERTS MODULE ---');

    // 6.1 Get Notifications (Account 1)
    if (account1.token) {
        let notifRes = await recordTest('6.1', 'Get Notifications', 'GET', '/notifications', null, account1.token);
        if (notifRes.data?.data?.length > 0) {
            createdNotificationId = notifRes.data.data[0].id;
        }
    }

    // 6.2 Get Unread Count
    if (account1.token) {
        await recordTest('6.2', 'Get Notifications Unread Count', 'GET', '/notifications/unread-count', null, account1.token);
    }

    // 6.3 Mark Notification as Read
    if (createdNotificationId && account1.token) {
        await recordTest('6.3', 'Mark Notification as Read', 'PATCH', `/notifications/${createdNotificationId}/read`, null, account1.token);
    }

    // 6.4 Mark All Notifications as Read
    if (account1.token) {
        await recordTest('6.4', 'Mark All Notifications Read', 'POST', '/notifications/read-all', null, account1.token);
    }

    // 6.5 Register Device Push Token
    if (account1.token) {
        await recordTest('6.5', 'Register Device Push Token', 'POST', '/notifications/device-token', {
            device_token: 'fcm_mock_token_123456789',
            platform: 'android',
        }, account1.token);
    }

    // -------------------------------------------------------------
    // MODULE 7: FILE STORAGE MODULE (2 APIs)
    // -------------------------------------------------------------
    console.log('\n--- 7. FILE STORAGE MODULE ---');

    // 7.1 File Upload (Mock payload check)
    if (account1.token) {
        await recordTest('7.1', 'File Upload Endpoint Check', 'POST', '/file/upload', { mock: true }, account1.token);
    }

    // 7.2 File Delete
    if (account1.token) {
        await recordTest('7.2', 'File Delete Endpoint Check', 'POST', '/file/delete', { publicId: 'mock/public_id_123' }, account1.token);
    }

    // -------------------------------------------------------------
    // MODULE 8: SUPPORT & SYSTEM MODULE (2 APIs)
    // -------------------------------------------------------------
    console.log('\n--- 8. SUPPORT & SYSTEM MODULE ---');

    // 8.1 Get FAQs
    await recordTest('8.1', 'Get FAQs List', 'GET', '/support/faqs');

    // 8.2 Submit Contact Ticket
    if (account1.token) {
        await recordTest('8.2', 'Submit Support Contact Ticket', 'POST', '/support/contact', {
            subject: 'App Feedback & Push Notification Issue',
            message: 'I am having trouble receiving instant push alerts for critical blood matches.',
        }, account1.token);
    }

    // SUMMARY REPORT
    console.log('\n=============================================================');
    console.log('📊 LIFELINK COMPLETE API TEST RESULTS & PERFORMANCE SUMMARY');
    console.log('=============================================================\n');

    let totalCalls = results.length;
    let successfulCalls = results.filter(r => r.success).length;
    let failedCalls = totalCalls - successfulCalls;
    let totalTime = results.reduce((acc, curr) => acc + curr.timeMs, 0);
    let avgTime = Math.round(totalTime / totalCalls);

    console.log(`Total APIs Tested: ${totalCalls}`);
    console.log(`Successful Calls: ${successfulCalls} ✅`);
    console.log(`Failed Calls:     ${failedCalls} ${failedCalls > 0 ? '❌' : ''}`);
    console.log(`Average Latency:  ${avgTime} ms\n`);

    console.log('| ID   | Endpoint                           | Status | Time (ms) | Result |');
    console.log('|------|------------------------------------|--------|-----------|--------|');
    results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        console.log(`| ${r.id.padEnd(4)} | ${r.endpoint.padEnd(34)} | ${String(r.status).padEnd(6)} | ${String(r.timeMs).padEnd(9)} | ${icon}     |`);
    });

    fs.writeFileSync('api-test-results.json', JSON.stringify(results, null, 2));
    console.log('\nDetailed JSON test output written to api-test-results.json');
}

runAllTests().catch(console.error);
