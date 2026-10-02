import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { CaretRight, CalendarBlank, CheckCircle, MapPin, Users } from 'phosphor-react-native';

import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { Badge, DetailGrid, DetailRow, Divider } from '@/components/chrome';
import { Body, Caption, Card, EmptyState, Loading, Screen, SectionTitle } from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

type Client = {
  userId: string;
  planId: string;
  name: string;
  bride: string | null;
  groom: string | null;
  weddingDate: string | null;
  derivedWeddingDate: string | null;
  location: string | null;
  events: number;
  tasks: { total: number; done: number };
  bookings: { total: number; confirmed: number; pending: number };
  status: 'active' | 'upcoming' | 'completed';
};

type ClientDetail = {
  client: { name: string; bride: string | null; groom: string | null; city: string | null; status: string };
  wedding: { weddingDate: string | null; countdown?: { days?: number | null } | null; functions: number; venues: string[]; cities: string[] };
  guests: { invited?: number; confirmed?: number; total?: number } | null;
  budget: { total?: string | number | null; committed?: string | number | null } | null;
  events: { id: string; name: string; date: string | null; venue: string | null; city: string | null; status: string }[];
  tasks: { id: string; title: string; category: string; dueDate: string | null; status: string }[];
  vendors: { bookingId: string; name: string; service: string | null; status: string; eventDate: string | null; amount: string | number; currency: string }[];
};

const STATUS: Record<Client['status'], string> = {
  active: 'Planning under way',
  upcoming: 'Getting started',
  completed: 'Wedding completed',
};

function rupees(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? `₹${numeric.toLocaleString('en-IN')}` : '—';
}

/**
 * The planner's working book, not the couple's own planning tab.
 *
 * This was previously desktop-only, which meant a planner could see counts on
 * Home but could not open the couple, their functions, task progress, or the
 * vendors already arranged. The API already returns this scoped view and
 * authorises it against the engagement, so the device simply renders that
 * canonical record rather than attempting to join wedding data itself.
 */
