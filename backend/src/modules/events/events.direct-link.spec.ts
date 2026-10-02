import { NotFoundException } from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { EventsService } from './events.service';
import { WeddingEvent } from './entities/event.entity';
import { Guest } from './entities/guest.entity';
import { EventInvite } from './entities/event-invite.entity';
import { WeddingInvitation } from './entities/wedding-invitation.entity';
import { EventStatus, RsvpStatus } from '../../common/enums';
import { AppConfigService } from '../../config/app-config.service';
import { MailService } from '../../platform/mail/mail.service';
import { ModerationService } from '../../platform/moderation/moderation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchmakingService } from '../matchmaking/matchmaking.service';

const HOST = 'host-1';

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, want]) => {
    const have = row[key];
    if (want instanceof FindOperator) {
      if (want.type === 'in') return (want.value as unknown[]).includes(have);
      if (want.type === 'not') return have !== want.value;
      throw new Error(`Unsupported operator ${want.type}`);
    }
    return have === want;
  });
}

function table<T extends { id?: string }>(rows: T[], prefix: string) {
  let next = rows.length;
  return {
    rows,
    create: jest.fn((init: Partial<T>) => ({ ...init }) as T),
    find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
      rows.filter((r) => matches(r as Record<string, unknown>, where)),
    ),
    findOne: jest.fn(
      async ({ where }: { where: Record<string, unknown> }) =>
        rows.find((r) => matches(r as Record<string, unknown>, where)) ?? null,
    ),
    save: jest.fn(async (input: T | T[]) => {
      for (const row of Array.isArray(input) ? input : [input]) {
        if (!row.id) row.id = `${prefix}-${++next}`;
        if (!rows.includes(row)) rows.push(row);
      }
      return input;
    }),
    update: jest.fn(async (where: Record<string, unknown>, patch: Partial<T>) => {
      for (const row of rows.filter((r) => matches(r as Record<string, unknown>, where))) {
        Object.assign(row, patch);
      }
    }),
  };
}

/**
 * The wedding's Direct Link: one link, the card and a three-field form, and a
 * reply that lands on the real guest list for the whole wedding.
 */
