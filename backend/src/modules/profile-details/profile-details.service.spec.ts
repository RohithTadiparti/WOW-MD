import { Repository } from 'typeorm';
import { ProfileDetailsService } from './profile-details.service';
import { ProfileDetails } from './entities/profile-details.entity';
import { ProfileSibling } from './entities/profile-sibling.entity';
import { ProfileAsset } from './entities/profile-asset.entity';
import { Profile } from '../users/entities/profile.entity';
import { User } from '../auth/entities/user.entity';
import { Interest } from '../matchmaking/entities/interest.entity';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../../platform/storage/storage.service';
import { RedisService } from '../../platform/redis/redis.service';
import { ModerationService } from '../../platform/moderation/moderation.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  Complexion,
  FamilyType,
  MaritalStatus,
  OccupationStatus,
  UserRole,
} from '../../common/enums';
import {
  EducationDetailsDto,
  FamilyDetailsDto,
  HoroscopeDetailsDto,
  MaritalDetailsDto,
  PartnerPreferencesDto,
  PersonalDetailsDto,
  ReligionDetailsDto,
} from './dto/profile-details.dto';

const owner: AuthUser = {
  userId: 'u1',
  email: 'u1@example.com',
  role: UserRole.BRIDE,
  managedByAgentId: null,
};

/**
 * Saving one biodata section must never blank another (the reported "personal
 * details are getting wiped").
 *
 * The repository stand-in behaves as TypeORM's `save` does for a loaded row:
 * a property left `undefined` is not written, and every read is a fresh copy of
 * what is stored. That is what makes a `?? null` in a section save visible
 * here: it turns "not sent" into a real write of nothing.
 */
