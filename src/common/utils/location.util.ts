export interface ResolvedLocation {
    city_id: string;
    city: string;
    city_name: string;
    state: string;
    country: string;
    location_formatted: string;
}

const CITY_LOOKUP_MAP: { [key: string]: { city: string; state: string; country: string } } = {
    // Specific GeoNames / CSC dataset numeric IDs found in app database
    '1183539': { city: 'Kot Radha Kishan', state: 'Punjab', country: 'Pakistan' },
    '8504972': { city: 'Lahore', state: 'Punjab', country: 'Pakistan' },
    '1183460': { city: 'Lahore', state: 'Punjab', country: 'Pakistan' },
    '1175966': { city: 'Lahore', state: 'Punjab', country: 'Pakistan' },
    '1172451': { city: 'Lahore', state: 'Punjab', country: 'Pakistan' },
    '11726748': { city: 'Faisalabad', state: 'Punjab', country: 'Pakistan' },
    '1174872': { city: 'Karachi', state: 'Sindh', country: 'Pakistan' },
    '1162015': { city: 'Islamabad', state: 'Islamabad Capital Territory', country: 'Pakistan' },
    '1169825': { city: 'Multan', state: 'Punjab', country: 'Pakistan' },
    '1168197': { city: 'Peshawar', state: 'Khyber Pakhtunkhwa', country: 'Pakistan' },
    '1166993': { city: 'Rawalpindi', state: 'Punjab', country: 'Pakistan' },
    '1167528': { city: 'Quetta', state: 'Balochistan', country: 'Pakistan' },
    '1164909': { city: 'Sialkot', state: 'Punjab', country: 'Pakistan' },
    '1177658': { city: 'Gujranwala', state: 'Punjab', country: 'Pakistan' },
    '1183707': { city: 'Bahawalpur', state: 'Punjab', country: 'Pakistan' },
    '1166000': { city: 'Sargodha', state: 'Punjab', country: 'Pakistan' },
    '1176734': { city: 'Hyderabad', state: 'Sindh', country: 'Pakistan' },
    '1184949': { city: 'Abbottabad', state: 'Khyber Pakhtunkhwa', country: 'Pakistan' },
    '1175249': { city: 'Kasur', state: 'Punjab', country: 'Pakistan' },
    '1165140': { city: 'Sheikhupura', state: 'Punjab', country: 'Pakistan' },
    '1177638': { city: 'Gujrat', state: 'Punjab', country: 'Pakistan' },
    '1175815': { city: 'Jhelum', state: 'Punjab', country: 'Pakistan' },
    '1169371': { city: 'Okara', state: 'Punjab', country: 'Pakistan' },
    '1166379': { city: 'Sahiwal', state: 'Punjab', country: 'Pakistan' },
    '1163683': { city: 'Sukkur', state: 'Sindh', country: 'Pakistan' },
    '1173663': { city: 'Larkana', state: 'Sindh', country: 'Pakistan' },
    '1167180': { city: 'Rahim Yar Khan', state: 'Punjab', country: 'Pakistan' },
    '1170063': { city: 'Muzaffarabad', state: 'Azad Jammu and Kashmir', country: 'Pakistan' },
    '1170884': { city: 'Mirpur', state: 'Azad Jammu and Kashmir', country: 'Pakistan' },
    '1178657': { city: 'Gilgit', state: 'Gilgit-Baltistan', country: 'Pakistan' },
    '1164807': { city: 'Skardu', state: 'Gilgit-Baltistan', country: 'Pakistan' },

    // Slug-based IDs
    'city_lahore': { city: 'Lahore', state: 'Punjab', country: 'Pakistan' },
    'city_karachi': { city: 'Karachi', state: 'Sindh', country: 'Pakistan' },
    'city_islamabad': { city: 'Islamabad', state: 'Islamabad Capital Territory', country: 'Pakistan' },
    'city_rawalpindi': { city: 'Rawalpindi', state: 'Punjab', country: 'Pakistan' },
    'city_faisalabad': { city: 'Faisalabad', state: 'Punjab', country: 'Pakistan' },
    'city_multan': { city: 'Multan', state: 'Punjab', country: 'Pakistan' },
    'city_peshawar': { city: 'Peshawar', state: 'Khyber Pakhtunkhwa', country: 'Pakistan' },
    'city_quetta': { city: 'Quetta', state: 'Balochistan', country: 'Pakistan' },
    'city_sialkot': { city: 'Sialkot', state: 'Punjab', country: 'Pakistan' },
    'city_gujranwala': { city: 'Gujranwala', state: 'Punjab', country: 'Pakistan' },
    'city_bahawalpur': { city: 'Bahawalpur', state: 'Punjab', country: 'Pakistan' },
    'city_sargodha': { city: 'Sargodha', state: 'Punjab', country: 'Pakistan' },
    'city_hyderabad': { city: 'Hyderabad', state: 'Sindh', country: 'Pakistan' },
    'city_abbottabad': { city: 'Abbottabad', state: 'Khyber Pakhtunkhwa', country: 'Pakistan' },
    'city_kasur': { city: 'Kasur', state: 'Punjab', country: 'Pakistan' },
    'city_sheikhupura': { city: 'Sheikhupura', state: 'Punjab', country: 'Pakistan' },
    'city_gujrat': { city: 'Gujrat', state: 'Punjab', country: 'Pakistan' },
    'city_jhelum': { city: 'Jhelum', state: 'Punjab', country: 'Pakistan' },
    'city_okara': { city: 'Okara', state: 'Punjab', country: 'Pakistan' },
    'city_sahiwal': { city: 'Sahiwal', state: 'Punjab', country: 'Pakistan' },
    'city_sukkur': { city: 'Sukkur', state: 'Sindh', country: 'Pakistan' },
    'city_larkana': { city: 'Larkana', state: 'Sindh', country: 'Pakistan' },
    'city_rahim_yar_khan': { city: 'Rahim Yar Khan', state: 'Punjab', country: 'Pakistan' },
    'city_muzaffarabad': { city: 'Muzaffarabad', state: 'Azad Jammu and Kashmir', country: 'Pakistan' },
    'city_mirpur': { city: 'Mirpur', state: 'Azad Jammu and Kashmir', country: 'Pakistan' },
    'city_gilgit': { city: 'Gilgit', state: 'Gilgit-Baltistan', country: 'Pakistan' },
    'city_skardu': { city: 'Skardu', state: 'Gilgit-Baltistan', country: 'Pakistan' },
    'city_kot_radha_kishan': { city: 'Kot Radha Kishan', state: 'Punjab', country: 'Pakistan' },
    'city_manawan': { city: 'Manawan', state: 'Punjab', country: 'Pakistan' },
};

