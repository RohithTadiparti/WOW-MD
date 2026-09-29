import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { formatDate } from '@/shared/dates';
import { Body, Caption, Card, Loading, PageSubtitle, PageTitle, Screen, SectionTitle } from '@/components/ui';
import { space } from '@/theme';

interface ClientWedding {
  userId: string;
  planId: string;
  name: string;
  bride: string | null;
  groom: string | null;
  status: string;
  weddingDate: string | null;
  location: string | null;
  events: number;
  tasks: { total: number; done: number };
  bookings: { total: number; confirmed: number; pending: number };
}

export default function EmployeeWeddings() {
  const router = useRouter();
  const query = useQuery<{ clients: ClientWedding[] }>({
    queryKey: ['planner-clients'],
    queryFn: async () => (await api.get('/planner/clients')).data,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
  });
  const clients = query.data?.clients ?? [];

  return (
    <Screen>
      <View><PageTitle>My Weddings</PageTitle><PageSubtitle>Weddings assigned to your WOW Planner account.</PageSubtitle></View>
      {query.isPending ? <Loading rows={4} /> : query.isError ? <Caption tone="critical">Your weddings could not be loaded.</Caption> : clients.length === 0 ? <Card><SectionTitle>No assigned weddings yet</SectionTitle><Caption tone="faint">New client assignments will appear here.</Caption></Card> : clients.map((wedding) => {
        const done = wedding.tasks?.done ?? 0;
        const total = wedding.tasks?.total ?? 0;
        return <Pressable key={wedding.planId} accessibilityRole="button" onPress={() => router.push({ pathname: '/employee-wedding/[userId]', params: { userId: wedding.userId } })}>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}><SectionTitle>{[wedding.bride, wedding.groom].filter(Boolean).join(' & ') || wedding.name}</SectionTitle><Caption tone="brand">{wedding.status}</Caption></View>
            <Caption>{wedding.name}</Caption>
            <Caption>{formatDate(wedding.weddingDate, 'Wedding date not set')}{wedding.location ? ` · ${wedding.location}` : ''}</Caption>
            <Body>{wedding.events} events · {wedding.bookings?.total ?? 0} vendor bookings</Body>
            <Caption>Tasks: {done} of {total} complete</Caption>
          </Card>
        </Pressable>;
      })}
    </Screen>
  );
}
