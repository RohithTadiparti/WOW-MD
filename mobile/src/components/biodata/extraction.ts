import { capitalizeWords } from '@/lib/format';

/**
 * What a read biodata document fills in, shaped the way each step reads its
 * stored values.
 *
 * The server hands back one flat object already in the form's own values
 * (`POST /profiles/:id/details/extract`, biodata-extraction.ts): gender as
 * male/female, heights in whole centimetres, enums as their keys. This puts
 * each value where its step looks for it: the parents under `father`/`mother`,
 * the chart under `horoscope`, the employer under `employment`, and the name,
 * date of birth, gender, city and About Me on the profile.
 */
export interface ExtractedDraft {
  profile: Record<string, unknown>;
  details: Record<string, unknown>;
  /** The fields that were filled, as the steps name them, for the AUTO-FILLED tag. */
  keys: Set<string>;
}

type Raw = Record<string, unknown>;

const str = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
/** Names and places read better capitalised; codes, emails and numbers are left alone. */
const proper = (value: unknown) => {
  const text = str(value);
  return text ? capitalizeWords(text) : undefined;
};

const defined = (row: Raw) =>
  Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));

export function draftFromExtraction(data: Raw): ExtractedDraft {
  const firstName = proper(data.firstName);
  const lastName = proper(data.lastName);

  const profile = defined({
    displayName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
    gender: str(data.gender),
    dateOfBirth: str(data.dateOfBirth),
    city: proper(data.city),
    bio: str(data.aboutMe),
  });

  const father = defined({ name: proper(data.fatherName), profession: proper(data.fatherProfession) });
  const mother = defined({ name: proper(data.motherName), profession: proper(data.motherProfession) });
  const horoscope = defined({
    rashi: str(data.rashi),
    star: str(data.star),
    padam: str(data.padam),
    gothram: proper(data.gothram),
    timeOfBirth: str(data.timeOfBirth),
  });
  const employment = defined({
    company: proper(data.company),
    designation: proper(data.designation),
    salary: num(data.annualIncome),
  });

  const details = defined({
    firstName,
    lastName,
    heightCm: num(data.heightCm),
    complexion: str(data.complexion),
    maritalStatus: str(data.maritalStatus),
    religion: str(data.religion),
    caste: proper(data.caste),
    subCaste: proper(data.subCaste),
    motherTongue: str(data.motherTongue),
    state: str(data.state),
    communicationAddress: proper(data.communicationAddress),
    alternateMobile: str(data.alternateMobile),
    highestQualification: str(data.highestQualification),
    course: proper(data.course),
    institution: proper(data.institution),
    occupationStatus: str(data.occupationStatus),
    employment: Object.keys(employment).length ? employment : undefined,
    father: Object.keys(father).length ? father : undefined,
    mother: Object.keys(mother).length ? mother : undefined,
    brothers: num(data.brothers),
    sisters: num(data.sisters),
    familyType: str(data.familyType),
    familyStatus: str(data.familyStatus),
    nativePlace: proper(data.nativePlace),
    horoscopeAvailable: Object.keys(horoscope).length ? true : undefined,
    horoscope: Object.keys(horoscope).length ? horoscope : undefined,
    preferredAgeMin: num(data.preferredAgeMin),
    preferredAgeMax: num(data.preferredAgeMax),
    preferredHeightMinCm: num(data.preferredHeightMinCm),
    preferredHeightMaxCm: num(data.preferredHeightMaxCm),
  });

  // The names each step checks for its AUTO-FILLED tag.
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(details)) {
    if (value && typeof value === 'object') {
      for (const inner of Object.keys(value)) keys.add(`${key}.${inner}`);
    } else keys.add(key);
  }
  for (const key of Object.keys(profile)) keys.add(key === 'city' ? 'location' : key);
  if (profile.displayName) keys.add('firstName').add('lastName');
  return { profile, details, keys };
}

const empty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0);

/**
 * The server's values with the draft laid under them: an extracted value fills
 * a field only while it is still empty, so anything already saved (by this
 * person or by somebody else editing the same profile) always wins, and a
 * step saved and reopened shows what was saved.
 */
export function underlay(saved: Raw | null | undefined, draft: Raw): Raw {
  const out: Raw = { ...(saved ?? {}) };
  for (const [key, value] of Object.entries(draft)) {
    const current = out[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = underlay(empty(current) ? {} : (current as Raw), value as Raw);
    } else if (empty(current)) {
      out[key] = value;
    }
  }
  return out;
}
