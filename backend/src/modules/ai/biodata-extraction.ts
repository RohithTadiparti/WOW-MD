/**
 * Reading a biodata document into the fields the biodata form has.
 *
 * Two halves. The prompt asks the model for every field the form can take, in
 * one flat shape. The normaliser then turns what came back into the form's own
 * values: "Groom" into male, "5'6\"" into 168, "Middle Class" into
 * middle_class. Anything it cannot place is dropped rather than passed on, so
 * a partial read fills only what it found and never puts a value in a field
 * that the form would then refuse on save.
 */

export const BIODATA_EXTRACTION_PROMPT = `You are a biodata extraction assistant. Read this marriage biodata (image or document) and return one JSON object with any of these fields that the document states:
{
  "firstName": "string",
  "lastName": "string (surname / family name)",
  "gender": "male or female (a groom is male, a bride is female)",
  "dateOfBirth": "YYYY-MM-DD",
  "heightCm": "whole number of centimetres; convert feet and inches (5 ft 6 in = 168)",
  "complexion": "fair, wheatish, dusky or dark",
  "maritalStatus": "never_married, divorced, widowed, separated or annulled",
  "religion": "string",
  "caste": "string",
  "subCaste": "string",
  "motherTongue": "string",
  "state": "state of residence",
  "city": "city of residence",
  "communicationAddress": "string",
  "alternateMobile": "string",
  "highestQualification": "string, e.g. B.Tech, MBA",
  "course": "string, the subject or branch",
  "institution": "string, college or university",
  "occupationStatus": "employed, self_employed, not_employed, student, homemaker or retired",
  "profession": "string",
  "company": "string, employer",
  "designation": "string, job title",
  "annualIncome": "number in rupees per year",
  "fatherName": "string",
  "fatherProfession": "string",
  "motherName": "string",
  "motherProfession": "string",
  "brothers": "number",
  "sisters": "number",
  "familyType": "joint, nuclear, extended or single_parent",
  "familyStatus": "lower_middle_class, middle_class, upper_middle_class or affluent",
  "nativePlace": "string",
  "aboutMe": "string, what the person says about themselves",
  "rashi": "string",
  "star": "string, the nakshatra",
  "padam": "string",
  "gothram": "string",
  "timeOfBirth": "HH:MM in 24-hour time",
  "preferredAgeMin": "number, youngest partner age wanted",
  "preferredAgeMax": "number, oldest partner age wanted",
  "preferredHeightMin": "shortest partner height wanted, in centimetres",
  "preferredHeightMax": "tallest partner height wanted, in centimetres"
}
Do not invent values. Leave out any field the document does not state. Return ONLY raw JSON, without markdown formatting or code blocks.`;

type Raw = Record<string, unknown>;

const text = (value: unknown, max = 200): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, max) : undefined;
};

/** A number in range, or undefined. Text with no digits in it is not a zero. */
const whole = (value: unknown, min: number, max: number): number | undefined => {
  if (typeof value !== 'number' && !/\d/.test(String(value ?? ''))) return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : undefined;
};

/** A value matched to one of `choices` by its words, or undefined. */
function choose<T extends string>(value: unknown, choices: Record<string, T>): T | undefined {
  const key = text(value)?.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  if (!key) return undefined;
  if (choices[key]) return choices[key];
  const hit = Object.entries(choices).find(([word]) => key.includes(word));
  return hit?.[1];
}

const GENDER = { male: 'male', man: 'male', groom: 'male', boy: 'male', m: 'male', female: 'female', woman: 'female', bride: 'female', girl: 'female', f: 'female' } as const;
const COMPLEXION = { fair: 'fair', wheatish: 'wheatish', wheat: 'wheatish', dusky: 'dusky', dark: 'dark' } as const;
const MARITAL = {
  'never married': 'never_married', unmarried: 'never_married', single: 'never_married', bachelor: 'never_married', spinster: 'never_married',
  divorced: 'divorced', divorcee: 'divorced', widowed: 'widowed', widow: 'widowed', widower: 'widowed',
  separated: 'separated', annulled: 'annulled',
} as const;
const OCCUPATION = {
  'self employed': 'self_employed', business: 'self_employed', 'not employed': 'not_employed', unemployed: 'not_employed',
  employed: 'employed', job: 'employed', working: 'employed', student: 'student', homemaker: 'homemaker', housewife: 'homemaker', retired: 'retired',
} as const;
const FAMILY_TYPE = { joint: 'joint', nuclear: 'nuclear', extended: 'extended', 'single parent': 'single_parent' } as const;
const FAMILY_STATUS = {
  'lower middle': 'lower_middle_class', 'upper middle': 'upper_middle_class', middle: 'middle_class', affluent: 'affluent', rich: 'affluent', upper: 'affluent',
} as const;

