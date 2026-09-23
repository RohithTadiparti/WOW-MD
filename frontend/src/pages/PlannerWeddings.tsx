import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import { EmptyState, Loading } from '../components/ui/Feedback';

type Status = 'active' | 'upcoming' | 'completed';

interface Wedding {
  userId: string;
  name: string;
  bride: string | null;
  groom: string | null;
  weddingDate: string | null;
  derivedWeddingDate?: string | null;
  location: string | null;
  events: number;
  tasks: { total: number; done: number };
  bookings: { total: number; confirmed: number; pending: number };
  status: Status;
}

const STATUS: Record<Status, { label: string; tone: string }> = {
  active: { label: 'In progress', tone: 'pill-positive' },
  upcoming: { label: 'Upcoming', tone: 'pill-caution' },
  completed: { label: 'Completed', tone: 'pill-neutral' },
};

/**
 * The planner's project register. A wedding is the existing, paid planner
 * engagement, not a second client record: opening it leads to the same
 * ownership-checked workspace used by My Clients.
 */
export default function PlannerWeddings() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const requestedStatus = searchParams.get('status');
  const status: 'all' | Status = requestedStatus === 'active' || requestedStatus === 'upcoming' || requestedStatus === 'completed' ? requestedStatus : 'all';

  const { data, isPending, isError } = useQuery<{ clients: Wedding[] }>({
    queryKey: ['planner-clients'],
    queryFn: async () => (await api.get('/planner/clients')).data,
    retry: false,
  });

  const weddings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.clients ?? [])
      .filter((w) => status === 'all' || w.status === status)
      .filter((w) =>
        !needle ||
        [w.name, w.bride, w.groom, w.location, w.weddingDate]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        const left = a.weddingDate ?? a.derivedWeddingDate ?? '9999-12-31';
        const right = b.weddingDate ?? b.derivedWeddingDate ?? '9999-12-31';
        return left.localeCompare(right);
      });
  }, [data?.clients, query, status]);

  const count = (key: 'all' | Status) =>
    key === 'all' ? (data?.clients.length ?? 0) : (data?.clients ?? []).filter((w) => w.status === key).length;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="page-title">My Weddings</h1>
        <p className="page-subtitle">
          Every confirmed planning engagement in one place. Open a wedding to coordinate its events,
          vendors, tasks and shared plan.
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block min-w-0 flex-1 sm:max-w-md">
          <span className="sr-only">Search weddings</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} aria-hidden />
          <input className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, couple, date or city" />
        </label>
        <div className="flex flex-wrap gap-1" aria-label="Filter weddings by status">
          {(['all', 'active', 'upcoming', 'completed'] as const).map((key) => (
            <Link key={key} to={key === 'all' ? '/weddings' : `/weddings?status=${key}`} aria-current={status === key ? 'page' : undefined} className={status === key ? 'btn btn-sm' : 'btn-outline btn-sm'}>
              {key === 'all' ? 'All' : STATUS[key].label} ({count(key)})
            </Link>
          ))}
        </div>
      </div>

      {isPending ? <Loading rows={5} /> : isError ? (
        <p className="alert-critical">Your weddings could not be loaded. Please try again.</p>
      ) : weddings.length === 0 ? (
        <EmptyState title="No weddings found">
          Confirmed planner engagements will appear here after the first payment is recorded.
        </EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {weddings.map((wedding) => {
            const date = wedding.weddingDate ?? wedding.derivedWeddingDate ?? null;
            const progress = wedding.tasks.total ? Math.round((wedding.tasks.done / wedding.tasks.total) * 100) : 0;
            return (
              <Link key={wedding.userId} to={`/my-clients/${wedding.userId}`} className="card group transition-shadow hover:shadow-lifted">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-gray-900">{[wedding.bride, wedding.groom].filter(Boolean).join(' & ') || wedding.name}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{wedding.name}{wedding.location ? ` · ${wedding.location}` : ''}</p>
                  </div>
                  <span className={STATUS[wedding.status].tone}>{STATUS[wedding.status].label}</span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><dt className="text-gray-500">Wedding date</dt><dd className="font-medium text-gray-900">{formatDate(date, 'Not set')}</dd></div>
                  <div><dt className="text-gray-500">Events</dt><dd className="font-medium text-gray-900">{wedding.events}</dd></div>
                  <div><dt className="text-gray-500">Confirmed vendors</dt><dd className="font-medium text-gray-900">{wedding.bookings.confirmed}</dd></div>
                  <div><dt className="text-gray-500">Pending tasks</dt><dd className="font-medium text-gray-900">{Math.max(0, wedding.tasks.total - wedding.tasks.done)}</dd></div>
                </dl>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-gray-500"><span>Planning progress</span><span>{progress}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
