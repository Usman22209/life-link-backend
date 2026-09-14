/**
 * Blood Compatibility Utility
 * Implements standard international medical ABO and Rh (D) blood transfusion rules.
 */

export type BloodGroup = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export const ALL_BLOOD_GROUPS: BloodGroup[] = [
    'O-',
    'O+',
    'A-',
    'A+',
    'B-',
    'B+',
    'AB-',
    'AB+',
];

export const RECIPIENT_COMPATIBILITY_MAP: Record<BloodGroup, BloodGroup[]> = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

export const DONOR_COMPATIBILITY_MAP: Record<BloodGroup, BloodGroup[]> = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+'],
};

export const normalizeBloodGroup = (group?: string | null): BloodGroup | null => {
    if (!group) return null;
    const clean = group.toUpperCase().replace(/\s+/g, '').trim();
    if (ALL_BLOOD_GROUPS.includes(clean as BloodGroup)) {
        return clean as BloodGroup;
    }
    return null;
};

export const isBloodCompatible = (
    donorGroup?: string | null,
    recipientGroup?: string | null,
): boolean => {
    const donor = normalizeBloodGroup(donorGroup);
    const recipient = normalizeBloodGroup(recipientGroup);

    if (!donor || !recipient) {
        return true;
    }

    const allowedDonors = RECIPIENT_COMPATIBILITY_MAP[recipient];
    return allowedDonors ? allowedDonors.includes(donor) : false;
};

export const getCompatibleDonors = (recipientGroup?: string | null): BloodGroup[] => {
    const recipient = normalizeBloodGroup(recipientGroup);
    if (!recipient) return ALL_BLOOD_GROUPS;
    return RECIPIENT_COMPATIBILITY_MAP[recipient] || [];
};

export const getCompatibleRecipients = (donorGroup?: string | null): BloodGroup[] => {
    const donor = normalizeBloodGroup(donorGroup);
    if (!donor) return ALL_BLOOD_GROUPS;
    return DONOR_COMPATIBILITY_MAP[donor] || [];
};
