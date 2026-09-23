export const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

export const MARITAL = [
  { value: 'never_married', label: 'Never Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
];

export const RELIGIONS = [
  { value: 'hindu', label: 'Hindu' },
  { value: 'muslim', label: 'Muslim' },
  { value: 'christian', label: 'Christian' },
  { value: 'sikh', label: 'Sikh' },
  { value: 'jain', label: 'Jain' },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'other', label: 'Other' },
];

export const HEIGHTS = [
  { value: '152', label: `5' 0" (152 cm)` },
  { value: '155', label: `5' 1" (155 cm)` },
  { value: '157', label: `5' 2" (157 cm)` },
  { value: '160', label: `5' 3" (160 cm)` },
  { value: '163', label: `5' 4" (163 cm)` },
  { value: '165', label: `5' 5" (165 cm)` },
  { value: '168', label: `5' 6" (168 cm)` },
  { value: '170', label: `5' 7" (170 cm)` },
  { value: '173', label: `5' 8" (173 cm)` },
  { value: '175', label: `5' 9" (175 cm)` },
  { value: '178', label: `5' 10" (178 cm)` },
  { value: '180', label: `5' 11" (180 cm)` },
  { value: '183', label: `6' 0" (183 cm)` },
];

export const NRI_OPTIONS = [
  { value: 'no_preference', label: "Doesn't matter" },
  { value: 'yes', label: 'Yes, prefer NRI' },
  { value: 'no', label: 'No, prefer non-NRI' },
];

export const NRI_LABEL: Record<string, string> = {
  no_preference: "Doesn't matter",
  yes: 'Yes, prefer NRI',
  no: 'No, prefer non-NRI',
};

export const FAMILY_TYPES = [
  { value: 'joint', label: 'Joint' },
  { value: 'nuclear', label: 'Nuclear' },
];

export const OCCUPATION_STATUS = [
  { value: 'employed', label: 'Employed' },
  { value: 'business', label: 'Business' },
  { value: 'not_working', label: 'Not working' },
  { value: 'student', label: 'Student' },
];

export const stored = (value: unknown): string =>
  typeof value === 'number' || (typeof value === 'string' && value.trim()) ? String(value) : '';
