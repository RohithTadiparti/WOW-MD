import { useState, type ReactNode } from 'react';
import { View, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarBlank, MapPin, Users } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { hhmm, shortDate } from '@/lib/format';
import { Alert, Body, Button, Caption, Card, EmptyState, Field, Loading, Screen } from '@/components/ui';
import { rgb, space, useTheme, radius } from '@/theme';

interface WeddingEvent {
  name: string;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  venueAddress: string | null;
  city: string | null;
}

interface SharedView {
  coupleNames?: string | null;
  events?: WeddingEvent[];
}

function Stepper({ icon, disabled, onPress }: { icon: 'minus' | 'plus'; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Button 
      variant="outline"
      label={icon === 'minus' ? '-' : '+'} 
      disabled={disabled}
      onPress={onPress} 
      style={{ minWidth: 44 }}
    />
  );
}

const statusOf = (err: unknown) => (err as { response?: { status?: number } })?.response?.status;

export default function SharedRsvp() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const invitation = useQuery({
    queryKey: ['share', token],
    queryFn: async () => (await api.get(`/events/share/${encodeURIComponent(token)}`)).data as SharedView,
    retry: false,
  });

  const cardQuery = useQuery({
    queryKey: ['invitation-card-shared'],
    queryFn: async () => (await api.get('/events/invitation-card')).data as { url: string },
    retry: false,
  });
  const cardUrl = cardQuery.data?.url;

  const respond = useMutation({
    mutationFn: async (body: { name: string; contact?: string; attending: boolean; partySize?: number }) =>
      api.post(`/events/share/${encodeURIComponent(token)}`, body),
    onSuccess: () => {
      setError('');
      setSuccess(true);
    },
    onError: (err) =>
      setError(
        statusOf(err) === 400 || statusOf(err) === 404
          ? 'This invitation link is no longer valid.'
          : 'Your response could not be sent. Check your connection and try again.',
      ),
  });

  if (invitation.isPending) return <Screen><Loading rows={4} /></Screen>;

  if (invitation.error || !invitation.data) {
    const code = statusOf(invitation.error);
    return (
      <Screen>
        <EmptyState title="Invitation unavailable">
          This link is not valid or has expired.
        </EmptyState>
        <Button label="Try Again" variant="outline" onPress={() => void invitation.refetch()} />
      </Screen>
    );
  }

  if (success) {
    return (
      <Screen>
        <Card style={{ alignItems: 'center', gap: space(3), paddingVertical: space(6) }}>
          <Body style={{ fontSize: 20, fontWeight: '700' }}>Thank You!</Body>
          <Caption tone="muted" style={{ textAlign: 'center' }}>
            Your response has been submitted.
          </Caption>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {cardUrl ? (
        <Card style={{ padding: 0, overflow: 'hidden', backgroundColor: rgb(theme.surfaceSunken) }}>
          <Image source={{ uri: cardUrl }} style={{ width: '100%', height: 300 }} resizeMode="contain" />
        </Card>
      ) : (
        <Card style={{ alignItems: 'center', gap: space(3), paddingVertical: space(6) }}>
          <Body style={{ fontSize: 26, fontWeight: '700', textAlign: 'center' }}>
            You're Invited
          </Body>
          <Caption tone="muted" style={{ textAlign: 'center' }}>
            {invitation.data.coupleNames ? `To the wedding of ${invitation.data.coupleNames}` : 'To our wedding celebration'}
          </Caption>
        </Card>
      )}

      {error ? <Alert tone="critical">{error}</Alert> : null}

      <Card style={{ gap: space(3) }}>
        <Field label="Your Name" value={name} onChangeText={setName} placeholder="Enter your name" />
        <Field label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Enter phone number" />
        
        <View style={{ gap: space(1) }}>
          <Caption style={{ fontWeight: '600', color: rgb(theme.ink[800]) }}>Number of Guests</Caption>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
            <Stepper icon="minus" disabled={(partySize ?? 1) <= 1} onPress={() => setPartySize((n) => Math.max(1, (n ?? 1) - 1))} />
            <Body style={{ minWidth: 32, textAlign: 'center', fontWeight: '700' }}>{partySize ?? '-'}</Body>
            <Stepper icon="plus" disabled={(partySize ?? 1) >= 100} onPress={() => setPartySize((n) => Math.min(100, (n ?? 1) + 1))} />
          </View>
        </View>

        <Button
          label="Submit"
          busy={respond.isPending}
          disabled={!name.trim()}
          onPress={() => respond.mutate({ 
            name: name.trim(), 
            contact: phone.trim() || undefined,
            attending: true,
            partySize: partySize || undefined
          })}
        />
      </Card>
    </Screen>
  );
}
