import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { api, apiMessage } from '@/lib/api';
import { formatDate } from '@/shared/dates';
import { Alert, Body, Button, Caption, Card, Field, Loading, PageSubtitle, PageTitle, Screen, SectionTitle } from '@/components/ui';
import { space } from '@/theme';

interface WowPlanner {
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
  serviceFee: number;
  availability: string;
}
interface WeddingPlan { id: string; weddingDate: string | null }
interface WeddingEvent { id: string; name: string; eventDate: string | null }

const CITIES = '';
const SUGGESTED_SERVICES = ['Venue Coordination', 'Vendor Coordination', 'Guest Coordination', 'Timeline Management', 'Decoration Coordination', 'Catering Coordination', 'Transportation Coordination', 'Budget Coordination', 'Accommodation Coordination', 'Wedding-Day Coordination'];

export default function WowPlannersScreen() {
  const queryClient = useQueryClient();
  const [city, setCity] = useState(CITIES);
  const [selected, setSelected] = useState<WowPlanner | null>(null);
  const [planId, setPlanId] = useState('');
  const [date, setDate] = useState('');
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const plannersQuery = useQuery<WowPlanner[]>({
    queryKey: ['wow-planners', city],
    queryFn: async () => (await api.get('/wow-planners', { params: city ? { city } : {} })).data,
  });
  const plansQuery = useQuery<WeddingPlan[]>({
    queryKey: ['client-wedding-plans'],
    queryFn: async () => (await api.get('/planner/plans')).data,
  });
  const eventsQuery = useQuery<WeddingEvent[]>({
    queryKey: ['client-wedding-events'],
    queryFn: async () => (await api.get('/events')).data,
  });

  useEffect(() => {
    const current = plansQuery.data?.find((plan) => plan.id === planId);
    if (!planId && plansQuery.data?.length) {
      setPlanId(plansQuery.data[0].id);
      setDate(plansQuery.data[0].weddingDate ?? '');
    } else if (current?.weddingDate && !date) {
      setDate(current.weddingDate);
    }
  }, [plansQuery.data, planId, date]);

  useEffect(() => {
    if (!selected || !date) { setAvailability(''); return; }
    let current = true;
    void api.get(`/wow-planners/${selected.userId}/availability`, { params: { date } })
      .then(({ data }) => { if (current) setAvailability(data.availability); })
      .catch(() => { if (current) setAvailability('Unavailable'); });
    return () => { current = false; };
  }, [selected, date]);

  const plans = plansQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const pickedEvents = events.filter((event) => eventIds.includes(event.id));
  const serviceOptions = selected?.services.length ? selected.services : SUGGESTED_SERVICES;
  const activePlan = plans.find((plan) => plan.id === planId);

  function toggleEvent(event: WeddingEvent) {
    setEventIds((current) => current.includes(event.id) ? current.filter((id) => id !== event.id) : [...current, event.id]);
    const defaults = event.name.toLowerCase().includes('reception')
      ? ['Decoration Coordination', 'Catering Coordination', 'Guest Coordination']
      : ['Venue Coordination', 'Vendor Coordination', 'Guest Coordination', 'Timeline Management', 'Transportation Coordination'];
    setServices((current) => [...new Set([...current, ...defaults.filter((service) => serviceOptions.includes(service))])]);
  }

  async function hire() {
    if (!selected || !planId || !date || !availability || availability === 'Unavailable') return;
    setError(''); setNotice('');
    try {
      const { data } = await api.post(`/wow-planners/${selected.userId}/book`, { weddingPlanId: planId, weddingDate: date, eventIds, services });
      setNotice(`WOW Planner Booking Confirmed. ${data.planner} is assigned to your wedding. Planner service fee: ₹0.`);
      await queryClient.invalidateQueries({ queryKey: ['planner-clients-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['planner-overview'] });
      await queryClient.invalidateQueries({ queryKey: ['client-wedding-plans'] });
    } catch (cause) {
      setError(apiMessage(cause, 'This planner could not be hired. Check the date and try again.'));
    }
  }

  return (
    <Screen>
      <View><PageTitle>WOW Wedding Planners</PageTitle><PageSubtitle>Official WOW Team · Free WOW Planning Service</PageSubtitle></View>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}{error ? <Alert tone="critical">{error}</Alert> : null}
      <Field label="Service city" value={city} onChangeText={setCity} placeholder="Any city" />
      {plannersQuery.isPending ? <Loading rows={4} /> : plannersQuery.isError ? <Alert tone="critical">WOW Planners could not be loaded.</Alert> : (plannersQuery.data ?? []).length === 0 ? <Card><Caption tone="faint">No complete, active WOW Planner profiles are available for this search.</Caption></Card> : (
        (plannersQuery.data ?? []).map((planner) => <Card key={planner.userId}>
          <View style={{ flexDirection: 'row', gap: space(3), alignItems: 'center' }}>
            {planner.profilePhotoUrl ? <Image source={{ uri: planner.profilePhotoUrl }} style={{ width: 58, height: 58, borderRadius: 29 }} contentFit="cover" /> : null}
            <View style={{ flex: 1, gap: space(1) }}><SectionTitle>{planner.displayName ?? 'WOW Planner'}</SectionTitle><Caption tone="brand">WOW Planner · Official WOW Team</Caption><Caption>{planner.headline}</Caption></View>
          </View>
          <Body>{planner.yearsExperience} years · {planner.weddingsHandled} weddings handled</Body>
          <Caption>Events: {planner.supportedEvents.slice(0, 4).join(' · ')}</Caption>
          <Caption>Services: {planner.services.slice(0, 3).join(' · ')}</Caption>
          <Caption>Service area: {[planner.primaryCity, ...planner.serviceAreas].filter(Boolean).join(' · ')}</Caption>
          <Caption tone="brand">Free WOW Planning Service · ₹0</Caption>
          <Button label="View Profile / Check Availability" variant="outline" onPress={() => { setSelected(planner); setAvailability(''); setEventIds([]); setServices([]); setDate(''); }} />
        </Card>)
      )}
      {selected ? <Card>
        <SectionTitle>{selected.displayName}</SectionTitle>
        <Caption tone="brand">WOW Planner · Official WOW Team · Free WOW Planning Service</Caption>
        <Body>{selected.about}</Body>
        <Caption>Experience: {selected.yearsExperience} years · Languages: {selected.languages.join(', ')}</Caption>
        <Caption>Specializations: {selected.specializations.join(', ')}</Caption>
        <Caption>Services: {selected.services.join(' · ')}</Caption>
        <Caption>Events: {selected.supportedEvents.join(' · ')}</Caption>
        {selected.portfolio.length ? <View style={{ flexDirection: 'row', gap: space(2) }}>{selected.portfolio.slice(0, 4).map((uri) => <Image key={uri} source={{ uri }} style={{ width: 88, height: 76, borderRadius: 6 }} contentFit="cover" />)}</View> : null}
        <Field label="Choose your wedding plan" value={plans.find((plan) => plan.id === planId)?.weddingDate ?? (planId ? 'Wedding plan selected' : '')} editable={false} placeholder="Create a wedding plan first" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{plans.map((plan) => <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{ selected: planId === plan.id }} onPress={() => { setPlanId(plan.id); setDate(plan.weddingDate ?? ''); }}><Caption tone={planId === plan.id ? 'brand' : 'muted'}>{formatDate(plan.weddingDate, 'Set a date')}</Caption></Pressable>)}</View>
        <Field label="Wedding date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-12-12" />
        {date ? <Caption>Availability: {availability || 'Checking…'}</Caption> : null}
        <SectionTitle>What events do you need planning assistance for?</SectionTitle>
        {eventsQuery.isPending ? <Loading rows={2} /> : events.length === 0 ? <Caption tone="faint">Add events to your wedding first, then choose them here.</Caption> : events.map((event) => {
          const active = eventIds.includes(event.id);
          return <Pressable key={event.id} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggleEvent(event)}><Body tone={active ? 'brand' : 'default'}>{active ? '[x]' : '[ ]'} {event.name}{event.eventDate ? ` · ${formatDate(event.eventDate)}` : ''}</Body></Pressable>;
        })}
        <SectionTitle>Planning services</SectionTitle>
        {serviceOptions.map((service) => {
          const active = services.includes(service);
          return <Pressable key={service} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => setServices((current) => active ? current.filter((item) => item !== service) : [...current, service])}><Body tone={active ? 'brand' : 'default'}>{active ? '[x]' : '[ ]'} {service}</Body></Pressable>;
        })}
        <View style={{ borderTopWidth: 1, borderTopColor: '#E6E1D6', paddingTop: space(3), gap: space(1) }}>
          <Caption>Wedding date: {date || 'Choose a date'}</Caption>
          <Caption>Events: {pickedEvents.map((event) => event.name).join(', ') || 'None selected'}</Caption>
          <Caption>Planner service fee: ₹0</Caption><Body>Total planner fee: ₹0</Body>
        </View>
        {activePlan?.weddingDate && date !== activePlan.weddingDate ? <Alert tone="critical">This date must match the wedding plan date.</Alert> : null}
        <Button label="Hire WOW Planner" onPress={() => void hire()} disabled={!planId || !date || !availability || availability === 'Unavailable' || eventIds.length === 0 || services.length === 0 || Boolean(activePlan?.weddingDate && date !== activePlan.weddingDate)} />
        <Button label="Close Profile" variant="outline" onPress={() => setSelected(null)} />
      </Card> : null}
    </Screen>
  );
}
