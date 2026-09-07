const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(url, key);

async function checkCities() {
    const { data: requests } = await supabase.from('blood_requests').select('id, patient_name, hospital_name, city_id, contact_number, requester_id');
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, city_id, city, state, country');

    console.log('--- BLOOD REQUESTS CITIES ---');
    (requests || []).forEach(r => {
        console.log(`Req ID: ${r.id.substring(0, 8)} | Patient: ${r.patient_name} | Hospital: ${r.hospital_name} | City ID: ${r.city_id}`);
    });

    console.log('\n--- PROFILES CITIES ---');
    (profiles || []).forEach(p => {
        console.log(`Profile ID: ${p.id.substring(0, 8)} | Name: ${p.full_name} | City ID: ${p.city_id} | City: ${p.city} | Country: ${p.country}`);
    });
}

checkCities();
