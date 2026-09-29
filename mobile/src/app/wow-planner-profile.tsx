import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { CheckSquare } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { PhotoPicker } from '@/components/uploader';
import { Alert, Body, Button, Caption, Card, Field, Loading, PageSubtitle, PageTitle, Screen, SectionTitle } from '@/components/ui';
import { space } from '@/theme';

interface PlannerProfile {
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
  completion: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EVENTS = ['Engagement', 'Mehendi', 'Haldi', 'Sangeet', 'Wedding Ceremony', 'Reception', 'Cocktail Party', 'Pre-Wedding Event', 'Post-Wedding Event'];
const SERVICES = ['Full Wedding Planning', 'Event Planning', 'Vendor Coordination', 'Venue Coordination', 'Budget Coordination', 'Timeline Management', 'Guest Coordination', 'Accommodation Coordination', 'Transportation Coordination', 'Wedding-Day Coordination', 'Event-Day Coordination', 'Vendor Follow-up', 'Contract Coordination', 'Payment Coordination', 'Event Logistics'];
const WEDDING_TYPES = ['Traditional Weddings', 'Modern Weddings', 'Luxury Weddings', 'Destination Weddings', 'Intimate Weddings', 'Large Weddings', 'Multi-day Weddings', 'Cultural Weddings', 'South Indian Weddings', 'North Indian Weddings'];
const csv = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean);

