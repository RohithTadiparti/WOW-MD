import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, apiMessage } from '../lib/api';
import { useAuth } from '../store/auth';
import { EmptyState, LoadingCards } from '../components/ui/Feedback';

interface Planner {
  userId: string;
  profilePhotoUrl: string | null;
  displayName: string | null;
  headline: string | null;
  about: string | null;
  languages: string[];
  primaryCity: string | null;
  serviceAreas: string[];
  yearsExperience: number;
  weddingsHandled: number;
  specializations: string[];
  supportedEvents: string[];
  services: string[];
  portfolio: string[];
  badge: string;
  teamLabel: string;
  serviceFee: number;
  availability: string;
}
interface WeddingPlan { id: string; weddingDate: string | null }
interface WeddingEvent { id: string; name: string; eventDate: string | null }

const SERVICE_OPTIONS = [
  'Venue Coordination', 'Vendor Coordination', 'Guest Coordination', 'Timeline Management',
  'Decoration Coordination', 'Catering Coordination', 'Transportation Coordination',
  'Budget Coordination', 'Accommodation Coordination', 'Wedding-Day Coordination',
];
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export default function WowPlannerDiscovery() {
  const { userId: routePlannerId } = useParams<{ userId?: string }>();
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [city, setCity] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [selected, setSelected] = useState<Planner | null>(null);
  const [date, setDate] = useState('');
  const [planId, setPlanId] = useState('');
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const { data: planners = [], isPending, isError } = useQuery<Planner[]>({
    queryKey: ['wow-planners', city, eventFilter],
    queryFn: async () => (await api.get('/wow-planners', { params: { ...(city ? { city } : {}), ...(eventFilter ? { event: eventFilter } : {}) } })).data,
  });
  const { data: plans = [] } = useQuery<WeddingPlan[]>({
    queryKey: ['client-wedding-plans'],
    queryFn: async () => (await api.get('/planner/plans')).data,
  });
  const { data: events = [] } = useQuery<WeddingEvent[]>({
    queryKey: ['client-wedding-events'],
    queryFn: async () => (await api.get('/events')).data,
  });

  useEffect(() => {
    if (!planId && plans.length) setPlanId(plans[0].id);
  }, [plans, planId]);
  useEffect(() => {
    if (routePlannerId) {
      const match = planners.find((planner) => planner.userId === routePlannerId);
      if (match) setSelected(match);
    }
  }, [routePlannerId, planners]);
  useEffect(() => {
    if (!selected || !date) { setAvailability(''); return; }
    let live = true;
    void api.get(`/wow-planners/${selected.userId}/availability`, { params: { date } })
      .then(({ data }) => { if (live) setAvailability(data.availability); })
      .catch(() => { if (live) setAvailability('Unavailable'); });
    return () => { live = false; };
  }, [selected, date]);

  const ownEvents = events.filter((event) => eventIds.includes(event.id));
  const plannerServices = selected?.services.length ? selected.services : SERVICE_OPTIONS;
  const dateMatches = plans.find((plan) => plan.id === planId)?.weddingDate;

  function toggleEvent(event: WeddingEvent) {
    setEventIds((current) => current.includes(event.id) ? current.filter((id) => id !== event.id) : [...current, event.id]);
    const relevant = event.name.toLowerCase().includes('reception')
      ? ['Decoration Coordination', 'Catering Coordination', 'Guest Coordination']
      : ['Venue Coordination', 'Vendor Coordination', 'Guest Coordination', 'Timeline Management', 'Transportation Coordination'];
    setServices((current) => [...new Set([...current, ...relevant.filter((service) => plannerServices.includes(service))])]);
  }

  async function hire() {
    if (!selected || !planId || !date || availability === 'Unavailable') return;
    setError(''); setNotice('');
    try {
      const { data } = await api.post(`/wow-planners/${selected.userId}/book`, {
        weddingPlanId: planId, weddingDate: date, eventIds, services,
      });
      setNotice(`WOW Planner Booking Confirmed. ${data.planner} is assigned to your wedding. Planner service fee: ${money(0)}.`);
      await queryClient.invalidateQueries({ queryKey: ['planner-clients'] });
      await queryClient.invalidateQueries({ queryKey: ['client-wedding-plans'] });
    } catch (err) {
      setError(apiMessage(err, 'This planner could not be hired. Check availability and try again.'));
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Official WOW Team</p><h1 className="page-title">WOW Wedding Planners</h1><p className="page-subtitle">Professional wedding coordination from the WOW team, free to clients.</p></div><Link className="btn-outline" to="/wedding-planners">Independent Wedding Planners</Link></header>
      {notice && <p className="alert-success">{notice}</p>}{error && <p className="alert-critical">{error}</p>}
      <div className="flex flex-wrap gap-3"><label className="label min-w-52 flex-1">City<input className="input mt-1" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Search city or service area" /></label><label className="label min-w-52 flex-1">Supported event<select className="input mt-1" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}><option value="">All events</option>{['Engagement', 'Mehendi', 'Haldi', 'Sangeet', 'Wedding Ceremony', 'Reception', 'Cocktail Party'].map((event) => <option key={event}>{event}</option>)}</select></label></div>
      {isPending ? <LoadingCards count={4} /> : isError ? <p className="alert-critical">WOW Planners could not be loaded.</p> : planners.length === 0 ? <EmptyState title="No WOW Planners available">Try a different city or event.</EmptyState> : (
        <div className="grid gap-3 lg:grid-cols-2">{planners.map((planner) => <article key={planner.userId} className="card flex flex-col gap-3">
          <div className="flex gap-3">{planner.profilePhotoUrl ? <img className="h-16 w-16 rounded-full object-cover" src={planner.profilePhotoUrl} alt="" /> : <div className="grid h-16 w-16 place-items-center rounded-full bg-brand/10 font-serif text-2xl text-brand">{planner.displayName?.slice(0, 1) ?? 'W'}</div>}<div className="min-w-0 flex-1"><p className="font-semibold text-gray-900">{planner.displayName}</p><span className="pill-positive">WOW Planner</span><p className="mt-1 text-xs font-medium text-brand">Official WOW Team</p></div><span className="pill-neutral">{planner.availability}</span></div>
          <p className="text-sm text-gray-700">{planner.headline}</p><p className="text-sm text-gray-600">{planner.yearsExperience} years · {planner.weddingsHandled} weddings</p><p className="text-sm text-gray-600">{planner.supportedEvents.slice(0, 4).join(' · ')}</p><p className="text-sm text-gray-600">{planner.services.slice(0, 3).join(' · ')}</p><p className="text-sm text-gray-600">{[planner.primaryCity, ...planner.serviceAreas].filter(Boolean).join(' · ')}</p><p className="text-sm font-semibold text-positive-fg">Free WOW Planning Service · {money(0)}</p>
          <div className="mt-auto flex flex-wrap gap-2"><button className="btn-outline btn-sm" onClick={() => { setSelected(planner); setDate(''); setAvailability(''); setEventIds([]); setServices([]); }}>View Profile / Check Availability</button></div>
        </article>)}</div>
      )}
      {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="WOW Planner profile"><div className="mx-auto max-w-3xl rounded-lg bg-surface p-5 shadow-lifted sm:p-7">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand">WOW Planner · Official WOW Team</p><h2 className="mt-1 font-serif text-3xl text-gray-900">{selected.displayName}</h2><p className="text-sm text-gray-600">{selected.headline}</p><p className="mt-2 text-sm font-semibold text-positive-fg">Free WOW Planning Service · {money(0)}</p></div><button className="btn-outline btn-sm" onClick={() => setSelected(null)} aria-label="Close">Close</button></div>
        <p className="mt-4 whitespace-pre-line text-sm text-gray-700">{selected.about}</p><p className="mt-2 text-sm text-gray-600">Experience: {selected.yearsExperience} years · Languages: {selected.languages.join(', ')}</p><p className="mt-2 text-sm text-gray-600">Specializations: {selected.specializations.join(', ')}</p><h3 className="mt-4 font-semibold">Services</h3><p className="text-sm text-gray-600">{selected.services.join(' · ')}</p><h3 className="mt-3 font-semibold">Events supported</h3><p className="text-sm text-gray-600">{selected.supportedEvents.join(' · ')}</p>
        {selected.portfolio.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto">{selected.portfolio.map((image) => <img key={image} src={image} alt="Planner portfolio" className="h-28 w-36 shrink-0 rounded object-cover" />)}</div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="label">Wedding workspace<select className="input mt-1" value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="">Select wedding</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.weddingDate ?? 'Date not set'}</option>)}</select>{plans.length === 0 && <Link to="/planner" className="mt-1 inline-block text-xs text-brand underline">Create your wedding plan</Link>}</label><label className="label">Wedding date<input className="input mt-1" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
        {date && <p className="mt-2 text-sm">Availability: <strong>{availability || 'Checking…'}</strong>{dateMatches && dateMatches !== date && <span className="ml-2 text-red-700">This differs from the selected wedding plan date.</span>}</p>}
        <fieldset className="mt-4"><legend className="label mb-2">What events do you need planning assistance for?</legend><div className="grid gap-2 sm:grid-cols-2">{events.map((event) => <label key={event.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={eventIds.includes(event.id)} onChange={() => toggleEvent(event)} />{event.name}{event.eventDate ? ` · ${event.eventDate}` : ''}</label>)}</div></fieldset>
        <fieldset className="mt-4"><legend className="label mb-2">Planning services</legend><div className="grid gap-2 sm:grid-cols-2">{plannerServices.map((service) => <label key={service} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={services.includes(service)} onChange={() => setServices((current) => current.includes(service) ? current.filter((value) => value !== service) : [...current, service])} />{service}</label>)}</div></fieldset>
        <div className="mt-5 rounded border border-gray-200 p-3 text-sm"><p>Planner: {selected.displayName}</p><p>Wedding date: {date || 'Select a date'}</p><p>Events: {ownEvents.map((event) => event.name).join(', ') || 'None selected'}</p><p>Planner Service Fee: {money(0)}</p><p className="font-semibold">Total Planner Fee: {money(0)}</p></div>
        <div className="mt-4 flex flex-wrap justify-end gap-2"><button className="btn-outline" onClick={() => setSelected(null)}>Cancel</button><button className="btn" disabled={!user || !planId || !date || !availability || availability === 'Unavailable' || eventIds.length === 0 || services.length === 0 || (Boolean(dateMatches) && dateMatches !== date)} onClick={() => void hire()}>Hire WOW Planner</button></div>
      </div></div>}
    </div>
  );
}