export default function PlannerClients() {
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const clients = useQuery({
    queryKey: ['planner-clients'],
    queryFn: async () => (await api.get('/planner/clients')).data as { clients: Client[] },
    refetchInterval: 30_000,
  });
  const detail = useQuery({
    queryKey: ['planner-client', selected],
    queryFn: async () => (await api.get(`/planner/clients/${selected}`)).data as ClientDetail,
    enabled: Boolean(selected),
  });

  const rows = useMemo(
    () => [...(clients.data?.clients ?? [])].sort((a, b) => (a.derivedWeddingDate ?? '9999').localeCompare(b.derivedWeddingDate ?? '9999')),
    [clients.data?.clients],
  );

  if (selected) {
    return <ClientWedding detail={detail.data} loading={detail.isLoading} onBack={() => setSelected(null)} />;
  }

  return (
    <Screen onRefresh={() => void clients.refetch()} refreshing={clients.isFetching}>
      <View style={{ gap: space(1) }}>
        <SectionTitle>Your client weddings</SectionTitle>
        <Caption tone="faint">Open a wedding to check functions, task progress and the vendors already arranged.</Caption>
      </View>
      {clients.isLoading ? <Loading rows={3} /> : rows.length === 0 ? (
        <EmptyState title="No client weddings yet">Confirmed planning bookings will appear here.</EmptyState>
      ) : rows.map((client) => (
        <Pressable
          key={client.planId}
          accessibilityRole="button"
          accessibilityLabel={`Open ${client.name}'s wedding`}
          onPress={() => setSelected(client.userId)}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Card>
            <View style={{ flexDirection: 'row', gap: space(2), alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: space(0.5) }}>
                <SectionTitle numberOfLines={1}>{client.name}</SectionTitle>
                {client.bride || client.groom ? <Caption tone="faint">{[client.bride, client.groom].filter(Boolean).join(' & ')}</Caption> : null}
              </View>
              <Badge tone={client.status === 'active' ? 'positive' : client.status === 'completed' ? 'neutral' : 'caution'}>{STATUS[client.status]}</Badge>
              <CaretRight size={16} color={rgb(theme.ink[400])} />
            </View>
            <Divider />
            <View style={{ gap: space(1) }}>
              <Fact icon={CalendarBlank} value={shortDate(client.derivedWeddingDate ?? client.weddingDate)} />
              {client.location ? <Fact icon={MapPin} value={client.location} /> : null}
              <Fact icon={CheckCircle} value={`${client.tasks.done} of ${client.tasks.total} tasks complete`} />
              <Fact icon={Users} value={`${client.bookings.confirmed} confirmed vendor booking${client.bookings.confirmed === 1 ? '' : 's'}`} />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

function Fact({ icon: Icon, value }: { icon: typeof CalendarBlank; value: string }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', gap: space(1.5), alignItems: 'center' }}><Icon size={15} color={rgb(theme.ink[400])} /><Caption tone="faint">{value}</Caption></View>;
}

function ClientWedding({ detail, loading, onBack }: { detail?: ClientDetail; loading: boolean; onBack: () => void }) {
  if (loading || !detail) return <Screen><Loading rows={4} /></Screen>;
  const completed = detail.tasks.filter((task) => task.status === 'done').length;
  const openTasks = detail.tasks.filter((task) => task.status !== 'done');
  return (
    <Screen>
      <View style={{ gap: space(1) }}>
        <ButtonRow label="Back to client weddings" onPress={onBack} />
        <SectionTitle>{detail.client.name}</SectionTitle>
        {(detail.client.bride || detail.client.groom) ? <Caption tone="faint">{[detail.client.bride, detail.client.groom].filter(Boolean).join(' & ')}</Caption> : null}
      </View>
      <Card>
        <SectionTitle>Wedding at a glance</SectionTitle>
        <DetailGrid>
          <DetailRow label="Wedding date">{shortDate(detail.wedding.weddingDate)}</DetailRow>
          <DetailRow label="Functions">{String(detail.wedding.functions)}</DetailRow>
          <DetailRow label="City">{detail.wedding.cities.join(', ') || detail.client.city || 'Not set'}</DetailRow>
          <DetailRow label="Venues">{detail.wedding.venues.join(', ') || 'Not set'}</DetailRow>
          <DetailRow label="Guests">{String(detail.guests?.confirmed ?? detail.guests?.invited ?? detail.guests?.total ?? 0)}</DetailRow>
          <DetailRow label="Budget committed">{rupees(detail.budget?.committed)}</DetailRow>
        </DetailGrid>
      </Card>
      <Card>
        <SectionTitle>Tasks · {completed} of {detail.tasks.length} done</SectionTitle>
        {openTasks.length === 0 ? <Caption tone="faint">No outstanding tasks.</Caption> : openTasks.slice(0, 8).map((task) => (
          <View key={task.id} style={{ gap: space(0.5) }}><Body>{task.title}</Body><Caption tone="faint">{task.category}{task.dueDate ? ` · due ${shortDate(task.dueDate)}` : ''}</Caption></View>
        ))}
      </Card>
      <Card>
        <SectionTitle>Functions</SectionTitle>
        {detail.events.length === 0 ? <Caption tone="faint">No functions added yet.</Caption> : detail.events.map((event) => (
          <View key={event.id} style={{ gap: space(0.5) }}><Body>{event.name}</Body><Caption tone="faint">{[shortDate(event.date), event.venue, event.city].filter(Boolean).join(' · ')}</Caption></View>
        ))}
      </Card>
      <Card>
        <SectionTitle>Vendors arranged</SectionTitle>
        {detail.vendors.length === 0 ? <Caption tone="faint">No vendor bookings yet.</Caption> : detail.vendors.map((vendor) => (
          <View key={vendor.bookingId} style={{ gap: space(0.5) }}><Body>{vendor.name}{vendor.service ? ` · ${vendor.service}` : ''}</Body><Caption tone="faint">{[vendor.status.replace(/_/g, ' '), vendor.eventDate ? shortDate(vendor.eventDate) : null, rupees(vendor.amount)].filter(Boolean).join(' · ')}</Caption></View>
        ))}
      </Card>
    </Screen>
  );
}

function ButtonRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress}><Caption style={{ color: rgb(theme.brandStrong) }}>{label}</Caption></Pressable>;
}
