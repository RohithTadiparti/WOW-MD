import { useState } from 'react';
import { Alert as NativeAlert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { Badge, FilterChips } from '@/components/chrome';
import { ListScreen } from '@/components/layout';
import { Alert, Body, Button, Caption, Card, Field, PageSubtitle, PageTitle, SectionTitle } from '@/components/ui';
import { space } from '@/theme';

type Client = {
  profileId: string; profileCode: string; id: string | null; email: string | null;
  displayName: string | null; city: string | null; isActive: boolean;
  profileCompleted: boolean; claimStatus: 'self' | 'invited' | 'claimed' | string;
};
const claimTone = (status: string) => status === 'claimed' ? 'positive' as const : status === 'invited' ? 'caution' as const : 'neutral' as const;
const claimLabel = (status: string) => ({ self: 'Not invited', invited: 'Invitation sent', claimed: 'Claimed' }[status] ?? status);

/** The agent's phone-sized book of business. It intentionally reads profiles,
 * not only accounts: a person signed up at the counter still needs managing. */
export default function AgentClients() {
  const router = useRouter(); const qc = useQueryClient();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['agent-clients-mobile', status],
    queryFn: async () => (await api.get('/agents/clients', { params: status ? { claimStatus: status } : {} })).data as { data: Client[] },
    retry: false,
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/agents/clients/${id}/status`, { isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agent-clients-mobile'] }),
    onError: (e) => setError(apiMessage(e, 'The client account could not be changed.')),
  });
  const clients = query.data?.data ?? [];
  return <ListScreen
    header={<>
      <View style={{ gap: space(1), marginTop: space(4) }}><PageTitle>My Clients</PageTitle><PageSubtitle>Everyone you manage, whether they have claimed an account or not.</PageSubtitle></View>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <FilterChips options={[{ key: 'self', label: 'Not invited' }, { key: 'invited', label: 'Invited' }, { key: 'claimed', label: 'Claimed' }]} value={status} onChange={setStatus} />
      <Button label="Create client profile" onPress={() => router.push('/agent-onboard')} />
    </>}
    data={clients} keyExtractor={(client) => client.profileId} loading={query.isPending}
    refreshing={query.isFetching && !query.isPending} onRefresh={() => void query.refetch()}
    emptyTitle="No clients here" emptyBody={status ? 'Try a different client status.' : 'Create a profile when a family asks you to represent them.'}
    renderItem={(client) => <Card style={{ gap: space(2) }}>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/biodata', params: { profileId: client.profileId } })}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space(2) }}><View style={{ flex: 1, gap: space(.5) }}><SectionTitle>{client.displayName ?? 'Unnamed client'}</SectionTitle><Caption>{[client.profileCode, client.city, client.email, client.profileCompleted ? null : 'Biodata incomplete'].filter(Boolean).join(' · ')}</Caption></View><Badge tone={claimTone(client.claimStatus)}>{claimLabel(client.claimStatus)}</Badge></View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: space(2) }}><Button style={{ flex: 1 }} small variant="outline" label="Open biodata" onPress={() => router.push({ pathname: '/biodata', params: { profileId: client.profileId } })} />
      {client.id ? <Button style={{ flex: 1 }} small label={client.isActive ? 'Deactivate' : 'Reactivate'} busy={toggle.isPending} onPress={() => NativeAlert.alert(client.isActive ? 'Deactivate account?' : 'Reactivate account?', client.isActive ? 'They will no longer be able to sign in until you reactivate them.' : 'They will be able to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: client.isActive ? 'Deactivate' : 'Reactivate', style: client.isActive ? 'destructive' : 'default', onPress: () => toggle.mutate({ id: client.id as string, isActive: !client.isActive }) }])} /> : null}</View>
    </Card>}
  />;
}
