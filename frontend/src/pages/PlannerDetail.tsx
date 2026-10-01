import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  Check,
  ClipboardText,
  MapPin,
  SealCheck,
  Star,
} from '@phosphor-icons/react';
import { api, apiMessage } from '../lib/api';
import { SocialLink, listingSocialLinks, socialLinkName } from '../lib/social-links';
import { SOCIAL_ICONS } from '../components/SocialLinks';
import { Permission, can } from '../lib/permissions';
import { useAuth } from '../store/auth';
import { EmptyState, Loading } from '../components/ui/Feedback';

/**
 * A wedding planner's full profile.
 *
 * "View Profile & Availability" on Hire a Planner used to open a fixed-position
 * dialog, which did not reliably appear, and which in any case had no address
 * to share or come back to. This is a page, like a vendor's (VendorDetail):
 * who the planner is, what they charge, what they have done, what couples said,
 * and when they are free, with the booking request beside the availability it
 * depends on.
 *
 * Only the business side of the listing is shown. The planner's phone, email
 * and address stay out: bookings, and the conversation about them, run through
 * the platform.
 */

interface PlannerPackage {
  name: string;
  price: number;
  includes?: string[];
}

interface Planner {
  id: string;
  agencyName: string;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  servesCities?: string[];
  packages?: PlannerPackage[];
  yearsExperience: number;
  website?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  socialLinks?: SocialLink[];
  portfolio?: string[];
  ratingAvg: number;
  ratingCount: number;
  createdAt?: string;
}

interface BookableSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  remaining: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  categories?: Record<string, number>;
  createdAt: string;
}

interface ReviewSummary {
  average: number;
  total: number;
  breakdown: Record<string, number>;
  categories: Record<string, number>;
}

const CATEGORY_LABEL: Record<string, string> = {
  planning: 'Planning & coordination',
  communication: 'Communication',
  serviceQuality: 'Service quality',
  professionalism: 'Professionalism',
  timeliness: 'Timeliness',
};

/** How far ahead the profile lists open dates. */
const AVAILABILITY_DAYS = 60;

const iso = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

/** A calendar date ("2026-11-14") as a local date, never shifted by UTC. */
function localDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const longDate = (value: string) =>
  localDate(value).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export default function PlannerDetail() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const permissions = useAuth((s) => s.user?.permissions ?? []);
  const canBook = can(permissions, Permission.BOOKING_CREATE);

  const { data: planner, isLoading } = useQuery({
    queryKey: ['planner', id],
    queryFn: async () => (await api.get(`/wedding-planners/${id}`)).data as Planner,
    enabled: Boolean(id),
    retry: false,
  });

  const { data: summary } = useQuery({
    queryKey: ['planner-review-summary', id],
    queryFn: async () =>
      (await api.get(`/wedding-planners/${id}/reviews/summary`)).data as ReviewSummary,
    enabled: Boolean(id),
    retry: false,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['planner-reviews', id],
    queryFn: async () => (await api.get(`/wedding-planners/${id}/reviews`)).data as Review[],
    enabled: Boolean(id),
    retry: false,
  });

  // The open dates for the next two months, on the profile itself rather than
  // only behind a "check" button.
  const today = useMemo(() => new Date(), []);
  const from = iso(today);
  const to = iso(new Date(today.getTime() + AVAILABILITY_DAYS * 86_400_000));
  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['planner-availability-window', id, from, to],
    queryFn: async () =>
      (
        await api.get(`/wedding-planners/${id}/availability/bookable`, { params: { from, to } })
      ).data as BookableSlot[],
    enabled: Boolean(id),
    retry: false,
  });

  if (isLoading) return <Loading rows={5} />;
  if (!planner) {
    return (
      <EmptyState title="Planner not found">
        This planner is not available. They may have been removed or are not yet approved.
      </EmptyState>
    );
  }

  return (
    <PlannerProfile
      planner={planner}
      summary={summary}
      reviews={reviews}
      slots={slots}
      loadingSlots={loadingSlots}
      canBook={canBook}
      initialDate={params.get('date') ?? ''}
    />
  );
}

