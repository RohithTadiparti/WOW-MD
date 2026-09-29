import { ForbiddenException } from '@nestjs/common';
import { WowEmployeePlannersService } from './wow-employee-planners.service';
import { User } from '../auth/entities/user.entity';
import { WeddingPlan } from '../planner/entities/wedding-plan.entity';
import { WeddingEvent } from '../events/entities/event.entity';
import { Profile } from '../users/entities/profile.entity';
import { WowEmployeePlannerProfile } from './entities/wow-employee-planner-profile.entity';
import { WowPlannerAssignment } from './entities/wow-planner-assignment.entity';
import { PlannerProfileStatus, PlannerType, UserRole } from '../../common/enums';

const profile = (): WowEmployeePlannerProfile => ({
  id: 'employee-profile',
  userId: 'planner-user',
  employeeId: 'WOW-101',
  joiningDate: '2026-01-01',
  firstName: 'Ananya',
  lastName: 'Sharma',
  plannerType: PlannerType.WOW_EMPLOYEE,
  profileStatus: PlannerProfileStatus.COMPLETE,
  profileCompletion: 100,
  displayName: 'Ananya Sharma',
  headline: 'Wedding coordinator',
  about: 'Coordinates multi-day weddings.',
  languages: ['English'],
  primaryCity: 'Hyderabad',
  state: 'Telangana',
  serviceAreas: ['Hyderabad'],
  yearsExperience: 6,
  weddingsHandled: 40,
  expertise: [],
  specializations: ['Traditional Weddings'],
  preferredWeddingTypes: [],
  supportedEvents: ['Wedding Ceremony'],
  services: ['Vendor Coordination'],
  workingDays: ['Saturday'],
  workingHoursStart: null,
  workingHoursEnd: null,
  availableDates: [],
  unavailableDates: [],
  leaveDates: [],
  portfolio: ['https://media.example/work.jpg'],
  achievements: [],
  certifications: [],
  experienceHighlights: [],
  destinationWeddingsSupported: false,
  maxSimultaneousWeddings: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  alternateMobile: null,
  profilePhotoUrl: null,
});

describe('WowEmployeePlannersService', () => {
  const employee = profile();
  const plannerUser = { id: 'planner-user', role: UserRole.PLANNER, isActive: true } as User;
  const plan = { id: 'wedding-plan', userId: 'client-user', weddingDate: null, plannerUserId: null } as WeddingPlan;
  const existingAssignment = {
    id: 'old-assignment',
    plannerUserId: 'previous-planner',
    clientUserId: 'client-user',
    weddingPlanId: 'wedding-plan',
    weddingDate: '2026-12-12',
    eventDates: ['2026-12-12'],
    eventIds: [],
    services: ['Vendor Coordination'],
    status: 'confirmed',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  } as WowPlannerAssignment;
  const assignmentRepo = {
    count: jest.fn(async () => 0),
    findOne: jest.fn(async (_query?: unknown) => existingAssignment),
    create: jest.fn((row: Partial<WowPlannerAssignment>) => row as WowPlannerAssignment),
    save: jest.fn(async (row: WowPlannerAssignment) => ({ ...row, id: 'assignment-id' })),
    createQueryBuilder: jest.fn(() => {
      const builder = {
        where: jest.fn(),
        andWhere: jest.fn(),
        getCount: jest.fn(async () => 0),
      };
      builder.where.mockReturnValue(builder);
      builder.andWhere.mockReturnValue(builder);
      return builder;
    }),
  };
  const userRepo = {
    findOne: jest.fn(async (query: { where?: { id?: string } }) => ({ ...plannerUser, id: query.where?.id ?? plannerUser.id })),
    exist: jest.fn(async () => true),
  };
  const profileRepo = { findOne: jest.fn(async () => employee), save: jest.fn(async (row: WowEmployeePlannerProfile) => row) };
  const planRepo = {
    findOne: jest.fn(async () => plan),
    save: jest.fn(async (row: WeddingPlan) => row),
  };
  const eventRepo = { find: jest.fn(async () => []) };
  const clientProfiles = { findOne: jest.fn(async () => ({ displayName: 'Rahul & Ananya' } as Profile)) };
  const audit = { record: jest.fn(async () => undefined) };
  const notifications = { create: jest.fn(async () => undefined) };
  const dataSource = {
    manager: {},
    transaction: jest.fn(async (work: (manager: unknown) => Promise<unknown>) => work({
      getRepository: (entity: unknown) => {
        if (entity === User) return userRepo;
        if (entity === WowEmployeePlannerProfile) return profileRepo;
        if (entity === WeddingPlan) return planRepo;
        if (entity === WeddingEvent) return eventRepo;
        if (entity === WowPlannerAssignment) return assignmentRepo;
        throw new Error('Unexpected repository');
      },
    })),
  };
  const service = new WowEmployeePlannersService(
    userRepo as never,
    profileRepo as never,
    assignmentRepo as never,
    planRepo as never,
    eventRepo as never,
    clientProfiles as never,
    dataSource as never,
    { requestPasswordReset: jest.fn() } as never,
    audit as never,
    { auth: { bcryptRounds: 10 } } as never,
    notifications as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    employee.profileStatus = PlannerProfileStatus.COMPLETE;
    employee.maxSimultaneousWeddings = 1;
    existingAssignment.status = 'confirmed';
    plan.weddingDate = null;
    plan.plannerUserId = null;
  });

  it('assigns a WOW employee to the existing client wedding at zero fee', async () => {
    const result = await service.hire(
      { userId: 'client-user', role: UserRole.BRIDE, email: 'client@example.test', managedByAgentId: null },
      plannerUser.id,
      { weddingPlanId: plan.id, weddingDate: '2026-12-12', eventIds: [], services: [] },
    );

    expect(plan.plannerUserId).toBe(plannerUser.id);
    expect(result).toMatchObject({ planner: 'Ananya Sharma', serviceFee: 0, totalPlannerFee: 0 });
    expect(result.booking).toMatchObject({ clientUserId: 'client-user', weddingPlanId: plan.id, weddingDate: '2026-12-12' });
    expect(assignmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ eventDates: ['2026-12-12'] }));
    expect(assignmentRepo.count).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'wow_planner_assignment' }), expect.anything());
    expect(notifications.create).toHaveBeenCalled();
  });

  it('refuses planner accounts attempting to hire an employee planner as clients', async () => {
    await expect(service.hire(
      { userId: plannerUser.id, role: UserRole.PLANNER, email: 'planner@example.test', managedByAgentId: null },
      plannerUser.id,
      { weddingPlanId: plan.id, weddingDate: '2026-12-12', eventIds: [], services: [] },
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('preserves the old employee assignment and audits an admin reassignment reason', async () => {
    plan.plannerUserId = 'previous-planner';
    const oldAssignment = await assignmentRepo.findOne({});

    await service.reassign(
      { userId: 'admin-user', role: UserRole.ADMIN, email: 'admin@example.test', managedByAgentId: null },
      { weddingPlanId: plan.id, newPlannerUserId: 'replacement-planner', reason: 'Planner leave approved' },
    );

    expect(oldAssignment.status).toBe('reassigned');
    expect(plan.plannerUserId).toBe('replacement-planner');
    expect(assignmentRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      plannerUserId: 'replacement-planner', status: 'confirmed', weddingPlanId: plan.id,
    }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        previousPlannerUserId: 'previous-planner',
        newPlannerUserId: 'replacement-planner',
        reason: 'Planner leave approved',
      }),
    }), expect.anything());
  });
});
