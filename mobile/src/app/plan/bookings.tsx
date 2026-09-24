import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { api, apiMessage } from '@/lib/api';
import { humanise, shortDate } from '@/lib/format';
import { categoryLabel } from '@/lib/wedding-plan';
import { Badge } from '@/components/chrome';
import {
  Alert,
  Body,
  Caption,
  Card,
  EmptyState,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

type Tab = 'all' | 'upcoming' | 'completed' | 'cancelled';

interface BuyerBooking {
  id: string;
  providerType?: 'vendor' | 'planner';
  providerId?: string;
  providerName?: string | null;
  serviceName?: string | null;
  offeringName?: string | null;
  status: string;
  eventDate?: string | null;
  eventName?: string | null;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const COMPLETED = new Set(['completed', 'completed_pending_final_payment']);
const CANCELLED = new Set(['cancelled', 'disputed']);
const UPCOMING = new Set([
  'requested',
  'quotation_sent',
  'quotation_accepted',
  'payment_pending',
  'pending',
  'confirmed',
  'in_progress',
]);

function statusTone(status: string): 'positive' | 'caution' | 'critical' | 'neutral' {
  if (status === 'confirmed' || status === 'completed') return 'positive';
  if (CANCELLED.has(status)) return 'critical';
  if (UPCOMING.has(status)) return 'caution';
  return 'neutral';
}

export default function PlanBookings() {
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () =>
      (await api.get('/bookings', { params: { limit: 100 } })).data as
        | { data?: BuyerBooking[] }
        | BuyerBooking[],
    retry: false,
  });

  const rows = useMemo(() => {
    const list: BuyerBooking[] = Array.isArray(query.data)
      ? query.data
      : (query.data?.data ?? []);
    return list.filter((row) => {
      if (tab === 'all') return true;
      if (tab === 'completed') return COMPLETED.has(row.status);
      if (tab === 'cancelled') return CANCELLED.has(row.status);
      return UPCOMING.has(row.status);
    });
  }, [query.data, tab]);

  return (
    <Screen>
      <SectionTitle>Bookings</SectionTitle>
      <Caption tone="muted">Requests and confirmed work with vendors and planners.</Caption>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
        {TABS.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={{
                paddingHorizontal: space(3),
                paddingVertical: space(1.5),
                borderRadius: 999,
                backgroundColor: active ? rgb(theme.brand) : rgb(theme.surfaceSunken),
              }}
            >
              <Caption
                style={{
                  color: active ? rgb(theme.brandFg) : rgb(theme.ink[700]),
                  fontWeight: '600',
                }}
              >
                {item.label}
              </Caption>
            </Pressable>
          );
        })}
      </View>

      {query.isPending ? (
        <Loading rows={3} />
      ) : query.error ? (
        <Alert tone="critical">{apiMessage(query.error, 'Bookings could not be loaded.')}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title="No bookings yet">
          Request a booking from a vendor or planner listing.
        </EmptyState>
      ) : (
        rows.map((row) => {
          const open = openId === row.id;
          return (
            <Card key={row.id} style={{ gap: space(2), borderRadius: 14 }}>
              <Pressable onPress={() => setOpenId(open ? null : row.id)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}>
                  <Body style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {row.providerName ?? row.serviceName ?? 'Booking'}
                  </Body>
                  <Badge tone={statusTone(row.status)}>
                    {humanise(row.status)}
                  </Badge>
                </View>
                <Caption tone="muted">
                  {[
                    row.serviceName || row.offeringName,
                    row.providerType ? categoryLabel(row.providerType) : null,
                    row.eventDate ? shortDate(row.eventDate) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Caption>
              </Pressable>
              {open ? (
                <View
                  style={{
                    gap: space(1.5),
                    paddingTop: space(2),
                    borderTopWidth: 1,
                    borderTopColor: rgb(theme.border),
                  }}
                >
                  {row.eventName ? <Caption>Event: {row.eventName}</Caption> : null}
                  <Caption>Status: {humanise(row.status)}</Caption>
                  {row.providerType === 'vendor' && row.providerId ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/vendors/[id]',
                          params: { id: row.providerId! },
                        })
                      }
                    >
                      <Caption tone="brand" style={{ fontWeight: '600' }}>
                        View vendor
                      </Caption>
                    </Pressable>
                  ) : null}
                  {row.providerType === 'planner' && row.providerId ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/planners/[id]',
                          params: { id: row.providerId! },
                        })
                      }
                    >
                      <Caption tone="brand" style={{ fontWeight: '600' }}>
                        View planner
                      </Caption>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
