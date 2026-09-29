import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { EmptyState, Loading } from '../components/ui/Feedback';

interface Preview {
  profilePhotoUrl: string | null;
  displayName: string | null;
  headline: string | null;
  about: string | null;
  yearsExperience: number;
  weddingsHandled: number;
  languages: string[];
  specializations: string[];
  services: string[];
  supportedEvents: string[];
  primaryCity: string | null;
  serviceAreas: string[];
  portfolio: string[];
  achievements: string[];
  certifications: string[];
  experienceHighlights: string[];
}

export default function WowPlannerPreview() {
  const { data, isPending, isError } = useQuery<Preview>({
    queryKey: ['wow-planner-profile-preview'],
    queryFn: async () => (await api.get('/planner/profile')).data,
    retry: false,
  });
  if (isPending) return <Loading rows={4} />;
  if (isError || !data) return <EmptyState title="Profile preview unavailable">Complete your employee planner profile to review your client-facing information.</EmptyState>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header><p className="text-xs font-semibold uppercase tracking-wide text-brand">Preview as Client</p><h1 className="page-title">WOW Planner</h1><p className="page-subtitle">This is the profile clients see in WOW Planner discovery.</p></header>
      <section className="card">
        <div className="flex flex-wrap items-center gap-4">{data.profilePhotoUrl ? <img src={data.profilePhotoUrl} alt="" className="h-24 w-24 rounded-full object-cover" /> : null}<div><h2 className="font-serif text-3xl text-gray-900">{data.displayName}</h2><span className="pill-positive">WOW Planner</span><p className="mt-1 text-sm font-medium text-brand">Official WOW Team</p><p className="text-sm text-gray-600">{data.headline}</p></div></div>
        <p className="mt-4 text-sm font-semibold text-positive-fg">Free WOW Planning Service · ₹0</p>
        <p className="mt-4 whitespace-pre-line text-sm text-gray-700">{data.about}</p>
        <p className="mt-3 text-sm text-gray-600">{data.yearsExperience} years of experience · {data.weddingsHandled} weddings handled</p>
        <p className="mt-1 text-sm text-gray-600">Languages: {data.languages.join(', ')}</p>
        <p className="mt-1 text-sm text-gray-600">Specializations: {data.specializations.join(', ')}</p>
        <h3 className="mt-4 font-semibold">Services</h3><p className="text-sm text-gray-600">{data.services.join(' · ')}</p>
        <h3 className="mt-3 font-semibold">Events supported</h3><p className="text-sm text-gray-600">{data.supportedEvents.join(' · ')}</p>
        <p className="mt-3 text-sm text-gray-600">Service area: {[data.primaryCity, ...data.serviceAreas].filter(Boolean).join(' · ')}</p>
        {data.portfolio.length > 0 && <div className="mt-4 flex gap-2 overflow-x-auto">{data.portfolio.map((image) => <img key={image} src={image} alt="Portfolio work" className="h-28 w-36 shrink-0 rounded object-cover" />)}</div>}
        {data.achievements.length > 0 && <p className="mt-3 text-sm text-gray-600">Achievements: {data.achievements.join(' · ')}</p>}
        {data.certifications.length > 0 && <p className="mt-1 text-sm text-gray-600">Certifications: {data.certifications.join(' · ')}</p>}
        {data.experienceHighlights.length > 0 && <p className="mt-1 text-sm text-gray-600">Experience highlights: {data.experienceHighlights.join(' · ')}</p>}
      </section>
      <Link to="/planner/profile" className="btn-outline inline-flex">Back to profile</Link>
    </div>
  );
}