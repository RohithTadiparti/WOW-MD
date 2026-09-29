import { describe, expect, it } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { synchronizeBookings } from './booking-queries';

describe('booking cache synchronization', () => {
  it('refreshes active lists and counts and invalidates inactive status pages', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    let cancelled = false;
    const list = new QueryObserver(client, { queryKey: ['bookings', 'confirmed', 1], queryFn: async () => cancelled ? [] : [{ id: 'one', status: 'confirmed' }] });
    const counts = new QueryObserver(client, { queryKey: ['my-booking-counts'], queryFn: async () => ({ all: 1, confirmed: cancelled ? 0 : 1, cancelled: cancelled ? 1 : 0 }) });
    const offList = list.subscribe(() => undefined);
    const offCounts = counts.subscribe(() => undefined);
    await Promise.all([list.refetch(), counts.refetch()]);
    client.setQueryData(['bookings', 'cancelled', 2], []);
    client.setQueryData(['incoming-counts'], { cancelled: 0 });
    client.setQueryData(['unrelated'], 'keep');
    cancelled = true; // The server has committed the cancellation before synchronization.
    await synchronizeBookings(client);
    expect(client.getQueryData(['bookings', 'confirmed', 1])).toEqual([]);
    expect(client.getQueryData(['my-booking-counts'])).toEqual({ all: 1, confirmed: 0, cancelled: 1 });
    expect(client.getQueryState(['bookings', 'cancelled', 2])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['incoming-counts'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['unrelated'])?.isInvalidated).toBe(false);
    offList(); offCounts(); client.clear();
  });
  it('discards a list request started before the mutation', async () => {
    const client = new QueryClient();
    let finish!: (value: string[]) => void;
    const oldRequest = client.fetchQuery({ queryKey: ['bookings'], queryFn: () => new Promise<string[]>(resolve => { finish = resolve; }) }).catch(() => undefined);
    await synchronizeBookings(client);
    client.setQueryData(['bookings'], ['cancelled']);
    finish(['confirmed']);
    await oldRequest;
    expect(client.getQueryData(['bookings'])).toEqual(['cancelled']);
    client.clear();
  });
});
