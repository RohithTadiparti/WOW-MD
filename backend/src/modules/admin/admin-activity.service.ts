import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ActivityQueryDto } from './dto/console.dto';
import { AuditEvent } from '../../platform/audit/entities/audit-event.entity';

/** One line in the activity feed. Deliberately uniform across every source. */
export interface ActivityItem {
  id: string;
  at: Date;
  /** What happened, in the platform's own vocabulary. */
  kind: string;
  /** A sentence somebody can read without opening anything. */
  summary: string;
  resourceType: string;
  resourceId: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  metadata: Record<string, unknown>;
}

/**
 * The platform activity feed on the admin console.
 *
 * Split out of AdminConsoleService, which had grown past 1,600 lines; the
 * methods moved unchanged.
 */
@Injectable()
export class AdminActivityService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuditEvent) private readonly auditEvents: Repository<AuditEvent>,
  ) {}

  /**
   * What has been happening, across the whole platform.
   *
   * Distinct from the audit trail, which records *privileged* actions — who
   * approved what, who moved money. This is the ordinary life of the platform:
   * people signing up, listings being submitted, bookings arriving, complaints
   * being raised. An administrator opening the console wants to know whether
   * anything is happening at all before they want to know who did what to whom.
   *
   * Assembled by taking the newest few rows from each source and merging them
   * rather than by a SQL UNION. The union would be one query and several
   * hundred lines of hand-written column aliasing across tables that share
   * almost no shape; this is six small indexed reads on `createdAt` and a sort
   * of at most a few dozen rows. When the feed grows a source, it grows by four
   * lines here instead of by a rewrite.
   */
  async activity(q: ActivityQueryDto): Promise<ActivityItem[]> {
    const take = q.limit;

    /*
     * Recent Activity is an audit view, not a UI-created event stream. This
     * gives every row its immutable action id, authenticated actor, affected
     * record and before/after metadata — the facts needed for a meaningful
     * drill-down instead of only a friendly sentence.
     */
    let auditRange: ReturnType<typeof Between<Date>> | undefined;
    if (q.from || q.to) {
      const fromDate = q.from;
      const toDate = q.to;
      const to = new Date(toDate ?? Date.now());
      to.setHours(23, 59, 59, 999);
      auditRange = Between(new Date(fromDate ?? 0), to);
    }
    const auditRows = await this.auditEvents.find({
      where: auditRange ? { createdAt: auditRange } : {},
      order: { createdAt: 'DESC' },
      take,
    });
    const actorIds = auditRows
      .map((row) => row.actorUserId)
      .filter((id): id is string => Boolean(id));
    const actors = actorIds.length
      ? await this.users.find({ where: { id: In([...new Set(actorIds)]) }, select: ['id', 'email', 'phone'] })
      : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const actionText = (action: string) => action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return auditRows.map((row) => ({
      id: row.id,
      at: row.createdAt,
      kind: row.action,
      summary: actionText(row.action),
      resourceType: row.resourceType ?? 'platform',
      resourceId: row.resourceId ?? '',
      actorUserId: row.actorUserId,
      actorName: row.actorUserId ? (actorById.get(row.actorUserId)?.email ?? actorById.get(row.actorUserId)?.phone ?? null) : null,
      actorRole: row.actorRole,
      metadata: row.metadata ?? {},
    }));

  }
}