describe('ProfileDetailsService section saves', () => {
  let stored: Record<string, unknown> | null;
  let profile: Profile;

  const details = {
    findOne: jest.fn(async () => (stored ? ({ ...stored } as unknown as ProfileDetails) : null)),
    create: jest.fn((init: Partial<ProfileDetails>) => ({ ...init }) as ProfileDetails),
    save: jest.fn(async (row: ProfileDetails) => {
      const written = Object.fromEntries(
        Object.entries(row).filter(([, value]) => value !== undefined),
      );
      stored = { ...(stored ?? {}), ...written };
      return { ...stored } as unknown as ProfileDetails;
    }),
  } as unknown as Repository<ProfileDetails>;

  const profiles = {
    findOne: jest.fn(async () => profile),
    save: jest.fn(async (p: Profile) => p),
  } as unknown as Repository<Profile>;

  const redis = { raw: { keys: jest.fn(async () => []) }, del: jest.fn() } as unknown as RedisService;

  const service = new ProfileDetailsService(
    details,
    {} as Repository<ProfileSibling>,
    {} as Repository<ProfileAsset>,
    profiles,
    {} as Repository<User>,
    redis,
    {} as ModerationService,
    {} as Repository<Interest>,
    {} as AiService,
    {} as StorageService,
  );

  const personal = (over: Partial<PersonalDetailsDto> = {}) =>
    ({
      firstName: 'Bhavana',
      lastName: 'Rao',
      heightCm: 160,
      complexion: Complexion.WHEATISH,
      communicationAddress: '12 Test Road, Hyderabad',
      ...over,
    }) as PersonalDetailsDto;

  const PERSONAL = {
    firstName: 'Bhavana',
    lastName: 'Rao',
    heightCm: 160,
    complexion: Complexion.WHEATISH,
    communicationAddress: '12 Test Road, Hyderabad',
    alternateMobile: '+919876543210',
    residence: { city: 'Hyderabad', state: 'Telangana' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    stored = null;
    profile = {
      id: 'p1',
      userId: 'u1',
      managedByUserId: null,
      managingFor: null,
      photos: ['a.jpg', 'b.jpg', 'c.jpg'],
      preferences: {},
    } as unknown as Profile;
  });

  it('keeps the personal section intact while every other section is saved', async () => {
    await service.savePersonal(
      owner,
      'p1',
      personal({ alternateMobile: '+919876543210', residence: PERSONAL.residence }),
    );

    await service.saveReligion(owner, 'p1', {
      religion: 'Hindu',
      caste: 'Kamma',
      subCaste: '',
      motherTongue: 'Telugu',
    } as ReligionDetailsDto);
    await service.saveHoroscope(owner, 'p1', {
      horoscopeAvailable: true,
      rashi: 'Tula',
    } as HoroscopeDetailsDto);
    await service.saveMarital(owner, 'p1', {
      maritalStatus: MaritalStatus.NEVER_MARRIED,
    } as MaritalDetailsDto);
    await service.saveFamily(owner, 'p1', {
      father: { name: 'Ravi Rao' },
      mother: { name: 'Lata Rao' },
      familyType: FamilyType.NUCLEAR,
      familyStatus: 'middle_class',
      brothers: 1,
      sisters: 0,
    } as unknown as FamilyDetailsDto);
    await service.saveEducation(owner, 'p1', {
      highestQualification: 'Masters',
      course: 'M.Tech',
      occupationStatus: OccupationStatus.STUDENT,
    } as EducationDetailsDto);
    await service.savePreferences(owner, 'p1', {
      preferredAgeMin: 25,
      preferredAgeMax: 32,
      preferredHeightMinCm: 165,
      preferredHeightMaxCm: 190,
    } as PartnerPreferencesDto);

    expect(stored).toMatchObject(PERSONAL);
    expect(stored).toMatchObject({ religion: 'Hindu', maritalStatus: 'never_married' });
  });

  it('leaves an unsent residence and alternate mobile alone on a personal save', async () => {
    stored = { profileId: 'p1', ...PERSONAL };

    // What the web form sends: it has no residence field at all.
    await service.savePersonal(owner, 'p1', personal({ heightCm: 162 }));

    expect(stored).toMatchObject({
      heightCm: 162,
      residence: PERSONAL.residence,
      alternateMobile: PERSONAL.alternateMobile,
    });
  });

  it('clears the alternate mobile when a null is sent for it', async () => {
    stored = { profileId: 'p1', ...PERSONAL };

    await service.savePersonal(
      owner,
      'p1',
      personal({ alternateMobile: null as unknown as string }),
    );

    expect(stored?.alternateMobile).toBeNull();
    expect(stored?.residence).toEqual(PERSONAL.residence);
  });

  it('keeps an unsent denomination, institution and college place', async () => {
    stored = { profileId: 'p1', denomination: 'Shaiva', institution: 'IIT', collegePlace: 'Delhi' };

    await service.saveReligion(owner, 'p1', {
      religion: 'Hindu',
      caste: 'Kamma',
      subCaste: '',
      motherTongue: 'Telugu',
    } as ReligionDetailsDto);
    await service.saveEducation(owner, 'p1', {
      highestQualification: 'Masters',
      course: 'M.Tech',
      occupationStatus: OccupationStatus.STUDENT,
    } as EducationDetailsDto);

    expect(stored).toMatchObject({ denomination: 'Shaiva', institution: 'IIT', collegePlace: 'Delhi' });

    await service.saveEducation(owner, 'p1', {
      highestQualification: 'Masters',
      course: 'M.Tech',
      occupationStatus: OccupationStatus.STUDENT,
      institution: null as unknown as string,
    } as EducationDetailsDto);
    expect(stored?.institution).toBeNull();
    expect(stored?.collegePlace).toBe('Delhi');
  });

  const EDUCATION = {
    highestQualification: 'Masters',
    course: 'M.Tech',
    occupationStatus: OccupationStatus.EMPLOYED,
    employment: { company: 'Acme', designation: 'Engineer', salary: '1200000' },
  };

  it('keeps other income when a save does not send it, and replaces it when one does', async () => {
    await service.saveEducation(owner, 'p1', {
      ...EDUCATION,
      otherIncome: [{ source: 'business', details: '  Textile shop ', annualIncome: '600000' }],
    } as EducationDetailsDto);
    expect(stored?.otherIncome).toEqual([
      { source: 'business', details: 'Textile shop', annualIncome: '600000' },
    ]);

    // An older client, which knows nothing of the field.
    await service.saveEducation(owner, 'p1', EDUCATION as EducationDetailsDto);
    expect(stored?.otherIncome).toHaveLength(1);

    await service.saveEducation(owner, 'p1', {
      ...EDUCATION,
      otherIncome: [],
    } as EducationDetailsDto);
    expect(stored?.otherIncome).toEqual([]);
  });

  it('shares other income without the amounts unless income is shown', async () => {
    const sharing = new ProfileDetailsService(
      details,
      { find: jest.fn(async () => []) } as unknown as Repository<ProfileSibling>,
      { find: jest.fn(async () => []) } as unknown as Repository<ProfileAsset>,
      profiles,
      {} as Repository<User>,
      redis,
      {} as ModerationService,
      {} as Repository<Interest>,
      {} as AiService,
      {} as StorageService,
    );
    stored = {
      profileId: 'p1',
      ...EDUCATION,
      business: {},
      otherIncome: [{ source: 'rental', annualIncome: '300000' }],
      incomeVisible: false,
    };

    const hidden = await sharing.findShareable('p1');
    expect(hidden.details?.otherIncome).toEqual([{ source: 'rental' }]);
    expect(hidden.details?.employment).not.toHaveProperty('salary');

    stored.incomeVisible = true;
    const shown = await sharing.findShareable('p1');
    expect(shown.details?.otherIncome).toEqual([{ source: 'rental', annualIncome: '300000' }]);
  });
});

