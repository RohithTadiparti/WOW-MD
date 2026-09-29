import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { isIndividual, NotificationType, PlannerProfileStatus, PlannerType, UserRole } from '../../common/enums';
import { AuditAction, AuditService } from '../../platform/audit/audit.service';
import { AppConfigService } from '../../config/app-config.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { WeddingPlan } from '../planner/entities/wedding-plan.entity';
import { WeddingEvent } from '../events/entities/event.entity';
import { Profile } from '../users/entities/profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateWowEmployeePlannerDto,
  AssignWowPlannerDto,
  HireWowPlannerDto,
  ReassignWowPlannerDto,
  UpdateWowEmployeePlannerAdminDto,
  UpdateWowPlannerProfileDto,
} from './dto/wow-employee-planner.dto';
import { WowEmployeePlannerProfile } from './entities/wow-employee-planner-profile.entity';
import { WowPlannerAssignment } from './entities/wow-planner-assignment.entity';

@Injectable()
export class WowEmployeePlannersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(WowEmployeePlannerProfile)
    private readonly profiles: Repository<WowEmployeePlannerProfile>,
    @InjectRepository(WowPlannerAssignment)
    private readonly assignments: Repository<WowPlannerAssignment>,
    @InjectRepository(WeddingPlan) private readonly plans: Repository<WeddingPlan>,
    @InjectRepository(WeddingEvent) private readonly events: Repository<WeddingEvent>,
    @InjectRepository(Profile) private readonly clientProfiles: Repository<Profile>,
    private readonly dataSource: DataSource,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(actor: AuthUser, dto: CreateWowEmployeePlannerDto) {
    const email = dto.officialEmail.trim().toLowerCase();
    const phone = dto.mobileNumber.trim();
    const [emailExists, phoneExists, employeeExists] = await Promise.all([
      this.users.exist({ where: { email } }),
      this.users.exist({ where: { phone } }),
      this.profiles.exist({ where: { employeeId: dto.employeeId.trim() } }),
    ]);
    if (emailExists) throw new ConflictException('That email already has an account');
    if (phoneExists) throw new ConflictException('That mobile number already has an account');
    if (employeeExists) throw new ConflictException('That employee ID is already in use');

    const user = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const profileRepo = manager.getRepository(WowEmployeePlannerProfile);
      const savedUser = await userRepo.save(
        userRepo.create({
          email,
          phone,
          passwordHash: await bcrypt.hash(
            randomBytes(32).toString('hex'),
            this.config.auth.bcryptRounds,
          ),
          role: UserRole.PLANNER,
          isActive: dto.isActive === true,
          isVerified: false,
          isProvisioned: true,
        }),
      );
      await profileRepo.save(
        profileRepo.create({
          userId: savedUser.id,
          employeeId: dto.employeeId.trim(),
          joiningDate: dto.joiningDate,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          alternateMobile: dto.alternateMobile?.trim() || null,
          profilePhotoUrl: dto.profilePhotoUrl?.trim() || null,
        }),
      );
      return savedUser;
    });

    if (user.isActive) await this.auth.requestPasswordReset(email);
    await this.audit.record({
      action: AuditAction.WOW_PLANNER_CREATED,
      actor,
      resourceType: 'wow_employee_planner',
      resourceId: user.id,
      metadata: { employeeId: dto.employeeId.trim(), isActive: user.isActive },
    });
    return this.getByUserId(user.id);
  }

  async list() {
    const [profiles, assignments] = await Promise.all([
      this.profiles.find({ order: { createdAt: 'DESC' } }),
      this.assignments.find({ where: { status: 'confirmed' }, select: ['plannerUserId'] }),
    ]);
    const users = profiles.length ? await this.users.find({
      where: profiles.map((profile) => ({ id: profile.userId })),
      select: ['id', 'email', 'phone', 'role', 'isActive', 'createdAt'],
    }) : [];
    const userById = new Map(users.map((user) => [user.id, user]));
    const assignedCounts = new Map<string, number>();
    for (const assignment of assignments) {
      assignedCounts.set(assignment.plannerUserId, (assignedCounts.get(assignment.plannerUserId) ?? 0) + 1);
    }
    return profiles.map((profile) => this.adminView(profile, userById.get(profile.userId), assignedCounts.get(profile.userId) ?? 0));
  }

  async listAssignments() {
    const assignments = await this.assignments.find({
      where: { status: 'confirmed' },
      order: { weddingDate: 'ASC' },
    });
    if (assignments.length === 0) return [];
    const [employeeProfiles, clientProfiles] = await Promise.all([
      this.profiles.find({ where: { userId: In([...new Set(assignments.map((row) => row.plannerUserId))]) } }),
      this.clientProfiles.find({ where: { userId: In([...new Set(assignments.map((row) => row.clientUserId))]) } }),
    ]);
    const plannerName = new Map(employeeProfiles.map((row) => [row.userId, row.displayName ?? `${row.firstName} ${row.lastName}`]));
    const clientName = new Map(clientProfiles.map((row) => [row.userId as string, row.displayName]));
    return assignments.map((assignment) => ({
      ...assignment,
      plannerName: plannerName.get(assignment.plannerUserId) ?? 'WOW Planner',
      clientName: clientName.get(assignment.clientUserId) ?? 'Client',
    }));
  }

  async listAvailableWeddings() {
    const plans = await this.plans.find({
      where: { plannerUserId: IsNull(), plannerBookingId: IsNull() },
      order: { weddingDate: 'ASC' },
      take: 100,
    });
    if (plans.length === 0) return [];
    const clients = await this.clientProfiles.find({
      where: { userId: In([...new Set(plans.map((plan) => plan.userId))]) },
    });
    const names = new Map(clients.map((client) => [client.userId as string, client.displayName]));
    return plans.map((plan) => ({
      weddingPlanId: plan.id,
      clientUserId: plan.userId,
      clientName: names.get(plan.userId) ?? 'Client',
      weddingDate: plan.weddingDate,
    }));
  }

  async getByUserId(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('WOW Planner not found');
    const user = await this.users.findOne({
      where: { id: userId },
      select: ['id', 'email', 'phone', 'role', 'isActive', 'createdAt'],
    });
    if (!user) throw new NotFoundException('WOW Planner account not found');
    const assignedWeddingCount = await this.assignments.count({ where: { plannerUserId: userId, status: 'confirmed' } });
    return this.adminView(profile, user, assignedWeddingCount);
  }

  async updateAdmin(actor: AuthUser, userId: string, dto: UpdateWowEmployeePlannerAdminDto) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('WOW Planner not found');
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.PLANNER) throw new NotFoundException('WOW Planner account not found');
    const before = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      joiningDate: profile.joiningDate,
      alternateMobile: profile.alternateMobile,
      profilePhotoUrl: profile.profilePhotoUrl,
      officialEmail: user.email,
      mobileNumber: user.phone,
    };
    if (dto.officialEmail) {
      const email = dto.officialEmail.trim().toLowerCase();
      const emailOwner = await this.users.findOne({ where: { email }, select: ['id'] });
      if (emailOwner && emailOwner.id !== userId) {
        throw new ConflictException('That email already has an account');
      }
      user.email = email;
    }
    if (dto.mobileNumber) {
      const phone = dto.mobileNumber.trim();
      const phoneOwner = await this.users.findOne({ where: { phone }, select: ['id'] });
      if (phoneOwner && phoneOwner.id !== userId) {
        throw new ConflictException('That mobile number already has an account');
      }
      user.phone = phone;
    }
    await this.users.save(user);
    const { officialEmail: _email, mobileNumber: _mobile, ...profileUpdates } = dto;
    Object.assign(profile, profileUpdates);
    const saved = await this.profiles.save(profile);
    await this.audit.record({
      action: AuditAction.WOW_PLANNER_UPDATED,
      actor,
      resourceType: 'wow_employee_planner',
      resourceId: userId,
      metadata: { before, after: dto },
    });
    return this.getByUserId(saved.userId);
  }

  async setStatus(actor: AuthUser, userId: string, isActive: boolean | string) {
    const user = await this.users.findOne({ where: { id: userId } });
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!user || !profile) throw new NotFoundException('WOW Planner not found');
    const next = isActive === true;
    const previous = user.isActive;
    user.isActive = next;
    await this.users.save(user);
    await this.audit.record({
      action: next ? AuditAction.WOW_PLANNER_ACTIVATED : AuditAction.WOW_PLANNER_DEACTIVATED,
      actor,
      resourceType: 'wow_employee_planner',
      resourceId: userId,
      metadata: { previousStatus: previous ? 'ACTIVE' : 'INACTIVE', status: next ? 'ACTIVE' : 'INACTIVE' },
    });
    if (!previous && next) {
      await this.auth.requestPasswordReset(user.email ?? user.phone ?? '');
    }
    return this.getByUserId(userId);
  }

  async ownProfile(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('This account is not a WOW Employee Planner');
    return this.withCompletion(profile);
  }

  async updateOwnProfile(actor: AuthUser, dto: UpdateWowPlannerProfileDto) {
    const profile = await this.profiles.findOne({ where: { userId: actor.userId } });
    if (!profile) throw new NotFoundException('This account is not a WOW Employee Planner');
    const before = { ...profile };
    Object.assign(profile, dto);
    const { status, completion } = this.completion(profile);
    profile.profileStatus = status;
    profile.profileCompletion = completion;
    const saved = await this.profiles.save(profile);
    await this.audit.record({
      action: AuditAction.WOW_PLANNER_PROFILE_UPDATED,
      actor,
      resourceType: 'wow_employee_planner',
      resourceId: actor.userId,
      metadata: {
        before: this.clientProfileFields(before),
        after: this.clientProfileFields(saved),
        profileStatus: saved.profileStatus,
      },
    });
    return this.withCompletion(saved);
  }

  async discover(city?: string, event?: string) {
    const query = this.profiles.createQueryBuilder('p')
      .where('p."plannerType" = :plannerType', { plannerType: PlannerType.WOW_EMPLOYEE })
      .andWhere('p."profileStatus" = :status', { status: PlannerProfileStatus.COMPLETE });
    if (city) {
      query.andWhere('(LOWER(p."primaryCity") LIKE :city OR p."serviceAreas" @> :serviceArea)', {
        city: `%${city.trim().toLowerCase()}%`,
        serviceArea: JSON.stringify([city.trim()]),
      });
    }
    if (event) {
      query.andWhere('p."supportedEvents" @> :event', { event: JSON.stringify([event]) });
    }
    const profiles = await query.orderBy('p."displayName"', 'ASC').getMany();
    const activeUsers = profiles.length
      ? await this.users.find({
          where: profiles.map((profile) => ({ id: profile.userId, isActive: true, role: UserRole.PLANNER })),
          select: ['id'],
        })
      : [];
    const activeIds = new Set(activeUsers.map((user) => user.id));
    return Promise.all(
      profiles.filter((profile) => activeIds.has(profile.userId)).map(async (profile) => ({
        ...this.clientProfileFields(profile),
        plannerType: PlannerType.WOW_EMPLOYEE,
        badge: 'WOW Planner',
        teamLabel: 'Official WOW Team',
        serviceFee: 0,
        availability: await this.availability(profile, undefined),
      })),
    );
  }

  async publicProfile(userId: string) {
    const profile = await this.profiles.findOne({
      where: { userId, plannerType: PlannerType.WOW_EMPLOYEE, profileStatus: PlannerProfileStatus.COMPLETE },
    });
    if (!profile) throw new NotFoundException('WOW Planner not found');
    const user = await this.users.findOne({
      where: { id: userId, role: UserRole.PLANNER, isActive: true },
      select: ['id'],
    });
    if (!user) throw new NotFoundException('WOW Planner not found');
    return {
      ...this.clientProfileFields(profile),
      plannerType: PlannerType.WOW_EMPLOYEE,
      badge: 'WOW Planner',
      teamLabel: 'Official WOW Team',
      serviceFee: 0,
    };
  }

  async publicAvailability(userId: string, date: string) {
    if (!date || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
      throw new BadRequestException('Provide a valid availability date');
    }
    const profile = await this.profiles.findOne({
      where: { userId, plannerType: PlannerType.WOW_EMPLOYEE, profileStatus: PlannerProfileStatus.COMPLETE },
    });
    if (!profile || !(await this.users.exist({ where: { id: userId, isActive: true } }))) {
      throw new NotFoundException('WOW Planner not found');
    }
    return { date, availability: await this.availability(profile, date) };
  }

  async hire(actor: AuthUser, plannerUserId: string, dto: HireWowPlannerDto) {
    if (!isIndividual(actor.role)) {
      throw new ForbiddenException('Only a client can hire a WOW Planner');
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const profileRepo = manager.getRepository(WowEmployeePlannerProfile);
      const planRepo = manager.getRepository(WeddingPlan);
      const eventRepo = manager.getRepository(WeddingEvent);
      const assignmentRepo = manager.getRepository(WowPlannerAssignment);

      const plannerUser = await userRepo.findOne({
        where: { id: plannerUserId, role: UserRole.PLANNER, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      const profile = await profileRepo.findOne({
        where: { userId: plannerUserId, plannerType: PlannerType.WOW_EMPLOYEE, profileStatus: PlannerProfileStatus.COMPLETE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plannerUser || !profile) throw new NotFoundException('WOW Planner is not available for booking');

      const plan = await planRepo.findOne({
        where: { id: dto.weddingPlanId, userId: actor.userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plan) throw new NotFoundException('Wedding plan not found');
      if (plan.plannerUserId || plan.plannerBookingId) {
        throw new ConflictException('A planner or independent planner booking is already attached to this wedding');
      }
      if (plan.weddingDate && plan.weddingDate !== dto.weddingDate) {
        throw new BadRequestException('The selected date does not match this wedding plan');
      }
      const assignedEvents = dto.eventIds.length
        ? await eventRepo.find({ where: { id: In(dto.eventIds), userId: actor.userId } })
        : [];
      if (assignedEvents.length !== new Set(dto.eventIds).size) {
        throw new BadRequestException('One or more selected events do not belong to this wedding');
      }
      const supported = new Set(profile.supportedEvents.map((value) => value.toLowerCase()));
      const normaliseEvent = (value: string) => value.toLowerCase().replace(/\b(ceremony|event|party)\b/g, '').replace(/\s+/g, ' ').trim();
      const supportedEvents = new Set([...supported].map(normaliseEvent));
      if (assignedEvents.some((event) => !supportedEvents.has(normaliseEvent(event.name)))) {
        throw new BadRequestException('This planner does not support one or more selected events');
      }
      if (dto.services.some((service) => !profile.services.includes(service))) {
        throw new BadRequestException('One or more selected services are not offered by this planner');
      }
      const eventDates = [...new Set([dto.weddingDate, ...assignedEvents.map((event) => event.eventDate).filter((value): value is string => Boolean(value))])];
      for (const eventDate of eventDates) {
        if ((await this.availability(profile, eventDate, manager)) === 'Unavailable') {
          throw new ConflictException('This planner is no longer available on one or more selected dates');
        }
      }

      if (!plan.weddingDate) {
        plan.weddingDate = dto.weddingDate;
        await planRepo.save(plan);
      }
      plan.plannerUserId = plannerUserId;
      const savedPlan = await planRepo.save(plan);
      const assignment = await assignmentRepo.save(assignmentRepo.create({
        plannerUserId,
        clientUserId: actor.userId,
        weddingPlanId: savedPlan.id,
        weddingDate: dto.weddingDate,
        eventIds: dto.eventIds,
        eventDates,
        services: dto.services,
      }));
      await this.audit.record({
        action: AuditAction.WOW_PLANNER_HIRED,
        actor,
        resourceType: 'wow_planner_assignment',
        resourceId: assignment.id,
        metadata: { plannerUserId, clientUserId: actor.userId, weddingPlanId: savedPlan.id, serviceFee: 0 },
      }, manager);
      return { assignment, profile };
    });

    const client = await this.clientProfiles.findOne({ where: { userId: actor.userId } });
    await this.notifications.create(plannerUserId, NotificationType.WOW_PLANNER_ASSIGNED, {
      weddingPlanId: result.assignment.weddingPlanId,
      clientName: client?.displayName ?? 'A client',
    }).catch(() => undefined);
    await this.notifications.create(actor.userId, NotificationType.WOW_PLANNER_BOOKING_CONFIRMED, {
      weddingPlanId: result.assignment.weddingPlanId,
      plannerName: result.profile.displayName ?? `${result.profile.firstName} ${result.profile.lastName}`,
    }).catch(() => undefined);
    return {
      booking: result.assignment,
      planner: result.profile.displayName,
      serviceFee: 0,
      totalPlannerFee: 0,
    };
  }

  async reassign(actor: AuthUser, dto: ReassignWowPlannerDto) {
    const result = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const profileRepo = manager.getRepository(WowEmployeePlannerProfile);
      const planRepo = manager.getRepository(WeddingPlan);
      const assignmentRepo = manager.getRepository(WowPlannerAssignment);
      const plan = await planRepo.findOne({
        where: { id: dto.weddingPlanId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plan?.plannerUserId) throw new NotFoundException('Assigned wedding not found');
      const previousProfile = await profileRepo.findOne({ where: { userId: plan.plannerUserId } });
      if (!previousProfile) throw new BadRequestException('Only WOW employee planner assignments can be reassigned here');
      if (dto.newPlannerUserId === plan.plannerUserId) {
        throw new BadRequestException('Choose a different active WOW Planner');
      }
      const replacementUser = await userRepo.findOne({
        where: { id: dto.newPlannerUserId, role: UserRole.PLANNER, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      const replacementProfile = await profileRepo.findOne({
        where: { userId: dto.newPlannerUserId, plannerType: PlannerType.WOW_EMPLOYEE, profileStatus: PlannerProfileStatus.COMPLETE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!replacementUser || !replacementProfile) {
        throw new NotFoundException('Replacement must be an active WOW Planner with a complete profile');
      }
      const assignment = await assignmentRepo.findOne({
        where: { weddingPlanId: plan.id, status: 'confirmed' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!assignment) throw new NotFoundException('Active WOW Planner assignment not found');
      const dates = assignment.eventDates.length ? assignment.eventDates : [assignment.weddingDate];
      for (const date of dates) {
        if ((await this.availability(replacementProfile, date, manager)) === 'Unavailable') {
          throw new ConflictException('The replacement planner is unavailable on an assigned wedding date');
        }
      }
      assignment.status = 'reassigned';
      await assignmentRepo.save(assignment);
      plan.plannerUserId = replacementUser.id;
      await planRepo.save(plan);
      const replacementAssignment = await assignmentRepo.save(assignmentRepo.create({
        plannerUserId: replacementUser.id,
        clientUserId: assignment.clientUserId,
        weddingPlanId: assignment.weddingPlanId,
        weddingDate: assignment.weddingDate,
        eventDates: assignment.eventDates,
        eventIds: assignment.eventIds,
        services: assignment.services,
        status: 'confirmed',
      }));
      await this.audit.record({
        action: AuditAction.WOW_PLANNER_REASSIGNED,
        actor,
        resourceType: 'wow_planner_assignment',
        resourceId: replacementAssignment.id,
        metadata: {
          weddingPlanId: plan.id,
          previousPlannerUserId: assignment.plannerUserId,
          newPlannerUserId: replacementUser.id,
          reason: dto.reason,
        },
      }, manager);
      return { assignment: replacementAssignment, planner: replacementProfile.displayName };
    });
    await this.notifications.create(result.assignment.plannerUserId, NotificationType.WOW_PLANNER_ASSIGNED, {
      weddingPlanId: result.assignment.weddingPlanId,
      clientName: 'An assigned wedding',
    }).catch(() => undefined);
    await this.notifications.create(result.assignment.clientUserId, NotificationType.WOW_PLANNER_REASSIGNED, {
      weddingPlanId: result.assignment.weddingPlanId,
      plannerName: result.planner,
    }).catch(() => undefined);
    return result;
  }

  async assignByAdmin(actor: AuthUser, dto: AssignWowPlannerDto) {
    const result = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const profileRepo = manager.getRepository(WowEmployeePlannerProfile);
      const planRepo = manager.getRepository(WeddingPlan);
      const assignmentRepo = manager.getRepository(WowPlannerAssignment);
      const plannerUser = await userRepo.findOne({
        where: { id: dto.plannerUserId, role: UserRole.PLANNER, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      const plannerProfile = await profileRepo.findOne({
        where: { userId: dto.plannerUserId, plannerType: PlannerType.WOW_EMPLOYEE, profileStatus: PlannerProfileStatus.COMPLETE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plannerUser || !plannerProfile) {
        throw new NotFoundException('Choose an active WOW Planner with a complete profile');
      }
      const plan = await planRepo.findOne({
        where: { id: dto.weddingPlanId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!plan) throw new NotFoundException('Wedding plan not found');
      if (plan.plannerUserId || plan.plannerBookingId) {
        throw new ConflictException('This wedding already has a planner or independent planner booking');
      }
      const existing = await assignmentRepo.findOne({ where: { weddingPlanId: plan.id, status: 'confirmed' } });
      if (existing) throw new ConflictException('This wedding already has an active WOW Planner assignment');
      if ((await this.availability(plannerProfile, dto.weddingDate, manager)) === 'Unavailable') {
        throw new ConflictException('The selected WOW Planner is unavailable on this date');
      }
      plan.plannerUserId = plannerUser.id;
      if (!plan.weddingDate) plan.weddingDate = dto.weddingDate;
      await planRepo.save(plan);
      const assignment = await assignmentRepo.save(assignmentRepo.create({
        plannerUserId: plannerUser.id,
        clientUserId: plan.userId,
        weddingPlanId: plan.id,
        weddingDate: dto.weddingDate,
        eventDates: [dto.weddingDate],
        eventIds: [],
        services: [],
        status: 'confirmed',
      }));
      await this.audit.record({
        action: AuditAction.WOW_PLANNER_ASSIGNED_BY_ADMIN,
        actor,
        resourceType: 'wow_planner_assignment',
        resourceId: assignment.id,
        metadata: { weddingPlanId: plan.id, newPlannerUserId: plannerUser.id, reason: dto.reason },
      }, manager);
      return { assignment, plannerName: plannerProfile.displayName ?? `${plannerProfile.firstName} ${plannerProfile.lastName}` };
    });
    await this.notifications.create(result.assignment.plannerUserId, NotificationType.WOW_PLANNER_ASSIGNED, {
      weddingPlanId: result.assignment.weddingPlanId,
      clientName: 'An assigned wedding',
    }).catch(() => undefined);
    await this.notifications.create(result.assignment.clientUserId, NotificationType.WOW_PLANNER_BOOKING_CONFIRMED, {
      weddingPlanId: result.assignment.weddingPlanId,
      plannerName: result.plannerName,
    }).catch(() => undefined);
    return result;
  }

  private async availability(
    profile: WowEmployeePlannerProfile,
    date?: string,
    manager = this.dataSource.manager,
  ): Promise<'Available' | 'Limited Availability' | 'Unavailable'> {
    const userRepo = manager.getRepository(User);
    if (!(await userRepo.exist({ where: { id: profile.userId, isActive: true } }))) return 'Unavailable';
    if (date) {
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
      if (
        profile.unavailableDates.includes(date) ||
        profile.leaveDates.includes(date) ||
        (profile.availableDates.length > 0 && !profile.availableDates.includes(date)) ||
        (profile.workingDays.length > 0 && !profile.workingDays.some((value) => value.toLowerCase() === weekday.toLowerCase()))
      ) return 'Unavailable';
    }
    const assignmentRepo = manager.getRepository(WowPlannerAssignment);
    if (!date) {
      const activeAssignments = await assignmentRepo.find({
        where: { plannerUserId: profile.userId, status: 'confirmed' },
        select: ['id'],
      });
      return activeAssignments.length > 0 ? 'Limited Availability' : 'Available';
    }
    const simultaneous = await assignmentRepo
      .createQueryBuilder('a')
      .where('a."plannerUserId" = :plannerUserId', { plannerUserId: profile.userId })
      .andWhere('a.status = :status', { status: 'confirmed' })
      .andWhere('(a."weddingDate" = :date OR a."eventDates" @> :eventDate)', {
        date,
        eventDate: JSON.stringify([date]),
      })
      .getCount();
    if (simultaneous >= profile.maxSimultaneousWeddings) return 'Unavailable';
    if (date && profile.maxSimultaneousWeddings > 1 && simultaneous === profile.maxSimultaneousWeddings - 1) {
      return 'Limited Availability';
    }
    return 'Available';
  }

  private completion(profile: WowEmployeePlannerProfile) {
    const sections = [
      Boolean(profile.displayName && profile.headline && profile.about && profile.languages.length),
      Boolean(profile.primaryCity && profile.serviceAreas.length && profile.specializations.length),
      profile.services.length > 0,
      profile.supportedEvents.length > 0,
      profile.workingDays.length > 0,
      profile.portfolio.length > 0,
      Boolean(profile.yearsExperience >= 0 && profile.weddingsHandled >= 0),
      true,
    ];
    const completion = Math.round((sections.filter(Boolean).length / sections.length) * 100);
    return {
      completion,
      status: completion === 100 ? PlannerProfileStatus.COMPLETE : PlannerProfileStatus.INCOMPLETE,
    };
  }

  private withCompletion(profile: WowEmployeePlannerProfile) {
    return { ...profile, ...this.completion(profile), plannerType: PlannerType.WOW_EMPLOYEE, serviceFee: 0 };
  }

  private clientProfileFields(profile: WowEmployeePlannerProfile) {
    return {
      userId: profile.userId,
      profilePhotoUrl: profile.profilePhotoUrl,
      displayName: profile.displayName,
      headline: profile.headline,
      about: profile.about,
      languages: profile.languages,
      primaryCity: profile.primaryCity,
      state: profile.state,
      serviceAreas: profile.serviceAreas,
      yearsExperience: profile.yearsExperience,
      weddingsHandled: profile.weddingsHandled,
      expertise: profile.expertise,
      specializations: profile.specializations,
      preferredWeddingTypes: profile.preferredWeddingTypes,
      supportedEvents: profile.supportedEvents,
      services: profile.services,
      workingDays: profile.workingDays,
      portfolio: profile.portfolio,
      achievements: profile.achievements,
      certifications: profile.certifications,
      experienceHighlights: profile.experienceHighlights,
      destinationWeddingsSupported: profile.destinationWeddingsSupported,
    };
  }

  private adminView(profile: WowEmployeePlannerProfile, user?: User, assignedWeddingCount = 0) {
    return {
      ...profile,
      officialEmail: user?.email ?? null,
      mobileNumber: user?.phone ?? null,
      accountStatus: user?.isActive ? 'ACTIVE' : 'INACTIVE',
      userCreatedAt: user?.createdAt ?? null,
      assignedWeddingCount,
    };
  }
}