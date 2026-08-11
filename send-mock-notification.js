const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const appId = process.env.ONESIGNAL_APP_ID;
const apiKey = process.env.ONE_SIGNAL_API_KEY;

if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(url, key);

const targetUserId1 = '4da7550d-46e0-4aa3-8bca-691000908767'; // Usman Usman
const targetUserId2 = '4b0a7099-4080-4e65-9cc8-6081a45e2bc1'; // Test User

const mockNotification = {
    user_id: targetUserId1,
    type: 'blood_request',
    title: '🚨 Urgent Blood Match (B+)',
    body: 'Mayo Hospital Lahore urgently needs 3 units of B+ blood for emergency surgery.',
    is_read: false,
    urgency: 'critical',
    blood_group: 'B+',
    hospital_name: 'Mayo Hospital, Lahore',
    created_at: new Date().toISOString(),
};

async function sendNotification() {
    console.log(`\n=================================================`);
    console.log(`🚀 DISPATCHING BROADCAST & USER PUSH NOTIFICATIONS`);
    console.log(`=================================================\n`);

    // 1. Store in Supabase notifications table
    await supabase.from('notifications').insert([
        { ...mockNotification, user_id: targetUserId1 },
        { ...mockNotification, user_id: targetUserId2 }
    ]);
    console.log('✅ Stored notifications in Supabase DB for active users.');

    if (!appId || !apiKey) {
        console.error('❌ OneSignal credentials missing in .env');
        return;
    }

    // 2. Broadcast push notification to ALL subscribed devices on your OneSignal App
    console.log('\n📡 Sending OneSignal Broadcast Push to all active app installations...');
    try {
        const broadcastPayload = {
            app_id: appId,
            included_segments: ['Subscribed Users'],
            headings: { en: mockNotification.title },
            contents: { en: mockNotification.body },
            data: {
                type: 'blood_request',
                urgency: 'critical',
                bloodType: 'B+',
                hospital: 'Mayo Hospital, Lahore',
            },
        };

        const res1 = await fetch('https://api.onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(broadcastPayload),
        });

        const json1 = await res1.json();
        console.log('OneSignal Broadcast Push Result:', JSON.stringify(json1, null, 2));

        // 3. User-specific push to 4da7550d-46e0-4aa3-8bca-691000908767
        console.log('\n👤 Sending Targeted Push to user 4da7550d-46e0-4aa3-8bca-691000908767...');
        const userPayload1 = {
            app_id: appId,
            include_external_user_ids: [targetUserId1],
            headings: { en: '🚨 Direct Push: ' + mockNotification.title },
            contents: { en: mockNotification.body },
            data: { type: 'blood_request', urgency: 'critical' },
        };

        const res2 = await fetch('https://api.onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userPayload1),
        });

        const json2 = await res2.json();
        console.log('OneSignal User Target Push Result:', JSON.stringify(json2, null, 2));

    } catch (err) {
        console.error('❌ OneSignal API fetch error:', err);
    }
}

sendNotification().catch(console.error);
