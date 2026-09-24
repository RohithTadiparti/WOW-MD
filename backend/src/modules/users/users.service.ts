import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { ProfileClaimStatus, UserRole } from '../../common/enums';
import { User } from '../auth/entities/user.entity';
import { ProfileDetails } from '../profile-details/entities/profile-details.entity';
import { AgentProfile } from '../agents/entities/agent-profile.entity';

/**
 * The account holder's own profile.
 *
 * This used to keep a Redis copy of the profile row, and that cache is the
 * single most-reported defect on this platform: *values in the database not
 * appearing in the UI*.
 *
 * The mechanism was simple and completely invisible from any one file.
 * `getByUserId` cached the row for five minutes, and exactly one place in the
 * codebase — `upsert`, immediately below — knew to clear it. Thirteen other
 * files write to `profiles`: identity submission, Aadhaar verification, the
 * match lifecycle, agency stewardship, invitations, claim requests, consent,
 * sharing, officer allocation and the scheduled jobs. Every one of them left a
 * stale copy behind. So a person could verify their identity, watch the
 * identity endpoint report it confirmed, reload the page, and be told they were
 * unverified — for five minutes, with no way to tell why.
 *
 * The cache is gone rather than patched. What it saved was one indexed lookup
 * by `userId` on page load; what it cost was correctness across thirteen
 * writers, and any fix that leaves the cache in place is a fourteenth writer
 * away from the same bug. If profile reads ever genuinely become a bottleneck,
 * the version to write is one that cannot be forgotten — a TypeORM entity
 * subscriber on `Profile` — not another `del` at another call site.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProfileDetails) private readonly details: Repository<ProfileDetails>,
    @InjectRepository(AgentProfile) private readonly agencies: Repository<AgentProfile>,
  ) {}

  async upsert(userId: string, dto: CreateProfileDto | UpdateProfileDto): Promise<Profile> {
    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profiles.create({
        userId,
        ...dto,
        // Self-managed from the outset; stewardship is set only by the agent
        // paths in ManagedProfilesService.
        claimStatus: ProfileClaimStatus.SELF,
      } as Partial<Profile>);
    } else {
      Object.assign(profile, dto);
    }
    profile.profileCompleted = this.isComplete(profile);
    return this.profiles.save(profile);
  }

  async getByUserId(userId: string): Promise<Profile> {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async resolveAccountName(userId: string, profile: Profile): Promise<string | null> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) return profile.displayName;

    if (user.role === UserRole.FAMILY) {
      const details = await this.details.findOne({ where: { profileId: profile.id } });
      const rel = (profile.stewardRelation ?? '').trim().toLowerCase();

      if (rel === 'father' && details?.father && typeof details.father === 'object' && (details.father as { name: string }).name) {
        return (details.father as { name: string }).name;
      }
      if (rel === 'mother' && details?.mother && typeof details.mother === 'object' && (details.mother as { name: string }).name) {
        return (details.mother as { name: string }).name;
      }
      if (rel === 'guardian' && details && 'guardian' in details && details.guardian && typeof details.guardian === 'object' && (details.guardian as { name: string }).name) {
        return (details.guardian as { name: string }).name;
      }

      if (!profile.managingFor && profile.displayName) {
        return profile.displayName;
      }
      if (user.email) {
        return user.email.split('@')[0];
      }
      return profile.displayName;
    }

    if (user.role === UserRole.AGENT) {
      const agency = await this.agencies.findOne({ where: { ownerUserId: user.id } });
      if (agency?.agencyName) return agency.agencyName;
    }

    return profile.displayName;
  }

  private isComplete(p: Profile): boolean {
    return Boolean(p.displayName && p.gender && p.dateOfBirth && p.city);
  }
}
