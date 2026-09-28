import {
  COMPLEXION_LABEL,
  FAMILY_STATUS_LABEL,
  FAMILY_TYPE_LABEL,
  MARITAL_LABEL,
  OCCUPATION_LABEL,
  SELF_MARITAL_STATUSES,
} from '@/shared/permissions';

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

export const MARITAL = SELF_MARITAL_STATUSES.map((value) => ({ value, label: MARITAL_LABEL[value] }));

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

export const FAMILY_TYPES = options(FAMILY_TYPE_LABEL);

export const OCCUPATION_STATUS = options(OCCUPATION_LABEL);

export const stored = (value: unknown): string =>
  typeof value === 'number' || (typeof value === 'string' && value.trim()) ? String(value) : '';

export const COMPLEXIONS = options(COMPLEXION_LABEL);

export const FAMILY_STATUSES = options(FAMILY_STATUS_LABEL);

export const LIFE_STATUSES = [
  { value: 'alive', label: 'Alive' },
  { value: 'deceased', label: 'Deceased' },
];

export const KUJA_DOSHAM_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

export const HOROSCOPE_EXPECTATIONS = [
  { value: 'required', label: 'Required' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'not_required', label: 'Not required' },
];

export const KUJA_PREFERENCES = [
  { value: 'must_match', label: 'Must match' },
  { value: 'no_objection', label: 'No objection' },
];
