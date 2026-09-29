import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { api } from '@/lib/api';
import { formatDate } from '@/shared/dates';
import { Body, Card, Caption, Loading, PageSubtitle, PageTitle, Screen, SectionTitle } from '@/components/ui';
import { space } from '@/theme';

interface ClientWorkspace {
  client: { name: string; userId: string };
  wedding: { weddingDate: string | null; venues: string[]; cities: string[]; functions: number };
  guests: { onList: number; expectedHeadcount: number };
  events: { id: string; name: string; date: string | null; startTime: string | null; venue: string | null; city: string | null; budget: string | null; status: string }[];
  tasks: { id: string; title: string; dueDate: string | null; status: string }[];
  vendors: { providerName: string; category: string | null; status: string }[];
}

export default function EmployeeWeddingDetail() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const query = useQuery<ClientWorkspace>({
    queryKey: ['planner-client', userId],
    queryFn: async () => (await api.get(`/planner/clients/${userId}`)).data,
    enabled: Boolean(userId),
    retry: false,
  });
  if (query.isPending) return <Screen><Loading rows={5} /></Screen>;
  if (query.isError || !query.data) return <Screen><Caption tone="critical">This wedding is not assigned to your planner account.</Caption></Screen>;
  const wedding = query.data;

  return (
    <Screen>
      <View><PageTitle>{wedding.client.name}</PageTitle><PageSubtitle>Wedding workspace · {formatDate(wedding.wedding.weddingDate, 'Date not set')}</PageSubtitle></View>
      <Card><SectionTitle>Wedding summary</SectionTitle><Body>{wedding.events.length} events · {wedding.guests.expectedHeadcount} attending of {wedding.guests.onList} guests</Body><Caption>{[...wedding.wedding.venues, ...wedding.wedding.cities].join(' · ') || 'Location not set'}</Caption></Card>
      <Card><SectionTitle>Events</SectionTitle>{wedding.events.length === 0 ? <Caption tone="faint">No events have been added yet.</Caption> : wedding.events.map((event) => <View key={event.id} style={{ paddingVertical: space(1) }}><Body>{event.name}</Body><Caption>{formatDate(event.date, 'Date not set')}{event.startTime ? ` · ${event.startTime}` : ''}{event.venue ? ` · ${event.venue}` : ''}{event.city ? ` · ${event.city}` : ''}</Caption></View>)}</Card>
      <Card><SectionTitle>Vendor bookings</SectionTitle>{wedding.vendors.length === 0 ? <Caption tone="faint">No vendor bookings yet.</Caption> : wedding.vendors.map((vendor, index) => <View key={`${vendor.providerName}-${index}`} style={{ paddingVertical: space(1) }}><Body>{vendor.providerName}</Body><Caption>{vendor.category ?? 'Vendor'} · {vendor.status.replace(/_/g, ' ')}</Caption></View>)}</Card>
      <Card><SectionTitle>Tasks</SectionTitle>{wedding.tasks.length === 0 ? <Caption tone="faint">No planning tasks yet.</Caption> : wedding.tasks.map((task) => <View key={task.id} style={{ paddingVertical: space(1) }}><Body>{task.title}</Body><Caption>{task.status.replace(/_/g, ' ')}{task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ''}</Caption></View>)}</Card>
    </Screen>
  );
}
