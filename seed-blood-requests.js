const http = require('http');

const BASE_URL = 'http://localhost:3001';

const sampleUser = {
    email: 'netnetify@gmail.com',
    password: 'Admin@123',
};

const mockRequests = [
    {
        patient_name: 'Zainab Bibi',
        blood_group: 'B+',
        units_required: 3,
        hospital_name: 'Mayo Hospital',
        hospital_address: 'Hospital Road, Anarkali',
        city_id: 'city_lahore',
        latitude: 31.5723,
        longitude: 74.3213,
        urgency: 'critical',
        contact_number: '+923001234567',
        description: 'Urgent B+ blood needed for major cardiovascular surgery at Mayo Hospital.',
        required_date: '2026-07-28T10:00:00Z',
    },
    {
        patient_name: 'Muhammad Hassan',
        blood_group: 'O-',
        units_required: 4,
        hospital_name: 'Jinnah Postgraduate Medical Centre',
        hospital_address: 'Rafiqui Shaheed Road, Cantonment',
        city_id: 'city_karachi',
        latitude: 24.8532,
        longitude: 67.0352,
        urgency: 'critical',
        contact_number: '+923219876543',
        description: 'Universal donor O- blood required urgently for trauma unit ICU patient.',
        required_date: '2026-07-28T12:00:00Z',
    },
    {
        patient_name: 'Fatima Zahra',
        blood_group: 'A+',
        units_required: 2,
        hospital_name: 'Shifa International Hospital',
        hospital_address: 'Sector H-8/4',
        city_id: 'city_islamabad',
        latitude: 33.6844,
        longitude: 73.0479,
        urgency: 'high',
        contact_number: '+923335551234',
        description: 'A+ blood needed for chemotherapy patient experiencing low hemoglobin count.',
        required_date: '2026-07-29T09:00:00Z',
    },
    {
        patient_name: 'Tariq Mehmood',
        blood_group: 'AB+',
        units_required: 2,
        hospital_name: 'Combined Military Hospital (CMH)',
        hospital_address: 'Mall Road, Cantonment',
        city_id: 'city_rawalpindi',
        latitude: 33.5971,
        longitude: 73.0458,
        urgency: 'high',
        contact_number: '+923124449876',
        description: 'AB+ whole blood required for emergency knee replacement surgery.',
        required_date: '2026-07-28T15:00:00Z',
    },
    {
        patient_name: 'Ayesha Malik',
        blood_group: 'O+',
        units_required: 3,
        hospital_name: 'Services Hospital',
        hospital_address: 'Jail Road, Shadman',
        city_id: 'city_lahore',
        latitude: 31.5432,
        longitude: 74.3382,
        urgency: 'critical',
        contact_number: '+923017778899',
        description: 'Critical O+ blood required immediately for post-accident internal bleeding treatment.',
        required_date: '2026-07-27T18:00:00Z',
    },
    {
        patient_name: 'Bilal Ahmed',
        blood_group: 'B-',
        units_required: 2,
        hospital_name: 'Aga Khan University Hospital',
        hospital_address: 'Stadium Road, Bahadurabad',
        city_id: 'city_karachi',
        latitude: 24.8923,
        longitude: 67.0747,
        urgency: 'critical',
        contact_number: '+923451112233',
        description: 'Rare B- blood required for pediatric leukemia patient receiving treatment.',
        required_date: '2026-07-29T11:30:00Z',
    },
    {
        patient_name: 'Usman Ghani',
        blood_group: 'A-',
        units_required: 3,
        hospital_name: 'Nishtar Hospital',
        hospital_address: 'Nishtar Road',
        city_id: 'city_multan',
        latitude: 30.1978,
        longitude: 71.4429,
        urgency: 'high',
        contact_number: '+923086663322',
        description: 'A- blood needed for dialysis and anemia management.',
        required_date: '2026-07-30T10:00:00Z',
    },
    {
        patient_name: 'Sadia Umar',
        blood_group: 'O+',
        units_required: 2,
        hospital_name: 'Lady Reading Hospital',
        hospital_address: 'Soekarno Road, Khyber Bazaar',
        city_id: 'city_peshawar',
        latitude: 34.0150,
        longitude: 71.5805,
        urgency: 'normal',
        contact_number: '+923159990011',
        description: 'O+ blood needed for elective orthopedic procedure.',
        required_date: '2026-07-31T08:00:00Z',
    },
    {
        patient_name: 'Hamza Imran',
        blood_group: 'AB-',
        units_required: 1,
        hospital_name: 'Allied Hospital',
        hospital_address: 'Jail Road',
        city_id: 'city_faisalabad',
        latitude: 31.4312,
        longitude: 73.0694,
        urgency: 'critical',
        contact_number: '+923023334455',
        description: 'Urgent AB- blood needed for emergency bypass procedure.',
        required_date: '2026-07-28T14:00:00Z',
    },
    {
        patient_name: 'Khadija Rehman',
        blood_group: 'B+',
        units_required: 5,
        hospital_name: 'Doctors Hospital & Medical Center',
        hospital_address: 'Johar Town, Canal Bank Road',
        city_id: 'city_lahore',
        latitude: 31.4789,
        longitude: 74.2654,
        urgency: 'critical',
        contact_number: '+923008889900',
        description: 'Multiple B+ donors needed for major liver transplant operation.',
        required_date: '2026-07-28T08:00:00Z',
    },
    {
        patient_name: 'Kamran Akmal',
        blood_group: 'A+',
        units_required: 2,
        hospital_name: 'Indus Hospital',
        hospital_address: 'Korangi Crossing',
        city_id: 'city_karachi',
        latitude: 24.8118,
        longitude: 67.1197,
        urgency: 'normal',
        contact_number: '+923214445566',
        description: 'A+ blood needed for thalessemia minor transfusion routine.',
        required_date: '2026-08-01T10:00:00Z',
    },
    {
        patient_name: 'Saima Noor',
        blood_group: 'O-',
        units_required: 3,
        hospital_name: 'Pakistan Institute of Medical Sciences (PIMS)',
        hospital_address: 'Sector G-8/3',
        city_id: 'city_islamabad',
        latitude: 33.7028,
        longitude: 73.0588,
        urgency: 'critical',
        contact_number: '+923348887766',
        description: 'O- blood desperately needed for maternal emergency delivery complication.',
        required_date: '2026-07-28T06:00:00Z',
    },
    {
        patient_name: 'Noman Ali',
        blood_group: 'B+',
        units_required: 2,
        hospital_name: 'Holy Family Hospital',
        hospital_address: 'Satellite Town',
        city_id: 'city_rawalpindi',
        latitude: 33.6339,
        longitude: 73.0673,
        urgency: 'high',
        contact_number: '+923135556677',
        description: 'B+ blood required for dengue fever patient with dropping platelet count.',
        required_date: '2026-07-29T12:00:00Z',
    },
    {
        patient_name: 'Zubair Raza',
        blood_group: 'O+',
        units_required: 3,
        hospital_name: 'Chughtai Lab & Medical Center',
        hospital_address: 'Jail Road, Gulberg',
        city_id: 'city_lahore',
        latitude: 31.5367,
        longitude: 74.3421,
        urgency: 'high',
        contact_number: '+923051239876',
        description: 'O+ blood required for spinal surgery.',
        required_date: '2026-07-30T11:00:00Z',
    },
    {
        patient_name: 'Maryam Nawaz',
        blood_group: 'A-',
        units_required: 2,
        hospital_name: 'Civil Hospital',
        hospital_address: 'Baba-e-Urdu Road',
        city_id: 'city_karachi',
        latitude: 24.8589,
        longitude: 67.0112,
        urgency: 'critical',
        contact_number: '+923332221100',
        description: 'A- blood needed immediately for burn ward patient in critical condition.',
        required_date: '2026-07-28T16:00:00Z',
    }
];

