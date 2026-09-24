import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MagnifyingGlass } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { fetchWeddingDashboard } from '@/lib/wedding-plan';
import { Badge } from '@/components/chrome';
import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Field,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

type RelationFilter = 'all' | 'family' | 'friends' | 'work' | 'others';
type RsvpTone = 'positive' | 'caution' | 'critical' | 'neutral';

interface Guest {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  partySize?: number | null;
  relation?: string | null;
}

interface Invite {
  guestId: string;
  status: string;
}

const RELATION_CHIPS: { key: RelationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'family', label: 'Family' },
  { key: 'friends', label: 'Friends' },
  { key: 'work', label: 'Work' },
  { key: 'others', label: 'Others' },
];

function bucketRelation(relation: string | null | undefined): Exclude<RelationFilter, 'all'> {
  const value = (relation ?? '').toLowerCase();
  if (!value) return 'others';
  if (/(family|uncle|aunt|cousin|parent|mother|father|brother|sister|in-law|relative)/.test(value)) {
    return 'family';
  }
  if (/(friend|college|school)/.test(value)) return 'friends';
  if (/(work|office|colleague|boss|client)/.test(value)) return 'work';
  return 'others';
}

function rsvpLabel(status: string | undefined): { label: string; tone: RsvpTone } {
  switch (status) {
    case 'attending':
      return { label: 'Confirmed', tone: 'positive' };
    case 'declined':
      return { label: 'Declined', tone: 'critical' };
    case 'maybe':
      return { label: 'Maybe', tone: 'caution' };
    case 'invited':
      return { label: 'Pending', tone: 'caution' };
    default:
      return { label: 'Pending', tone: 'neutral' };
  }
}

