import { Repository } from 'typeorm';
import { ProfileDetailsService } from './profile-details.service';
import { ProfileDetails } from './entities/profile-details.entity';
import { ProfileSibling } from './entities/profile-sibling.entity';
import { ProfileAsset } from './entities/profile-asset.entity';
import { Profile } from '../users/entities/profile.entity';
import { User } from '../auth/entities/user.entity';
import { Interest } from '../matchmaking/entities/interest.entity';
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
});