function PlannerProfile({
  planner: p,
  summary,
  reviews,
  slots,
  loadingSlots,
  canBook,
  initialDate,
}: {
  planner: Planner;
  summary?: ReviewSummary;
  reviews: Review[];
  slots: BookableSlot[];
  loadingSlots: boolean;
  canBook: boolean;
  initialDate: string;
}) {
  const portfolio = p.portfolio ?? [];
  const packages = [...(p.packages ?? [])].sort((a, b) => Number(a.price) - Number(b.price));
  const fromPrice = packages.length ? Number(packages[0].price) : null;
  const rating = summary?.total ? summary.average : p.ratingAvg;
  const ratingCount = summary?.total ?? p.ratingCount;
  const place = [p.city, p.state].filter(Boolean).join(', ');
  // Only https links on a real host leave the page; anything else is not a link.
  const links = listingSocialLinks(p);

  const facts = [
    p.yearsExperience > 0 && {
      label: 'Experience',
      value: `${p.yearsExperience} yr${p.yearsExperience === 1 ? '' : 's'}`,
    },
    fromPrice !== null && { label: 'Packages from', value: rupees(fromPrice) },
    ratingCount > 0 && { label: `${ratingCount} review${ratingCount === 1 ? '' : 's'}`, value: `★ ${rating.toFixed(1)}` },
    (p.servesCities?.length ?? 0) > 0 && {
      label: 'Cities served',
      value: String(p.servesCities!.length),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="space-y-8">
      <Link to="/wedding-planners" className="text-sm text-gray-600 hover:text-brand">
        ← All planners
      </Link>

      {/* Masthead: the cover, who they are, and the figures families compare. */}
      <section className="overflow-hidden border border-gray-200 bg-surface">
        {/* A cover only when there is a photograph to put in it: an empty
            banner reads as something that failed to load. */}
        {portfolio[0] && (
          <div className="aspect-[16/7] bg-surface-sunken sm:aspect-[16/5]">
            <img src={portfolio[0]} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-5 px-5 pb-6 pt-6 sm:flex-row sm:items-center sm:px-8">
          {!portfolio[0] && (
            <div
              aria-hidden
              className="grid h-24 w-24 shrink-0 place-items-center border border-gold/60 bg-surface-sunken
                outline outline-1 outline-offset-4 outline-gold/30 sm:h-28 sm:w-28"
            >
              <span className="font-serif text-[2.5rem] leading-none tracking-[0.08em] text-brand">
                {initials(p.agencyName)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="eyebrow tracking-[0.22em]">Wedding planner</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="font-serif text-[2.25rem] font-normal leading-[1.1] text-brand sm:text-[2.75rem]">
                {p.agencyName}
              </h1>
              <span className="pill-brand">
                <SealCheck size={13} weight="fill" aria-hidden />
                Verified
              </span>
            </div>
            {place && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin size={15} weight="light" aria-hidden />
                {place}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-2 sm:px-8">

          {facts.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 border-t border-gray-200 sm:grid-cols-4">
              {facts.map((f, i) => (
                <div
                  key={f.label}
                  className={`py-4 pr-4 ${i % 2 === 1 ? 'pl-4 sm:pl-0' : ''} ${
                    i > 0 ? 'sm:border-l sm:border-gray-200 sm:pl-5' : ''
                  }`}
                >
                  <dt className="eyebrow tracking-[0.18em]">{f.label}</dt>
                  <dd className="mt-1 font-serif text-[1.625rem] leading-none text-gray-900">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          {p.bio && (
            <Section title="About">
              <p className="whitespace-pre-line text-[0.9375rem] leading-[1.8] text-gray-700">{p.bio}</p>
            </Section>
          )}

          {packages.length > 0 && (
            <Section title="Packages">
              <div className="grid gap-4 sm:grid-cols-2">
                {packages.map((k, i) => (
                  <article key={`${k.name}-${i}`} className="flex flex-col border border-gray-200 bg-surface p-5">
                    <h3 className="font-serif text-[1.375rem] leading-tight text-brand">{k.name}</h3>
                    <p className="mt-1 text-lg font-medium tabular-nums text-gray-900">{rupees(Number(k.price))}</p>
                    {(k.includes?.length ?? 0) > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t border-gray-200 pt-3 text-sm text-gray-700">
                        {k.includes!.map((item) => (
                          <li key={item} className="flex gap-2">
                            <Check size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </div>
            </Section>
          )}

          {(p.servesCities?.length ?? 0) > 0 && (
            <Section title="Cities served">
              <div className="flex flex-wrap gap-2">
                {p.servesCities!.map((c) => (
                  <span key={c} className="pill-neutral">
                    {c}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {portfolio.length > 0 && (
            <Section title="Portfolio">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {portfolio.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={`group block overflow-hidden bg-surface-sunken ${
                      i === 0 && portfolio.length > 2 ? 'col-span-2 row-span-2' : ''
                    }`}
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      className="aspect-square h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </a>
                ))}
              </div>
            </Section>
          )}

          <ReviewsSection summary={summary} reviews={reviews} />

          {links.length > 0 && (
            <Section title="Elsewhere">
              <div className="flex flex-wrap gap-3">
                {links.map((link) => {
                  const Icon = SOCIAL_ICONS[link.platform];
                  return (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline btn-sm"
                    >
                      <Icon size={15} aria-hidden />
                      {socialLinkName(link)}
                    </a>
                  );
                })}
              </div>
            </Section>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AvailabilityPanel
            plannerId={p.id}
            slots={slots}
            loadingSlots={loadingSlots}
            canBook={canBook}
            initialDate={initialDate}
          />
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-4">
        <h2 className="font-serif text-[1.75rem] font-normal leading-none text-brand">{title}</h2>
        <span aria-hidden className="h-px flex-1 bg-gray-200" />
      </div>
      {children}
    </section>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          weight={value >= n - 0.25 ? 'fill' : 'regular'}
          className={value >= n - 0.25 ? 'text-gold' : 'text-gray-300'}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ReviewsSection({ summary, reviews }: { summary?: ReviewSummary; reviews: Review[] }) {
  const total = summary?.total ?? reviews.length;
  if (total === 0) {
    return (
      <Section title="Reviews">
        <p className="text-sm text-gray-500">
          No reviews yet. Couples can review a planner once their booking is complete.
        </p>
      </Section>
    );
  }

  const categories = Object.entries(summary?.categories ?? {}).filter(([, v]) => v > 0);

  return (
    <Section title="Reviews">
      <div className="grid gap-6 border border-gray-200 bg-surface p-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:p-6">
        <div>
          <p className="font-serif text-[3.25rem] leading-none text-gray-900">
            {(summary?.average ?? 0).toFixed(1)}
          </p>
          <div className="mt-2">
            <Stars value={summary?.average ?? 0} size={16} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {total} review{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="space-y-1.5">
          {['5', '4', '3', '2', '1'].map((star) => {
            const count = summary?.breakdown?.[star] ?? 0;
            const share = total ? (count / total) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-8 tabular-nums text-gray-600">{star} ★</span>
                <span className="h-1.5 flex-1 bg-surface-sunken">
                  <span className="block h-full bg-gold" style={{ width: `${share}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>

        {categories.length > 0 && (
          <dl className="grid gap-x-6 gap-y-2 border-t border-gray-200 pt-4 sm:col-span-2 sm:grid-cols-2">
            {categories.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-gray-600">{CATEGORY_LABEL[key] ?? key}</dt>
                <dd className="flex items-center gap-2">
                  <Stars value={value} size={12} />
                  <span className="w-7 text-right tabular-nums text-gray-700">{value.toFixed(1)}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {reviews.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
          {reviews.map((r) => (
            <li key={r.id} className="py-4">
              <div className="flex items-center gap-3">
                <Stars value={r.rating} />
                <span className="text-xs text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {r.comment && (
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-gray-700">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/**
 * When the planner is free, and the request that depends on it.
 *
 * The next two months of open dates are listed and can be picked directly;
 * any other day can be checked. The planner's calendar only ever lists dates
 * that can actually be taken, so an empty answer means "not published", not
 * "fully booked" — which is why a request can still go out for such a day and
 * the planner confirms it.
 */
function AvailabilityPanel({
  plannerId,
  slots,
  loadingSlots,
  canBook,
  initialDate,
}: {
  plannerId: string;
  slots: BookableSlot[];
  loadingSlots: boolean;
  canBook: boolean;
  initialDate: string;
}) {
  const [date, setDate] = useState(initialDate);
  const [checkedDate, setCheckedDate] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState('');

  // One chip per open day, with the openings summed across its windows.
  const openDays = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of slots) {
      if (s.remaining > 0) byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.remaining);
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const months = useMemo(() => {
    const groups = new Map<string, [string, number][]>();
    for (const day of openDays) {
      const key = localDate(day[0]).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      groups.set(key, [...(groups.get(key) ?? []), day]);
    }
    return [...groups.entries()];
  }, [openDays]);

  const {
    data: daySlots,
    isFetching: checking,
    refetch,
  } = useQuery({
    queryKey: ['planner-availability', plannerId, date],
    enabled: false,
    queryFn: async () =>
      (
        await api.get(`/wedding-planners/${plannerId}/availability/bookable`, {
          params: { from: date, to: date },
        })
      ).data as BookableSlot[],
  });

  // A date picked from the list is known to be open; a typed one is checked.
  const listedOpenings = openDays.find(([d]) => d === checkedDate)?.[1] ?? 0;
  const checkedOpenings =
    listedOpenings ||
    (daySlots ?? []).filter((s) => s.date === checkedDate).reduce((n, s) => n + s.remaining, 0);

  async function check(value = date) {
    setError('');
    setRequested('');
    if (openDays.some(([d]) => d === value)) {
      setDate(value);
      setCheckedDate(value);
      return;
    }
    await refetch();
    setCheckedDate(value);
  }

  async function book() {
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { providerType: 'planner', providerId: plannerId };
      // An empty budget means "quote me": the planner prices the job, so a
      // number is never invented on the couple's behalf.
      const quoted = Number(amount);
      if (amount.trim() && Number.isFinite(quoted) && quoted > 0) payload.amount = quoted;
      if (checkedDate) payload.eventDate = checkedDate;
      await api.post('/bookings', payload);
      setRequested(checkedDate);
      setAmount('');
    } catch (err) {
      setError(apiMessage(err, 'Could not create the booking.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-gray-200 bg-surface">
      <div className="border-b border-gray-200 px-5 py-4">
        <p className="flex items-center gap-2 font-serif text-[1.5rem] leading-none text-brand">
          <CalendarCheck size={20} weight="light" aria-hidden />
          Availability
        </p>
        <p className="mt-1.5 text-xs text-gray-500">Open dates over the next two months</p>
      </div>

      <div className="max-h-[22rem] space-y-4 overflow-y-auto px-5 py-4">
        {loadingSlots ? (
          <p className="text-sm text-gray-500">Loading dates…</p>
        ) : months.length === 0 ? (
          <p className="text-sm text-gray-600">
            No open dates published for the next two months. Check a date below
            {canBook ? ' and send a request; the planner confirms it.' : '.'}
          </p>
        ) : (
          months.map(([month, days]) => (
            <div key={month}>
              <p className="eyebrow mb-2 tracking-[0.18em]">{month}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {days.map(([d, openings]) => {
                  const selected = d === checkedDate;
                  const day = localDate(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => check(d)}
                      aria-pressed={selected}
                      title={`${openings} opening${openings === 1 ? '' : 's'}`}
                      className={`flex flex-col items-center border px-1 py-1.5 leading-tight transition-colors ${
                        selected
                          ? 'border-brand bg-brand text-brand-fg'
                          : 'border-gray-200 text-gray-800 hover:border-brand hover:text-brand'
                      }`}
                    >
                      <span className="text-[0.625rem] uppercase tracking-[0.12em] opacity-75">
                        {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                      </span>
                      <span className="font-serif text-lg">{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-4 border-t border-gray-200 px-5 py-4">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-sm">
            <span className="block text-gray-600">Your wedding date</span>
            <input
              className="input mt-1 w-full"
              type="date"
              min={iso(new Date())}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setCheckedDate('');
              }}
            />
          </label>
          <button className="btn-outline" disabled={!date || checking} onClick={() => check()}>
            {checking ? 'Checking…' : 'Check'}
          </button>
        </div>

        {checkedDate && !checking && (
          <p
            className={`p-3 text-sm ${
              checkedOpenings > 0 ? 'bg-brand-light text-brand-dark' : 'bg-surface-sunken text-gray-600'
            }`}
          >
            {checkedOpenings > 0
              ? `Free on ${longDate(checkedDate)}, ${checkedOpenings} opening${
                  checkedOpenings === 1 ? '' : 's'
                } left.`
              : `No published opening on ${longDate(checkedDate)}.${
                  canBook ? ' You can still send a request and the planner will confirm.' : ''
                }`}
          </p>
        )}

        {requested ? (
          <div className="space-y-2 bg-brand-light p-3 text-sm text-brand-dark">
            <p className="flex items-start gap-2">
              <ClipboardText size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Booking requested{requested ? ` for ${longDate(requested)}` : ''}. The planner will
                confirm it, and you pay into escrow from Bookings.
              </span>
            </p>
            <Link to="/bookings" className="inline-block font-medium underline underline-offset-4">
              Go to Bookings
            </Link>
          </div>
        ) : canBook ? (
          <>
            <label className="block text-sm">
              <span className="text-gray-600">
                Your budget <span className="text-gray-400">(optional)</span>
              </span>
              <input
                className="input mt-1 w-full"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Leave blank to be quoted"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </label>

            {error && <p className="alert-critical">{error}</p>}

            <button className="btn w-full" disabled={busy || !checkedDate} onClick={book}>
              {busy ? 'Requesting…' : 'Request booking'}
            </button>
            {!checkedDate && (
              <p className="text-xs text-gray-500">
                Pick an open date or check yours first, so the request carries the day you need.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Sign in as an individual or agent to request a booking.
          </p>
        )}
      </div>
    </div>
  );
}
