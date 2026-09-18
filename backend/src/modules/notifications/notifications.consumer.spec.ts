import { NotificationsConsumer } from './notifications.consumer';
import { NotificationsService } from './notifications.service';
import { EventBus } from '../../platform/events/event-bus.service';
import { Profile } from '../users/entities/profile.entity';
import { NotificationType, UserRole } from '../../common/enums';

type Handler = (e: { payload: Record<string, unknown> }) => void;

/**
 * An interest sent to a profile an agency manages.
 *
 * The owner of the profile is told, as before. What this pins down is the
 * second notification, to the agency, and the three times it must not go: when
 * the agency is already the one told, when the agency sent the interest, and
 * when whoever manages the profile is not an agency.
 */
describe('NotificationsConsumer interest to a managed profile', () => {
  const handlers = new Map<string, Handler>();
  const bus = {
    on: (event: string) => ({ subscribe: (fn: Handler) => handlers.set(event, fn) }),
  } as unknown as EventBus;
  const notifications = { create: jest.fn(async () => ({})) };

  let profiles: Profile[];
  let stewardRole: UserRole;
  const profilesRepo = {
    find: jest.fn(async () => profiles),
    findOne: jest.fn(async () => null),
  };
  const usersRepo = { findOne: jest.fn(async () => ({ id: 'agent-1', role: stewardRole })) };
  const unused = { find: jest.fn(async () => []), findOne: jest.fn(async () => null) };

  const suitor = { id: 'from', userId: 'suitor-user', displayName: 'Vamsi', city: 'Vizag', photos: [] };
  const client = (over: Partial<Profile> = {}) =>
    ({
      id: 'to',
      userId: 'client-user',
      managedByUserId: 'agent-1',
      displayName: 'Harika',
      photos: [],
      ...over,
    }) as Profile;

  /** Fire the event and let the fire-and-forget handlers finish. */
  const send = async (sentByUserId = 'suitor-user') => {
    handlers.get('match.interest_sent')?.({
      payload: { interestId: 'i1', fromProfileId: 'from', toProfileId: 'to', sentByUserId },
    });
    await new Promise((resolve) => setImmediate(resolve));
  };
  const agentCalls = () =>
    notifications.create.mock.calls.filter(
      (call) => (call as unknown[])[1] === NotificationType.MATCH_INTEREST_FOR_CLIENT,
    ) as unknown as [string, NotificationType, Record<string, unknown>][];

  beforeEach(() => {
    jest.clearAllMocks();
    handlers.clear();
    stewardRole = UserRole.AGENT;
    const consumer = new NotificationsConsumer(
      bus,
      notifications as unknown as NotificationsService,
      profilesRepo as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      unused as never,
      usersRepo as never,
      unused as never,
    );
    consumer.onModuleInit();
  });

  it('tells the agency, naming the interested profile and its client', async () => {
    profiles = [suitor as unknown as Profile, client()];
    await send();

    // The client hears about it on their own account, as their own profile…
    expect(notifications.create).toHaveBeenCalledWith(
      'client-user',
      NotificationType.MATCH_INTEREST,
      expect.objectContaining({ forManagedProfile: false }),
    );
    // …and the agency running their matchmaking is told as well.
    const calls = agentCalls();
    expect(calls).toHaveLength(1);
    const [recipient, , payload] = calls[0];
    expect(recipient).toBe('agent-1');
    expect(payload).toMatchObject({
      counterpartProfileId: 'from',
      counterpartName: 'Vamsi',
      subjectProfileId: 'to',
      subjectName: 'Harika',
    });
  });

  it('does not tell the agency twice about a profile nobody has claimed', async () => {
    profiles = [suitor as unknown as Profile, client({ userId: null })];
    await send();

    expect(agentCalls()).toHaveLength(0);
    // The ordinary interest notification already went to the agency, marked as
    // being about its client so the line names Harika rather than "your profile".
    expect(notifications.create).toHaveBeenCalledWith(
      'agent-1',
      NotificationType.MATCH_INTEREST,
      expect.objectContaining({ forManagedProfile: true, subjectName: 'Harika' }),
    );
  });

  it('does not tell the agency about an interest it sent itself', async () => {
    profiles = [suitor as unknown as Profile, client()];
    await send('agent-1');
    expect(agentCalls()).toHaveLength(0);
  });

  it('is for agencies only', async () => {
    stewardRole = UserRole.FAMILY;
    profiles = [suitor as unknown as Profile, client()];
    await send();
    expect(agentCalls()).toHaveLength(0);
  });
});
