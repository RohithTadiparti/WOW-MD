import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import PhotoUploader from '../components/PhotoUploader';
import { useAuth } from '../store/auth';
import { EmptyState, Loading } from '../components/ui/Feedback';

interface EmployeeProfile {
  userId: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  profilePhotoUrl: string | null;
  displayName: string | null;
  headline: string | null;
  about: string | null;
  languages: string[];
  primaryCity: string | null;
  state: string | null;
  serviceAreas: string[];
  yearsExperience: number;
  weddingsHandled: number;
  expertise: string[];
  specializations: string[];
  preferredWeddingTypes: string[];
  supportedEvents: string[];
  services: string[];
  workingDays: string[];
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  availableDates: string[];
  unavailableDates: string[];
  leaveDates: string[];
  portfolio: string[];
  achievements: string[];
  certifications: string[];
  experienceHighlights: string[];
  destinationWeddingsSupported: boolean;
  maxSimultaneousWeddings: number;
  profileStatus: string;
  profileCompletion: number;
  completion: number;
}

const EVENTS = ['Engagement', 'Mehendi', 'Haldi', 'Sangeet', 'Wedding Ceremony', 'Reception', 'Cocktail Party', 'Pre-Wedding Event', 'Post-Wedding Event'];
const SERVICES = ['Full Wedding Planning', 'Event Planning', 'Vendor Coordination', 'Venue Coordination', 'Budget Coordination', 'Timeline Management', 'Guest Coordination', 'Accommodation Coordination', 'Transportation Coordination', 'Wedding-Day Coordination', 'Event-Day Coordination', 'Vendor Follow-up', 'Contract Coordination', 'Payment Coordination', 'Event Logistics'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEDDING_TYPES = ['Traditional Weddings', 'Modern Weddings', 'Luxury Weddings', 'Destination Weddings', 'Intimate Weddings', 'Large Weddings', 'Multi-day Weddings', 'Cultural Weddings', 'South Indian Weddings', 'North Indian Weddings'];

function commaList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export default function WowPlannerProfile() {
  const userId = useAuth((state) => state.user?.id);
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const query = useQuery<EmployeeProfile>({
    queryKey: ['wow-planner-profile'],
    queryFn: async () => (await api.get('/planner/profile')).data,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setProfile(query.data);
  }, [query.data]);

  function setField<K extends keyof EmployeeProfile>(key: K, value: EmployeeProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  function toggle(key: 'services' | 'supportedEvents' | 'workingDays' | 'preferredWeddingTypes', value: string) {
    if (!profile) return;
    setField(key, profile[key].includes(value) ? profile[key].filter((item) => item !== value) : [...profile[key], value]);
  }

  async function save() {
    if (!profile) return;
    setError('');
    setNotice('');
    try {
      const payload = {
        profilePhotoUrl: profile.profilePhotoUrl,
        displayName: profile.displayName,
        headline: profile.headline,
        about: profile.about,
        languages: profile.languages,
        primaryCity: profile.primaryCity,
        state: profile.state,
        serviceAreas: profile.serviceAreas,
        yearsExperience: Number(profile.yearsExperience),
        weddingsHandled: Number(profile.weddingsHandled),
        expertise: profile.expertise,
        specializations: profile.specializations,
        preferredWeddingTypes: profile.preferredWeddingTypes,
        supportedEvents: profile.supportedEvents,
        services: profile.services,
        workingDays: profile.workingDays,
        workingHoursStart: profile.workingHoursStart || undefined,
        workingHoursEnd: profile.workingHoursEnd || undefined,
        availableDates: profile.availableDates,
        unavailableDates: profile.unavailableDates,
        leaveDates: profile.leaveDates,
        portfolio: profile.portfolio,
        achievements: profile.achievements,
        certifications: profile.certifications,
        experienceHighlights: profile.experienceHighlights,
        destinationWeddingsSupported: profile.destinationWeddingsSupported,
        maxSimultaneousWeddings: Number(profile.maxSimultaneousWeddings),
      };
      const { data } = await api.patch('/planner/profile', payload);
      setProfile(data);
      setNotice(data.profileStatus === 'complete' ? 'Profile complete. Your client-facing profile is live.' : 'Profile saved. Complete the remaining sections to appear in WOW Planner discovery.');
      await queryClient.invalidateQueries({ queryKey: ['wow-planner-profile'] });
    } catch (err) {
      setError(apiMessage(err, 'Your profile could not be saved.'));
    }
  }

  if (query.isPending) return <Loading rows={6} />;
  if (query.isError || !profile) return <EmptyState title="WOW Planner profile unavailable">This profile editor is for WOW employee planner accounts.</EmptyState>;

  const completion = profile.completion ?? profile.profileCompletion;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Official WOW Team</p><h1 className="page-title">Complete Your WOW Planner Profile</h1><p className="page-subtitle">Clients can discover your profile when the required sections are complete.</p></div>
        {userId && <Link className="btn-outline" to="/planner/profile/preview">Preview as Client</Link>}
      </header>
      <section className="card" aria-label="Profile completion">
        <div className="flex items-center justify-between gap-3"><h2 className="section-title">Profile Completion</h2><span className="font-mono text-sm font-semibold">{completion}%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-sm bg-surface-sunken"><div className="h-full bg-brand transition-[width]" style={{ width: `${completion}%` }} /></div>
        <p className="mt-2 text-xs text-gray-500">{profile.profileStatus === 'complete' ? 'Visible to clients' : 'Incomplete'}</p>
      </section>
      {notice && <p className="alert-success">{notice}</p>}{error && <p className="alert-critical">{error}</p>}
      <section className="card space-y-4">
        <h2 className="section-title">Personal Information</h2>
        <div className="flex flex-wrap items-center gap-4">
          {profile.profilePhotoUrl && <img src={profile.profilePhotoUrl} alt="Planner profile" className="h-20 w-20 rounded-full object-cover" />}
          <PhotoUploader label="Upload profile photo" onUploaded={(url) => setField('profilePhotoUrl', url)} />
          <p className="text-sm text-gray-500">{profile.firstName} {profile.lastName} · Employee {profile.employeeId}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Display name" value={profile.displayName ?? ''} onChange={(value) => setField('displayName', value)} />
          <Field label="Professional headline" value={profile.headline ?? ''} onChange={(value) => setField('headline', value)} />
          <Field label="Languages, comma separated" value={profile.languages.join(', ')} onChange={(value) => setField('languages', commaList(value))} />
          <Field label="Primary city" value={profile.primaryCity ?? ''} onChange={(value) => setField('primaryCity', value)} />
          <Field label="State" value={profile.state ?? ''} onChange={(value) => setField('state', value)} />
          <Field label="Service areas, comma separated" value={profile.serviceAreas.join(', ')} onChange={(value) => setField('serviceAreas', commaList(value))} />
        </div>
        <label className="label">About me<textarea className="input mt-1 min-h-28" value={profile.about ?? ''} onChange={(e) => setField('about', e.target.value)} /></label>
      </section>
      <section className="card space-y-4">
        <h2 className="section-title">Professional Information</h2>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Years of experience" type="number" value={String(profile.yearsExperience)} onChange={(value) => setField('yearsExperience', Number(value))} /><Field label="Weddings handled" type="number" value={String(profile.weddingsHandled)} onChange={(value) => setField('weddingsHandled', Number(value))} /><Field label="Areas of expertise, comma separated" value={profile.expertise.join(', ')} onChange={(value) => setField('expertise', commaList(value))} /><Field label="Specializations, comma separated" value={profile.specializations.join(', ')} onChange={(value) => setField('specializations', commaList(value))} /></div>
        <ChoiceGroup title="Preferred wedding types" options={WEDDING_TYPES} selected={profile.preferredWeddingTypes} onToggle={(value) => toggle('preferredWeddingTypes', value)} />
      </section>
      <section className="card space-y-4"><h2 className="section-title">Services</h2><ChoiceGroup title="Planning services" options={SERVICES} selected={profile.services} onToggle={(value) => toggle('services', value)} /></section>
      <section className="card space-y-4"><h2 className="section-title">Events Supported</h2><ChoiceGroup title="Select the events you support" options={EVENTS} selected={profile.supportedEvents} onToggle={(value) => toggle('supportedEvents', value)} /></section>
      <section className="card space-y-4">
        <h2 className="section-title">Availability</h2>
        <ChoiceGroup title="Working days" options={DAYS} selected={profile.workingDays} onToggle={(value) => toggle('workingDays', value)} />
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Working hours start" type="time" value={profile.workingHoursStart ?? ''} onChange={(value) => setField('workingHoursStart', value)} /><Field label="Working hours end" type="time" value={profile.workingHoursEnd ?? ''} onChange={(value) => setField('workingHoursEnd', value)} /><Field label="Available dates, comma separated" value={profile.availableDates.join(', ')} onChange={(value) => setField('availableDates', commaList(value))} /><Field label="Unavailable dates, comma separated" value={profile.unavailableDates.join(', ')} onChange={(value) => setField('unavailableDates', commaList(value))} /><Field label="Leave dates, comma separated" value={profile.leaveDates.join(', ')} onChange={(value) => setField('leaveDates', commaList(value))} /><Field label="Maximum simultaneous weddings" type="number" value={String(profile.maxSimultaneousWeddings)} onChange={(value) => setField('maxSimultaneousWeddings', Number(value))} /></div>
      </section>
      <section className="card space-y-4">
        <h2 className="section-title">Portfolio & Highlights</h2>
        <PhotoUploader label="Add portfolio image" onUploaded={(url) => setField('portfolio', [...profile.portfolio, url])} />
        <div className="flex flex-wrap gap-2">{profile.portfolio.map((url) => <img key={url} src={url} alt="Portfolio work" className="h-24 w-28 rounded object-cover" />)}</div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Achievements, comma separated" value={profile.achievements.join(', ')} onChange={(value) => setField('achievements', commaList(value))} /><Field label="Certifications, comma separated" value={profile.certifications.join(', ')} onChange={(value) => setField('certifications', commaList(value))} /><Field label="Experience highlights, comma separated" value={profile.experienceHighlights.join(', ')} onChange={(value) => setField('experienceHighlights', commaList(value))} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.destinationWeddingsSupported} onChange={(e) => setField('destinationWeddingsSupported', e.target.checked)} />Destination weddings supported</label>
      </section>
      <div className="sticky bottom-3 flex justify-end"><button className="btn shadow-lifted" onClick={() => void save()}>Save Profile</button></div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="label">{label}<input className="input mt-1" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ChoiceGroup({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <fieldset><legend className="label mb-2">{title}</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{options.map((option) => <label key={option} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={selected.includes(option)} onChange={() => onToggle(option)} />{option}</label>)}</div></fieldset>;
}