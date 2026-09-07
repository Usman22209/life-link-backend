const http = require('http');

const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

async function verify() {
    console.log('\n======================================================');
    console.log('VERIFYING LOCATION & CITY NAME RESOLUTION FOR DASHBOARD');
    console.log('======================================================\n');

    const feedRes = await fetchJson('/blood-requests/feed?page=1&limit=20&status=all');
    const requests = feedRes.data?.requests || [];

    console.log(`Fetched ${requests.length} blood requests:\n`);
    requests.forEach(r => {
        console.log(`Patient: ${r.patient_name?.padEnd(16)} | Hospital: ${r.hospital_name?.padEnd(35)} | Raw ID: ${String(r.city_id).padEnd(14)} -> City: ${String(r.city).padEnd(18)} | Country: ${r.country}`);
    });

    console.log('\n======================================================\n');
}

verify().catch(console.error);
