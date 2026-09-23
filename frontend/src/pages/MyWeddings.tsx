import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MagnifyingGlass, UsersThree } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import { humanize } from '../lib/labels';
import { EmptyState, Loading } from '../components/ui/Feedback';
import { filterPlannerWeddings, PlannerWeddingStatus, PlannerWeddingRow } from '../lib/planner-weddings';

const TABS: { key: PlannerWeddingStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'planning', label: 'Planning' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_TONE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-800',
  upcoming: 'bg-amber-50 text-amber-800',
  planning: 'bg-sky-50 text-sky-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-50 text-red-700',
};

interface WeddingListResponse {
  clients: PlannerWeddingRow[];
  requests: unknown[];
}

export default function MyWeddings() {
  const [tab, setTab] = useState<PlannerWeddingStatus>('all');
  const [query, setQuery] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const { data, isLoading } = useQuery<WeddingListResponse>({
    queryKey: ['planner-clients'],
    queryFn: async () => (await api.get('/planner/clients')).data,
    retry: false,
  });

  const weddings = useMemo(() => {
    const list = (data?.clients ?? []).map((client) => ({
      id: client.planId,
      userId: client.userId,
      name: client.name,
      status: client.status,
      weddingDate: client.weddingDate ?? client.derivedWeddingDate ?? null,
      location: client.location ?? null,
      paymentStatus: client.paymentStatus ?? 'not_started',
      eventsCount: client.events,
      vendorsCount: client.bookings?.confirmed ?? 0,
      pendingTasks: client.tasks?.total ? client.tasks.total - (client.tasks.done ?? 0) : 0,
    }));

    return filterPlannerWeddings(list, tab, query).filter((w) => {
      if (!paymentStatus) return true;
      return (w.paymentStatus ?? '').toLowerCase() === paymentStatus.toLowerCase();
    });
  }, [data, paymentStatus, query, tab]);

  const paymentOptions = useMemo(
    () => [...new Set((data?.clients ?? []).map((w) => w.paymentStatus ?? 'in_escrow'))],
    [data],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">My Weddings</h1>
        <p className="page-subtitle">
          The weddings you are currently planning, with their events, vendors, tasks and payment status.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'btn btn-sm' : 'btn-outline btn-sm'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}

        <div className="relative ml-auto min-w-[12rem] flex-1 sm:max-w-xs">
          <MagnifyingGlass
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input w-full py-1.5 pl-8 text-sm"
            placeholder="Search customer or wedding"
          />
        </div>

        <select
          className="input w-40 py-1.5 text-sm"
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          aria-label="Filter by payment status"
        >
          <option value="">All payments</option>
          {paymentOptions.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Loading rows={4} />}

      {!isLoading && weddings.length === 0 && (
        <div className="card">
          <EmptyState icon={UsersThree} title="No weddings yet">
            Once a client accepts your quotation and the first payment is recorded, the wedding will appear here.
          </EmptyState>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {weddings.map((w) => (
          <Link
            key={w.id ?? w.userId}
            to={`/my-clients/${w.userId}`}
            className="card flex flex-col gap-3 transition hover:border-gray-300 hover:shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-gray-900">{w.name}</p>
                <p className="text-sm text-gray-500">{w.location ?? 'Location not set'}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_TONE[w.status ?? 'planning'] ?? STATUS_TONE.planning}`}>
                {w.status ?? 'planning'}
              </span>
            </div>

            <dl className="space-y-1 text-sm">
              <Row label="Wedding date" value={formatDate(w.weddingDate, 'Not set')} />
              <Row label="Events" value={String(w.eventsCount ?? 0)} />
              <Row label="Vendors" value={String(w.vendorsCount ?? 0)} />
              <Row label="Pending tasks" value={String(w.pendingTasks ?? 0)} />
              <Row label="Payment status" value={humanize(w.paymentStatus, 'Not started')} />
            </dl>

            <p className="text-sm font-medium text-brand-strong">Open wedding workspace</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="truncate text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