export default function PlanGuests() {
  const theme = useTheme();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RelationFilter>('all');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [partySize, setPartySize] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const dashboard = useQuery({
    queryKey: ['wedding-dashboard'],
    queryFn: fetchWeddingDashboard,
    retry: false,
  });
  const guests = useQuery({
    queryKey: ['guests'],
    queryFn: async () => (await api.get('/events/guests')).data as Guest[],
    retry: false,
  });
  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/events')).data,
    retry: false,
  });

  const eventRows = Array.isArray(events.data) ? events.data : (events.data?.data ?? []);
  const primaryId = (eventRows[0] as { id?: string } | undefined)?.id;

  const guestList = useQuery({
    queryKey: ['guest-list', primaryId],
    queryFn: async () =>
      (await api.get(`/events/${primaryId}/guest-list`)).data as {
        invites: Invite[];
      },
    enabled: Boolean(primaryId),
    retry: false,
  });

  const add = useMutation({
    mutationFn: async () => {
      await api.post('/events/guests', {
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(relation.trim() ? { relation: relation.trim() } : {}),
        ...(partySize ? { partySize: Number(partySize) } : {}),
      });
    },
    onSuccess: async () => {
      setAdding(false);
      setName('');
      setPhone('');
      setRelation('');
      setPartySize('');
      setNotice('Guest added.');
      setError('');
      await qc.invalidateQueries({ queryKey: ['guests'] });
      await qc.invalidateQueries({ queryKey: ['wedding-dashboard'] });
    },
    onError: (err) => setError(apiMessage(err, 'That guest could not be added.')),
  });

  const inviteStatus = useMemo(() => {
    const map = new Map<string, string>();
    for (const invite of guestList.data?.invites ?? []) {
      map.set(invite.guestId, invite.status);
    }
    return map;
  }, [guestList.data]);

  const rows = useMemo(() => {
    const list = guests.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((guest) => {
      if (filter !== 'all' && bucketRelation(guest.relation) !== filter) return false;
      if (!q) return true;
      return (
        guest.name.toLowerCase().includes(q) ||
        (guest.relation ?? '').toLowerCase().includes(q) ||
        (guest.phone ?? '').includes(q)
      );
    });
  }, [guests.data, search, filter]);

  const stats = dashboard.data?.guests;

  return (
    <Screen>
      <SectionTitle>Guest List</SectionTitle>
      <Caption tone="muted">Who is invited, and who has replied.</Caption>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
        <StatBox label="Total" value={stats?.onList ?? guests.data?.length ?? 0} tone="brand" />
        <StatBox label="Confirmed" value={stats?.attending ?? 0} tone="positive" />
        <StatBox label="Pending" value={stats?.awaiting ?? 0} tone="caution" />
        <StatBox label="Declined" value={stats?.declined ?? 0} tone="critical" />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: rgb(theme.surface),
          borderRadius: 22,
          paddingLeft: space(3),
          borderWidth: 1,
          borderColor: rgb(theme.border),
        }}
      >
        <MagnifyingGlass size={18} color={rgb(theme.brand)} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search guests..."
          placeholderTextColor={rgb(theme.ink[400])}
          style={{ flex: 1, padding: space(3), color: rgb(theme.ink[900]) }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
        {RELATION_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={{
                paddingHorizontal: space(3),
                paddingVertical: space(1.5),
                borderRadius: 999,
                backgroundColor: active ? rgb(theme.brand) : rgb(theme.surfaceSunken),
              }}
            >
              <Caption style={{ color: active ? rgb(theme.brandFg) : rgb(theme.ink[700]), fontWeight: '600' }}>
                {chip.label}
              </Caption>
            </Pressable>
          );
        })}
      </View>

      {guests.isPending ? (
        <Loading rows={3} />
      ) : guests.error ? (
        <Alert tone="critical">{apiMessage(guests.error, 'Guests could not be loaded.')}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title="No guests yet">Add family and friends to start your list.</EmptyState>
      ) : (
        rows.map((guest) => {
          const status = rsvpLabel(inviteStatus.get(guest.id));
          return (
            <Card key={guest.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: rgb(theme.brandSoft),
                }}
              >
                <Body style={{ fontWeight: '700', color: rgb(theme.brandStrong) }}>
                  {guest.name.slice(0, 1).toUpperCase()}
                </Body>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Body style={{ fontWeight: '600' }}>{guest.name}</Body>
                <Caption tone="faint">
                  {[guest.relation || 'Guest', guest.partySize ? `Party of ${guest.partySize}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Caption>
              </View>
              <Badge tone={status.tone}>{status.label}</Badge>
            </Card>
          );
        })
      )}

      {adding ? (
        <Card style={{ gap: space(3) }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Guest name" />
          <Field
            label="Mobile"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Optional"
          />
          <Field
            label="Relation"
            value={relation}
            onChangeText={setRelation}
            placeholder="Family, Friend, Work…"
          />
          <Field
            label="Party size"
            value={partySize}
            onChangeText={setPartySize}
            keyboardType="number-pad"
            placeholder="1"
          />
          <Button
            label="Save guest"
            busy={add.isPending}
            disabled={!name.trim()}
            onPress={() => add.mutate()}
          />
          <Button label="Cancel" variant="outline" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Button
          label="Add Guest"
          onPress={() => {
            setAdding(true);
            setNotice('');
          }}
        />
      )}
    </Screen>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'positive' | 'caution' | 'critical';
}) {
  const theme = useTheme();
  const bg =
    tone === 'positive'
      ? theme.positiveBg
      : tone === 'caution'
        ? theme.cautionBg
        : tone === 'critical'
          ? theme.criticalBg
          : theme.brandSoft;
  const fg =
    tone === 'positive'
      ? theme.positiveFg
      : tone === 'caution'
        ? theme.cautionFg
        : tone === 'critical'
          ? theme.criticalFg
          : theme.brandStrong;
  return (
    <View
      style={{
        width: '48%',
        padding: space(3),
        borderRadius: 12,
        backgroundColor: rgb(bg),
        gap: 2,
      }}
    >
      <Caption style={{ color: rgb(fg) }}>{label}</Caption>
      <Body style={{ fontWeight: '700', fontSize: 20, color: rgb(fg) }}>{value}</Body>
    </View>
  );
}