describe('EventsService wedding Direct Link', () => {
  function setup() {
    const events = table<WeddingEvent>(
      [
        { id: 'haldi', userId: HOST, name: 'Haldi', status: EventStatus.UPCOMING, eventDate: '2026-12-10' },
        { id: 'reception', userId: HOST, name: 'Reception', status: EventStatus.UPCOMING, eventDate: '2026-12-12' },
        { id: 'mehendi', userId: HOST, name: 'Mehendi', status: EventStatus.CANCELLED },
      ] as unknown as WeddingEvent[],
      'event',
    );
    const guests = table<Guest>(
      [
        {
          id: 'g1', userId: HOST, name: 'Ravi Kumar', contact: '', phone: '+919876543210',
          partySize: 2, relation: 'Family', rsvpStatus: RsvpStatus.ATTENDING, attendingCount: 2,
        } as unknown as Guest,
      ],
      'guest',
    );
    // The name lookup is a query builder in the service (case-insensitive).
    Object.assign(guests, {
      createQueryBuilder: () => {
        const params: Record<string, string> = {};
        const qb = {
          where: (_: string, p: Record<string, string>) => (Object.assign(params, p), qb),
          andWhere: (_: string, p: Record<string, string>) => (Object.assign(params, p), qb),
          getOne: async () =>
            guests.rows.find(
              (g) => g.userId === params.hostId && g.name.toLowerCase() === params.name.toLowerCase(),
            ) ?? null,
        };
        return qb;
      },
    });
    const invites = table<EventInvite>([], 'invite');
    const cards = table<WeddingInvitation>(
      [{ id: 'w1', userId: HOST, cardUrl: 'https://cdn.example.com/card.jpg', shareToken: null } as unknown as WeddingInvitation],
      'card',
    );
    const repo = (x: unknown) => x as never;
    const service = new EventsService(
      repo({}),
      repo(events),
      repo(guests),
      repo(invites),
      repo(cards),
      repo({ find: jest.fn(async () => []), findOne: jest.fn(async () => null) }),
      repo({}),
      repo({}),
      repo({}),
      repo({}),
      repo({}),
      repo({}),
      repo({}),
      {
        auth: { rsvpTokenTtlDays: 30 },
        mail: { appBaseUrl: 'https://test.example.com/' },
      } as unknown as AppConfigService,
      {} as MailService,
      {} as ModerationService,
      {} as NotificationsService,
      { fixedPartnerUserId: jest.fn(async () => null) } as unknown as MatchmakingService,
    );
    return { service, guests, invites, cards };
  }

  it('gives the same link every time, and a new one only when rotated', async () => {
    const { service } = setup();
    const first = await service.weddingDirectLink(HOST);
    expect(first.url).toMatch(/^https:\/\/test\.example\.com\/wedding-invitation\/[\w-]{20,}$/);
    expect(await service.weddingDirectLink(HOST)).toEqual(first);
    expect((await service.weddingInvitation(HOST)).directLink).toBe(first.url);

    const rotated = await service.weddingDirectLink(HOST, true);
    expect(rotated.url).not.toBe(first.url);
    const oldToken = first.url.split('/').pop()!;
    await expect(service.previewDirectLink(oldToken)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('shows the card and whose wedding it is, and nothing else', async () => {
    const { service } = setup();
    const token = (await service.weddingDirectLink(HOST)).url.split('/').pop()!;
    expect(await service.previewDirectLink(token)).toEqual({
      coupleNames: null,
      title: 'Our wedding',
      cardUrl: 'https://cdn.example.com/card.jpg',
      eventDate: '2026-12-10',
    });
  });

  it('adds a new guest to the list for every event still going ahead, pending', async () => {
    const { service, guests, invites } = setup();
    const token = (await service.weddingDirectLink(HOST)).url.split('/').pop()!;

    await service.registerByDirectLink(token, { name: 'Sita Devi', phone: '+919811111111', partySize: 3 });

    const sita = guests.rows.find((g) => g.name === 'Sita Devi')!;
    expect(sita).toMatchObject({ userId: HOST, phone: '+919811111111', partySize: 3, rsvpStatus: RsvpStatus.INVITED });
    expect(invites.rows.filter((i) => i.guestId === sita.id).map((i) => i.eventId).sort()).toEqual([
      'haldi',
      'reception',
    ]);
  });

  it('matches an existing guest by mobile or name instead of adding a duplicate', async () => {
    const { service, guests } = setup();
    const token = (await service.weddingDirectLink(HOST)).url.split('/').pop()!;

    await service.registerByDirectLink(token, { name: 'Ravi K', phone: '+919876543210' });
    await service.registerByDirectLink(token, { name: 'ravi kumar', partySize: 5 });

    expect(guests.rows).toHaveLength(1);
    // Their earlier reply and category stand; only the head count was updated.
    expect(guests.rows[0]).toMatchObject({
      name: 'Ravi Kumar', relation: 'Family', partySize: 5, rsvpStatus: RsvpStatus.ATTENDING, attendingCount: 2,
    });
  });

  it('refuses a revoked link but keeps the guests who used it', async () => {
    const { service, guests } = setup();
    const token = (await service.weddingDirectLink(HOST)).url.split('/').pop()!;
    await service.registerByDirectLink(token, { name: 'Sita Devi' });
    await service.revokeWeddingDirectLink(HOST);

    await expect(service.registerByDirectLink(token, { name: 'Late Guest' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(guests.rows.map((g) => g.name)).toEqual(['Ravi Kumar', 'Sita Devi']);
  });

  it('leaves the guests and their replies alone when the card is replaced or removed', async () => {
    const { service, guests } = setup();
    const before = JSON.stringify(guests.rows);
    await service.setWeddingInvitationCard(HOST, { cardUrl: 'https://cdn.example.com/new.jpg' });
    await service.removeWeddingInvitationCard(HOST);
    expect(JSON.stringify(guests.rows)).toBe(before);
  });
});
