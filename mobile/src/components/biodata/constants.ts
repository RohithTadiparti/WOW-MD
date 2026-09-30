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
  // The server's values: 'business' and 'not_working' were refused outright.
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-employed / business' },
  { value: 'not_employed', label: 'Not currently employed' },
  { value: 'student', label: 'Student' },
  { value: 'homemaker', label: 'Homemaker' },
  { value: 'retired', label: 'Retired' },
];

/** Income besides the main occupation; the same list as the web form. */
export const OTHER_INCOME_SOURCES = [
  { value: 'business', label: 'Business on the side' },
  { value: 'rental', label: 'Rental income' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'investments', label: 'Investments' },
  { value: 'freelance', label: 'Freelance / consulting' },
  { value: 'other', label: 'Other' },
];

/** The server takes up to five. */
export const OTHER_INCOME_LIMIT = 5;

export const stored = (value: unknown): string =>
  typeof value === 'number' || (typeof value === 'string' && value.trim()) ? String(value) : '';

/**
 * First and last name to start the form with: the biodata's own when it has
 * them, otherwise the account's display name split at the first space.
 */
export function namesFrom(
  displayName: unknown,
  details: Record<string, unknown>,
): { firstName: string; lastName: string } {
  const first = stored(details.firstName);
  const last = stored(details.lastName) || stored(details.surname);
  if (first || last) return { firstName: first, lastName: last };
  const [head = '', ...rest] = String(displayName ?? '').trim().split(/\s+/);
  return { firstName: head, lastName: rest.join(' ') };
}

/** The account's display name, from the two biodata fields. */
export const displayNameOf = (firstName: string, lastName: string): string =>
  [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

export const COMPLEXIONS = [
  { value: 'fair', label: 'Fair' },
  { value: 'wheatish', label: 'Wheatish' },
  { value: 'dark', label: 'Dark' },
  { value: 'very_fair', label: 'Very Fair' },
];

export const FAMILY_STATUSES = [
  { value: 'lower_middle_class', label: 'Lower middle class' },
  { value: 'middle_class', label: 'Middle class' },
  { value: 'upper_middle_class', label: 'Upper middle class' },
  { value: 'affluent', label: 'Affluent' },
];

export const KUJA_DOSHAM_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];