/** "1998-08-15", "15/08/1998" or "15.08.1998" as an ISO date, or undefined. */
function isoDate(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(raw);
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return undefined;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "06:30", "6:30 am" or "18:30" as 24-hour HH:MM, or undefined. */
function clockTime(value: unknown): string | undefined {
  const raw = text(value)?.toLowerCase();
  const match = raw && /^(\d{1,2})[:.](\d{2})\s*(am|pm)?/.exec(raw);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (match[3] === 'pm' && hour < 12) hour += 12;
  if (match[3] === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * The model's reply as the biodata form's fields. `heightCm` is converted by
 * the caller's own reader so both heights follow one rule.
 *
 * Older replies nested education and the parents (`education.course`,
 * `family.father.name`); both shapes are read.
 */
export function normaliseExtraction(raw: Raw, heightCm: (value: unknown) => number | null): Raw {
  const education = (raw.education as Raw | undefined) ?? {};
  const family = (raw.family as Raw | undefined) ?? {};
  const father = (family.father as Raw | undefined) ?? (raw.father as Raw | undefined) ?? {};
  const mother = (family.mother as Raw | undefined) ?? (raw.mother as Raw | undefined) ?? {};
  const horoscope = (raw.horoscope as Raw | undefined) ?? {};

  const out: Raw = {
    firstName: text(raw.firstName, 60),
    lastName: text(raw.lastName, 60),
    gender: choose(raw.gender, GENDER),
    dateOfBirth: isoDate(raw.dateOfBirth),
    heightCm: heightCm(raw.heightCm) ?? undefined,
    complexion: choose(raw.complexion, COMPLEXION),
    maritalStatus: choose(raw.maritalStatus, MARITAL),
    religion: text(raw.religion, 60),
    caste: text(raw.caste, 60),
    subCaste: text(raw.subCaste, 60),
    motherTongue: text(raw.motherTongue, 60),
    state: text(raw.state, 80),
    city: text(raw.city, 80),
    communicationAddress: text(raw.communicationAddress, 500),
    alternateMobile: text(raw.alternateMobile, 20),
    highestQualification: text(raw.highestQualification ?? education.highestQualification, 80),
    course: text(raw.course ?? education.course, 80),
    institution: text(raw.institution ?? education.institution, 120),
    occupationStatus: choose(raw.occupationStatus ?? education.occupationStatus, OCCUPATION),
    profession: text(raw.profession, 80),
    company: text(raw.company, 120),
    designation: text(raw.designation, 80),
    annualIncome: whole(raw.annualIncome, 1, 1_000_000_000),
    fatherName: text(raw.fatherName ?? father.name, 120),
    fatherProfession: text(raw.fatherProfession ?? father.profession, 80),
    motherName: text(raw.motherName ?? mother.name, 120),
    motherProfession: text(raw.motherProfession ?? mother.profession, 80),
    brothers: whole(raw.brothers, 0, 20),
    sisters: whole(raw.sisters, 0, 20),
    familyType: choose(raw.familyType, FAMILY_TYPE),
    familyStatus: choose(raw.familyStatus, FAMILY_STATUS),
    nativePlace: text(raw.nativePlace, 120),
    aboutMe: text(raw.aboutMe ?? raw.bio, 2000),
    rashi: text(raw.rashi ?? horoscope.rashi, 60),
    star: text(raw.star ?? horoscope.star, 60),
    padam: text(raw.padam ?? horoscope.padam, 20),
    gothram: text(raw.gothram ?? horoscope.gothram, 60),
    timeOfBirth: clockTime(raw.timeOfBirth ?? horoscope.timeOfBirth),
    preferredAgeMin: whole(raw.preferredAgeMin, 18, 99),
    preferredAgeMax: whole(raw.preferredAgeMax, 18, 99),
    preferredHeightMinCm: heightCm(raw.preferredHeightMin ?? raw.preferredHeightMinCm) ?? undefined,
    preferredHeightMaxCm: heightCm(raw.preferredHeightMax ?? raw.preferredHeightMaxCm) ?? undefined,
  };
  return Object.fromEntries(Object.entries(out).filter(([, value]) => value !== undefined));
}