export default function WowPlannerProfileScreen() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<PlannerProfile | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const query = useQuery<PlannerProfile>({
    queryKey: ['wow-planner-profile'],
    queryFn: async () => (await api.get('/planner/profile')).data,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setProfile(query.data);
  }, [query.data]);

  function update<K extends keyof PlannerProfile>(key: K, value: PlannerProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  function toggle(key: 'workingDays' | 'supportedEvents' | 'services' | 'preferredWeddingTypes', value: string) {
    if (!profile) return;
    update(key, profile[key].includes(value) ? profile[key].filter((item) => item !== value) : [...profile[key], value]);
  }

  async function save() {
    if (!profile) return;
    setError(''); setNotice('');
    try {
      const payload = {
        profilePhotoUrl: profile.profilePhotoUrl ?? undefined,
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
      setNotice(data.profileStatus === 'complete' ? 'Profile complete. Clients can now discover you.' : 'Saved. Finish the remaining sections to appear in WOW Planner discovery.');
      await queryClient.invalidateQueries({ queryKey: ['wow-planner-profile'] });
    } catch (cause) {
      setError(apiMessage(cause, 'Your profile could not be saved.'));
    }
  }

  if (query.isPending) return <Screen><Loading rows={5} /></Screen>;
  if (query.isError || !profile) return <Screen><Alert tone="critical">This profile is available only to WOW Employee Planners.</Alert></Screen>;

  return (
    <Screen>
      <PageTitle>Complete Your WOW Planner Profile</PageTitle>
      <PageSubtitle>Official WOW Team · {profile.firstName} {profile.lastName} · Employee {profile.employeeId}</PageSubtitle>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><SectionTitle>Profile completion</SectionTitle><Body>{profile.completion}%</Body></View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#E8E7E1', overflow: 'hidden' }}><View style={{ height: 8, width: `${profile.completion}%`, backgroundColor: '#8B6A2B' }} /></View>
        <Caption tone="faint">{profile.profileStatus === 'complete' ? 'Visible to clients' : 'Complete required client-facing information to appear in discovery.'}</Caption>
      </Card>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}{error ? <Alert tone="critical">{error}</Alert> : null}
      <Card>
        <SectionTitle>Personal Information</SectionTitle>
        {profile.profilePhotoUrl ? <Image source={{ uri: profile.profilePhotoUrl }} style={{ width: 88, height: 88, borderRadius: 44 }} contentFit="cover" /> : null}
        <PhotoPicker label="Upload profile photo" onUploaded={(url) => update('profilePhotoUrl', url)} />
        <Field label="Display name" value={profile.displayName ?? ''} onChangeText={(value) => update('displayName', value)} />
        <Field label="Professional headline" value={profile.headline ?? ''} onChangeText={(value) => update('headline', value)} />
        <Field label="About me" value={profile.about ?? ''} onChangeText={(value) => update('about', value)} multiline />
        <Field label="Languages, comma separated" value={profile.languages.join(', ')} onChangeText={(value) => update('languages', csv(value))} />
        <Field label="Primary city" value={profile.primaryCity ?? ''} onChangeText={(value) => update('primaryCity', value)} />
        <Field label="State" value={profile.state ?? ''} onChangeText={(value) => update('state', value)} />
        <Field label="Service areas, comma separated" value={profile.serviceAreas.join(', ')} onChangeText={(value) => update('serviceAreas', csv(value))} />
      </Card>
      <Card>
        <SectionTitle>Professional Information</SectionTitle>
        <Field label="Years of experience" keyboardType="number-pad" value={String(profile.yearsExperience)} onChangeText={(value) => update('yearsExperience', Number(value) || 0)} />
        <Field label="Weddings handled" keyboardType="number-pad" value={String(profile.weddingsHandled)} onChangeText={(value) => update('weddingsHandled', Number(value) || 0)} />
        <Field label="Areas of expertise, comma separated" value={profile.expertise.join(', ')} onChangeText={(value) => update('expertise', csv(value))} />
        <Field label="Specializations, comma separated" value={profile.specializations.join(', ')} onChangeText={(value) => update('specializations', csv(value))} />
        <ChoiceGroup title="Preferred wedding types" options={WEDDING_TYPES} selected={profile.preferredWeddingTypes} onToggle={(value) => toggle('preferredWeddingTypes', value)} />
      </Card>
      <Card><SectionTitle>Services</SectionTitle><ChoiceGroup title="Planning services" options={SERVICES} selected={profile.services} onToggle={(value) => toggle('services', value)} /></Card>
      <Card><SectionTitle>Events Supported</SectionTitle><ChoiceGroup title="Supported events" options={EVENTS} selected={profile.supportedEvents} onToggle={(value) => toggle('supportedEvents', value)} /></Card>
      <Card>
        <SectionTitle>Availability</SectionTitle>
        <ChoiceGroup title="Working days" options={DAYS} selected={profile.workingDays} onToggle={(value) => toggle('workingDays', value)} />
        <View style={{ flexDirection: 'row', gap: space(2) }}><View style={{ flex: 1 }}><Field label="Start time" value={profile.workingHoursStart ?? ''} onChangeText={(value) => update('workingHoursStart', value)} placeholder="09:00" /></View><View style={{ flex: 1 }}><Field label="End time" value={profile.workingHoursEnd ?? ''} onChangeText={(value) => update('workingHoursEnd', value)} placeholder="18:00" /></View></View>
        <Field label="Available dates (YYYY-MM-DD), comma separated" value={profile.availableDates.join(', ')} onChangeText={(value) => update('availableDates', csv(value))} />
        <Field label="Unavailable dates, comma separated" value={profile.unavailableDates.join(', ')} onChangeText={(value) => update('unavailableDates', csv(value))} />
        <Field label="Leave dates, comma separated" value={profile.leaveDates.join(', ')} onChangeText={(value) => update('leaveDates', csv(value))} />
        <Field label="Maximum simultaneous weddings" keyboardType="number-pad" value={String(profile.maxSimultaneousWeddings)} onChangeText={(value) => update('maxSimultaneousWeddings', Number(value) || 1)} />
      </Card>
      <Card>
        <SectionTitle>Portfolio & Highlights</SectionTitle>
        <PhotoPicker label="Add portfolio image" onUploaded={(url) => { update('portfolio', [...profile.portfolio, url]); if (!profile.profilePhotoUrl) update('profilePhotoUrl', url); }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{profile.portfolio.map((url) => <Image key={url} source={{ uri: url }} style={{ width: 96, height: 84, borderRadius: 6 }} contentFit="cover" />)}</View>
        <Field label="Achievements, comma separated" value={profile.achievements.join(', ')} onChangeText={(value) => update('achievements', csv(value))} />
        <Field label="Certifications, comma separated" value={profile.certifications.join(', ')} onChangeText={(value) => update('certifications', csv(value))} />
        <Field label="Experience highlights, comma separated" value={profile.experienceHighlights.join(', ')} onChangeText={(value) => update('experienceHighlights', csv(value))} />
        <Pressable onPress={() => update('destinationWeddingsSupported', !profile.destinationWeddingsSupported)} style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}><CheckSquare size={20} weight={profile.destinationWeddingsSupported ? 'fill' : 'regular'} /><Body tone="brand">Destination weddings supported</Body></Pressable>
      </Card>
      <Button label="Save Profile" onPress={() => void save()} />
    </Screen>
  );
}

function ChoiceGroup({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <View style={{ gap: space(2) }}><Caption>{title}</Caption><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{options.map((option) => {
    const active = selected.includes(option);
    return <Pressable key={option} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => onToggle(option)} style={{ borderRadius: 6, borderWidth: 1, borderColor: active ? '#8B6A2B' : '#D8D5CB', backgroundColor: active ? '#F3EBD7' : '#FFFFFF', paddingHorizontal: space(3), paddingVertical: space(2) }}><Caption tone={active ? 'brand' : 'muted'}>{option}</Caption></Pressable>;
  })}</View></View>;
}