/**
 * The biodata reader may only be pointed at the caller's own biodata upload,
 * and reads it through a link signed here rather than one the client sent.
 */
describe('ProfileDetailsService.extractBiodata', () => {
  const profile = { id: 'p1', userId: 'u1', managedByUserId: null } as unknown as Profile;
  const details = {
    findOne: jest.fn(async () => null),
    create: jest.fn((init: Partial<ProfileDetails>) => ({ ...init }) as ProfileDetails),
  } as unknown as Repository<ProfileDetails>;
  const profiles = { findOne: jest.fn(async () => profile) } as unknown as Repository<Profile>;
  const ai = { extractBiodata: jest.fn(async () => ({ firstName: 'Bhavana' })) };
  const storage = { signedUrl: jest.fn(async (key: string) => `https://signed.example/${key}`) };

  const service = new ProfileDetailsService(
    details,
    {} as Repository<ProfileSibling>,
    {} as Repository<ProfileAsset>,
    profiles,
    {} as Repository<User>,
    {} as RedisService,
    {} as ModerationService,
    {} as Repository<Interest>,
    ai as unknown as AiService,
    storage as unknown as StorageService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('signs a short-lived link to the caller\'s own biodata and reads that', async () => {
    const key = 'users/u1/biodata/1767000000000-abcdef0123456789-biodata.jpg';
    await expect(service.extractBiodata(owner, 'p1', key)).resolves.toEqual({ firstName: 'Bhavana' });
    expect(storage.signedUrl).toHaveBeenCalledWith(key, {
      expiresInSeconds: ProfileDetailsService.EXTRACT_LINK_SECONDS,
    });
    expect(ai.extractBiodata).toHaveBeenCalledWith(`https://signed.example/${key}`);
  });

  it.each([
    ['somebody else\'s biodata', 'users/u2/biodata/1-a-biodata.jpg'],
    ['a file from another area', 'users/u1/attachments/1-a-receipt.jpg'],
    ['a key the platform never minted', 'https://attacker.example/x.jpg'],
    ['a key that climbs out', 'users/u1/biodata/../profile/x.jpg'],
  ])('refuses %s without calling the model', async (_what, key) => {
    await expect(service.extractBiodata(owner, 'p1', key)).rejects.toThrow('That is not a biodata you uploaded');
    expect(storage.signedUrl).not.toHaveBeenCalled();
    expect(ai.extractBiodata).not.toHaveBeenCalled();
  });

  it('refuses a document the reader cannot look at', async () => {
    await expect(
      service.extractBiodata(owner, 'p1', 'users/u1/biodata/1-a-biodata.pdf'),
    ).rejects.toThrow('JPEG, PNG or WebP');
    expect(ai.extractBiodata).not.toHaveBeenCalled();
  });
});
