import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { api, apiMessage } from '@/lib/api';
import { Alert, Body, Button, Caption, Card, Field, Loading, PageSubtitle, PageTitle, Screen, SectionTitle } from '@/components/ui';
import { formatDate } from '@/shared/dates';
import { space } from '@/theme';

interface Vendor {
  id: string;
  name: string;
  category: string;
  description: string | null;
  city: string | null;
  ratingAvg: number;
  ratingCount: number;
  pricing?: { startingAt?: number; currency?: string; unit?: string };
  portfolio?: string[];
}
interface PlannerClient { userId: string; planId: string; name: string; weddingDate: string | null }
interface ClientDetail { events: { id: string; name: string; date: string | null }[] }

const CATEGORIES = ['venue', 'catering', 'photography', 'videography', 'decor', 'makeup', 'mehendi-artist', 'entertainment', 'transportation', 'invitations', 'florist'];

export default function PlannerVendors() {
  const client = useQuery<{ clients: PlannerClient[] }>({
    queryKey: ['planner-clients'], queryFn: async () => (await api.get('/planner/clients')).data, retry: false,
  });
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [clientUserId, setClientUserId] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [eventId, setEventId] = useState('');
  const [requirements, setRequirements] = useState('');
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const vendors = useQuery<{ data: Vendor[] }>({
    queryKey: ['planner-vendor-search', search, city, category],
    queryFn: async () => (await api.get('/vendors/search', { params: { search: search || undefined, city: city || undefined, category: category || undefined, limit: 40 } })).data,
  });
  const selectedClient = client.data?.clients.find((row) => row.userId === clientUserId);
  const wedding = useQuery<ClientDetail>({
    queryKey: ['planner-client-vendor-events', clientUserId],
    queryFn: async () => (await api.get(`/planner/clients/${clientUserId}`)).data,
    enabled: Boolean(clientUserId), retry: false,
  });
  const booking = useMutation({
    mutationFn: async (vendor: Vendor) => api.post('/bookings', {
      forClientUserId: clientUserId,
      providerType: 'vendor',
      providerId: vendor.id,
      eventId: eventId || undefined,
      eventDate: wedding.data?.events.find((event) => event.id === eventId)?.date ?? undefined,
      requirements,
    }),
    onSuccess: async () => {
      setNotice('Vendor booking request sent on behalf of your client. They remain the booking owner and payment decision-maker.');
      setRequirements('');
      await queryClient.invalidateQueries({ queryKey: ['planner-bookings-placed'] });
      await queryClient.invalidateQueries({ queryKey: ['planner-clients'] });
    },
    onError: (cause) => setError(apiMessage(cause, 'The vendor request could not be sent.')),
  });

  const rows = useMemo(() => vendors.data?.data ?? [], [vendors.data]);
  const shortlisted = (id: string) => shortlist.includes(id);

  return (
    <Screen>
      <View><PageTitle>Vendors</PageTitle><PageSubtitle>Search the existing vendor directory and request a booking for an assigned client. Clients own bookings and approve payments.</PageSubtitle></View>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}{error ? <Alert tone="critical">{error}</Alert> : null}
      <Field label="Search vendors" value={search} onChangeText={setSearch} placeholder="Name or service" />
      <View style={{ flexDirection: 'row', gap: space(2) }}><View style={{ flex: 1 }}><Field label="City" value={city} onChangeText={setCity} placeholder="Any city" /></View><View style={{ flex: 1 }}><Field label="Category" value={category} onChangeText={setCategory} placeholder="Any category" /></View></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{CATEGORIES.map((value) => <Pressable key={value} onPress={() => setCategory(category === value ? '' : value)} accessibilityRole="button"><Caption tone={category === value ? 'brand' : 'muted'}>{value.replace(/-/g, ' ')}</Caption></Pressable>)}</View>
      {vendors.isPending ? <Loading rows={4} /> : vendors.isError ? <Alert tone="critical">Vendors could not be loaded.</Alert> : rows.length === 0 ? <Card><Caption tone="faint">No vendors match this search.</Caption></Card> : rows.map((vendor) => <Card key={vendor.id}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}><SectionTitle>{vendor.name}</SectionTitle><Caption>{vendor.category}</Caption></View>
        {vendor.city ? <Caption>{vendor.city}</Caption> : null}
        {vendor.description ? <Body>{vendor.description}</Body> : null}
        {vendor.ratingCount > 0 ? <Caption>{vendor.ratingAvg.toFixed(1)} · {vendor.ratingCount} reviews</Caption> : null}
        {vendor.pricing?.startingAt ? <Caption>From ₹{Number(vendor.pricing.startingAt).toLocaleString('en-IN')}{vendor.pricing.unit ? ` / ${vendor.pricing.unit}` : ''}</Caption> : null}
        <View style={{ flexDirection: 'row', gap: space(2) }}><Button label={shortlisted(vendor.id) ? 'Shortlisted' : 'Shortlist'} variant="outline" small onPress={() => setShortlist((current) => shortlisted(vendor.id) ? current.filter((id) => id !== vendor.id) : [...current, vendor.id])} /><Button label={selectedVendorId === vendor.id ? 'Close request' : 'Request booking'} small onPress={() => { setSelectedVendorId(selectedVendorId === vendor.id ? '' : vendor.id); setClientUserId(client.data?.clients[0]?.userId ?? ''); setError(''); setNotice(''); }} /></View>
        {selectedVendorId === vendor.id && <View style={{ gap: space(2) }}>
          <Field label="Client" value={selectedClient?.name ?? ''} editable={false} placeholder="Select a client" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{(client.data?.clients ?? []).map((row) => <Pressable key={row.userId} accessibilityRole="radio" accessibilityState={{ selected: clientUserId === row.userId }} onPress={() => { setClientUserId(row.userId); setEventId(''); }}><Caption tone={clientUserId === row.userId ? 'brand' : 'muted'}>{row.name}</Caption></Pressable>)}</View>
          {wedding.isPending ? <Loading rows={1} /> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>{(wedding.data?.events ?? []).map((event) => <Pressable key={event.id} accessibilityRole="radio" accessibilityState={{ selected: eventId === event.id }} onPress={() => setEventId(event.id)}><Caption tone={eventId === event.id ? 'brand' : 'muted'}>{event.name}{event.date ? ` · ${formatDate(event.date)}` : ''}</Caption></Pressable>)}</View>}
          <Field label="Requirements for vendor" value={requirements} onChangeText={setRequirements} multiline placeholder="Guest count, service needs, timings and other details" />
          <Button label="Send request for client" busy={booking.isPending} disabled={!clientUserId || requirements.trim().length < 10} onPress={() => booking.mutate(vendor)} />
        </View>}
      </Card>)}
    </Screen>
  );
}
