import type { QueryClient } from '@tanstack/react-query';

const BOOKING_QUERIES = new Set([
  'bookings', 'my-booking-counts', 'incoming-bookings', 'incoming-counts',
  'incoming-bookings-count', 'dash-bookings', 'planner-bookings-placed',
  'quotations', 'milestones', 'booking-quotations', 'booking-milestones',
  'booking-summary', 'booking-history', 'booking-addons', 'incoming-addons',
  'booking-chat-state', 'admin-bookings', 'admin-booking-detail', 'admin-report',
  'earnings', 'availability-slots', 'availability-summary', 'availability-calendar',
  'availability-bucket', 'client-detail',
]);

/** Await after a committed mutation. Inactive tabs are marked stale too. */
export async function synchronizeBookings(client: QueryClient): Promise<void> {
  const filters = { predicate: (query: { queryKey: readonly unknown[] }) =>
    BOOKING_QUERIES.has(String(query.queryKey[0])) };
  // A request started before the mutation must not put pre-mutation data back.
  await client.cancelQueries(filters);
  await client.invalidateQueries(filters);
}
