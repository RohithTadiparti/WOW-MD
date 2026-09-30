export type PlannerWeddingStatus = 'all' | 'planning' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface PlannerWeddingRow {
  id?: string;
  /** The wedding project id returned by the planner client API. */
  planId?: string;
  userId?: string;
  name?: string | null;
  status?: string | null;
  weddingDate?: string | null;
  derivedWeddingDate?: string | null;
  location?: string | null;
  paymentStatus?: string | null;
  eventsCount?: number;
  vendorsCount?: number;
  pendingTasks?: number;
  /** API fields before the row is normalised for the My Weddings card. */
  events?: number;
  bookings?: { confirmed?: number; total?: number; pending?: number };
  tasks?: { total?: number; done?: number };
}

export function filterPlannerWeddings(
  rows: PlannerWeddingRow[],
  tab: PlannerWeddingStatus,
  query = '',
): PlannerWeddingRow[] {
  const needle = query.trim().toLowerCase();

  return rows.filter((w) => {
    const status = (w.status ?? '').toLowerCase();
    const withinTab =
      tab === 'all' ||
      (tab === 'planning' && (status === 'upcoming' || status === 'active' || status === 'planning')) ||
      (tab === 'upcoming' && status === 'upcoming') ||
      (tab === 'in_progress' && status === 'active') ||
      (tab === 'completed' && status === 'completed') ||
      (tab === 'cancelled' && status === 'cancelled');

    if (!withinTab) return false;
    if (!needle) return true;

    const haystack = [w.name, w.location, w.id, w.userId, w.paymentStatus]
      .filter((v): v is string => Boolean(v))
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
}
