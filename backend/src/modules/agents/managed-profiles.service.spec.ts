import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ManagedProfilesService } from './managed-profiles.service';
import { Profile } from '../users/entities/profile.entity';
import { ProfileDetails } from '../profile-details/entities/profile-details.entity';
import { User } from '../auth/entities/user.entity';
import { AgentProfile } from './entities/agent-profile.entity';
import { AppConfigService } from '../../config/app-config.service';
import { AuditService } from '../../platform/audit/audit.service';
import { InvitationsService } from '../invitations/invitations.service';
import { ConsentService } from '../circulation/consent.service';
import { AgentBillingService } from './agent-billing.service';
import { ModerationService } from '../../platform/moderation/moderation.service';
import { ConsentMethod, ConsentRelation, UserRole } from '../../common/enums';
import { CreateManagedProfileDto } from './dto/managed-profile.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';

describe('managed profile biodata intake', () => {
  const actor: AuthUser = { userId: 'agent-1', email: 'agent@example.com',
    role: UserRole.AGENT, managedByAgentId: null };
  const dto: CreateManagedProfileDto = {
    displayName: 'Rahul Kumar', contactPhone: '9876543210', dateOfBirth: '1998-08-15', gender: 'male',
    consent: { method: ConsentMethod.IN_PERSON, givenByRelation: ConsentRelation.SELF, givenAt: '2026-01-01' },
    biodata: { firstName: 'Rahul', lastName: 'Kumar', heightCm: 175, religion: 'Hindu',
      caste: 'Kamma', subCaste: 'Example', motherTongue: 'Telugu', highestQualification: 'B.Tech',
      profession: 'Software Engineer', company: 'Example Ltd', fatherName: 'Ramesh', motherName: 'Lakshmi',
      familyType: 'Nuclear', rashi: 'Mesha', timeOfBirth: '06:30', communicationAddress: 'Hyderabad' },
  };

  async function setup() {
    let saved: Partial<Profile> = {};
    const profileRepo = {
      count: jest.fn(async () => 0), find: jest.fn(async () => []),
      create: jest.fn((value: Partial<Profile>) => value),
      save: jest.fn(async (value: Partial<Profile>) => (saved = { ...value, id: 'profile-1' })),
      findOne: jest.fn(async () => saved),
    };
    const detailsRepo = { create: jest.fn((value: Partial<ProfileDetails>) => value),
      save: jest.fn(async (value: Partial<ProfileDetails>) => value) };
    const manager = { getRepository: (entity: unknown) => entity === Profile ? profileRepo : detailsRepo };
    const transaction = jest.fn(async (work: (value: typeof manager) => Promise<unknown>) => work(manager));
    const consent = { record: jest.fn() };
    const invitations = { invite: jest.fn() };
    const module = await Test.createTestingModule({ providers: [ManagedProfilesService,
      { provide: getRepositoryToken(Profile), useValue: { ...profileRepo, manager: { transaction } } },
      { provide: getRepositoryToken(User), useValue: { findOne: jest.fn(async () => null) } },
      { provide: getRepositoryToken(AgentProfile), useValue: {} },
      { provide: AppConfigService, useValue: { stewardship: { requireAgentApproval: false, maxManagedProfiles: 100 } } },
      { provide: AuditService, useValue: { record: jest.fn() } },
      { provide: InvitationsService, useValue: invitations },
      { provide: ConsentService, useValue: consent },
      { provide: AgentBillingService, useValue: {} },
      { provide: ModerationService, useValue: {} },
    ] }).compile();
    return { service: module.get(ManagedProfilesService), detailsRepo, profileRepo, transaction, consent, invitations };
  }

  it('persists real profile fields and associated existing Biodata sections', async () => {
    const { service, detailsRepo, transaction, invitations } = await setup();
    const profile = await service.create(actor, dto);
    expect(profile).toMatchObject({ id: 'profile-1', dateOfBirth: '1998-08-15', gender: 'male', contactPhone: '9876543210' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(detailsRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      profileId: profile.id, firstName: 'Rahul', lastName: 'Kumar', heightCm: 175,
      religion: 'Hindu', caste: 'Kamma', subCaste: 'Example', motherTongue: 'Telugu',
      highestQualification: 'B.Tech', communicationAddress: 'Hyderabad', familyType: 'nuclear',
      father: { name: 'Ramesh' }, mother: { name: 'Lakshmi' },
      employment: { role: 'Software Engineer', designation: 'Software Engineer', company: 'Example Ltd' },
      horoscope: { rashi: 'Mesha', timeOfBirth: '06:30' },
    }));
    expect(invitations.invite).not.toHaveBeenCalled();
  });

  it('does not invent missing marital, employment or family facts', async () => {
    const { service, detailsRepo } = await setup();
    await service.create(actor, { ...dto, contactPhone: undefined, biodata: { firstName: 'Rahul' } });
    expect(detailsRepo.save).toHaveBeenCalledWith({ profileId: 'profile-1', biodataDocumentUrl: null, firstName: 'Rahul' });
  });

  it('propagates Biodata persistence failure without reporting success or inviting', async () => {
    const { service, detailsRepo, consent, invitations } = await setup();
    detailsRepo.save.mockRejectedValueOnce(new Error('database failure'));
    await expect(service.create(actor, { ...dto, inviteNow: true })).rejects.toThrow('database failure');
    expect(consent.record).not.toHaveBeenCalled();
    expect(invitations.invite).not.toHaveBeenCalled();
  });
});