function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers,
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsed;
                try { parsed = JSON.parse(data); } catch { parsed = data; }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on('error', (err) => {
            resolve({ status: 'ERROR', data: err.message });
        });

        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function seedData() {
    console.log('\n=================================================');
    console.log('🌱 LIFELINK - SEEDING DIVERSE REALISTIC BLOOD REQUESTS');
    console.log('=================================================\n');

    // 1. Login / Signup User
    let loginRes = await makeRequest('POST', '/auth/login', sampleUser);
    let token = loginRes.data?.session?.access_token;

    if (!token) {
        console.log('User login failed, attempting signup...');
        let signupRes = await makeRequest('POST', '/auth/signup', sampleUser);
        token = signupRes.data?.session?.access_token;
    }

    if (!token) {
        console.error('❌ Could not authenticate user. Seeding aborted.');
        process.exit(1);
    }

    console.log('✅ Authenticated successfully. Creating blood requests...\n');

    let createdCount = 0;

    for (let i = 0; i < mockRequests.length; i++) {
        const reqData = mockRequests[i];
        const res = await makeRequest('POST', '/blood-requests', reqData, token);

        if (res.status === 201 || res.status === 200) {
            createdCount++;
            const reqObj = res.data?.data;
            console.log(`✅ [${createdCount}/${mockRequests.length}] Created: ${reqData.patient_name} | ${reqData.blood_group} | ${reqData.city_id} | Urgency: ${reqData.urgency.toUpperCase()}`);
        } else {
            console.log(`❌ Failed to create request for ${reqData.patient_name}:`, res.data);
        }
    }

    console.log('\n=================================================');
    console.log(`🎉 SEEDING COMPLETE! ${createdCount}/${mockRequests.length} Requests Successfully Created.`);
    console.log('=================================================\n');
}

seedData().catch(console.error);