export function resolveLocation(
    rawCityId?: string | null,
    existingCity?: string | null,
    existingState?: string | null,
    existingCountry?: string | null,
): ResolvedLocation {
    const rawKey = String(rawCityId || existingCity || '').trim();

    // 1. Direct lookup in lookup dictionary
    if (rawKey && CITY_LOOKUP_MAP[rawKey.toLowerCase()]) {
        const found = CITY_LOOKUP_MAP[rawKey.toLowerCase()];
        return {
            city_id: rawCityId || rawKey,
            city: found.city,
            city_name: found.city,
            state: existingState || found.state,
            country: existingCountry || found.country,
            location_formatted: `${found.city}, ${existingCountry || found.country}`,
        };
    }

    // 2. Format slug like 'city_kot_radha_kishan' -> 'Kot Radha Kishan'
    if (rawKey.startsWith('city_')) {
        const formatted = rawKey
            .replace('city_', '')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        const country = existingCountry || 'Pakistan';
        const state = existingState || 'Punjab';
        return {
            city_id: rawCityId || rawKey,
            city: formatted,
            city_name: formatted,
            state,
            country,
            location_formatted: `${formatted}, ${country}`,
        };
    }

    // 3. If already human-readable non-numeric text
    if (existingCity && isNaN(Number(existingCity)) && existingCity.length > 1) {
        const country = existingCountry || 'Pakistan';
        const state = existingState || '';
        return {
            city_id: rawCityId || existingCity,
            city: existingCity,
            city_name: existingCity,
            state,
            country,
            location_formatted: `${existingCity}, ${country}`,
        };
    }

    // 4. If rawCityId is a clean non-numeric string
    if (rawKey && isNaN(Number(rawKey)) && rawKey.length > 1) {
        const country = existingCountry || 'Pakistan';
        const state = existingState || '';
        return {
            city_id: rawKey,
            city: rawKey,
            city_name: rawKey,
            state,
            country,
            location_formatted: `${rawKey}, ${country}`,
        };
    }

    // Default fallback
    const fallbackCity = existingCity || 'Lahore';
    const fallbackCountry = existingCountry || 'Pakistan';
    const fallbackState = existingState || 'Punjab';

    return {
        city_id: rawCityId || 'city_lahore',
        city: fallbackCity,
        city_name: fallbackCity,
        state: fallbackState,
        country: fallbackCountry,
        location_formatted: `${fallbackCity}, ${fallbackCountry}`,
    };
}
