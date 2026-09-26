import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api, apiMessage } from '@/lib/api';
import { humanise, rupees, shortDate } from '@/lib/format';
import { categoryLabel } from '@/lib/wedding-plan';
import { Badge } from '@/components/chrome';
import { BookingChat } from '@/components/bookings/chat';
import { BuyerMoneyPanel } from '@/components/bookings/buyer-money';
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
import { rgb, space, useTheme, radius } from '@/theme';

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
  amount?: string | null;
  currency?: string | null;
  paymentStatus?: string | null;
  cancellationReason?: string | null;
  deliveredAt?: string | null;
  deliveryAcceptedAt?: string | null;
  deliveryNotes?: string | null;
  collectedMilestones?: string[];
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
  const params = useLocalSearchParams<{ highlight?: string }>();
  const highlight = typeof params.highlight === 'string' ? params.highlight : undefined;
  const [tab, setTab] = useState<Tab>('all');
  const [openId, setOpenId] = useState<string | null>(highlight ?? null);

  useEffect(() => {
    if (highlight) setOpenId(highlight);
  }, [highlight]);

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
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <SectionTitle>Bookings</SectionTitle>
      <Caption tone="muted">
        Accept a quotation, pay instalments into escrow, then confirm delivery.
      </Caption>

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
                borderRadius: radius.md,
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
          const highlighted = highlight === row.id;
          return (
            <Card
              key={row.id}
              style={{
                gap: space(2),
                borderRadius: radius.md,
                ...(highlighted ? { borderWidth: 2, borderColor: rgb(theme.brand) } : null),
              }}
            >
              <Pressable onPress={() => setOpenId(open ? null : row.id)}>
                <View
                  style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}
                >
                  <Body style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {row.providerName ?? row.serviceName ?? 'Booking'}
                  </Body>
                  <Badge tone={statusTone(row.status)}>{humanise(row.status)}</Badge>
                </View>
                <Caption tone="muted">
                  {[
                    row.serviceName || row.offeringName,
                    row.providerType ? categoryLabel(row.providerType) : null,
                    row.eventDate ? shortDate(row.eventDate) : null,
                    row.amount != null && row.amount !== '' ? rupees(row.amount) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Caption>
                {row.paymentStatus ? (
                  <Caption tone="muted" style={{ marginTop: space(0.5) }}>
                    Payment: {humanise(row.paymentStatus)}
                  </Caption>
                ) : null}
                {row.status === 'payment_pending' ? (
                  <Caption tone="brand" style={{ marginTop: space(0.5), fontWeight: '600' }}>
                    Advance due — open to Pay Now
                  </Caption>
                ) : null}
                {row.status === 'completed_pending_final_payment' &&
                !(row.collectedMilestones ?? []).includes('final') ? (
                  <Caption tone="brand" style={{ marginTop: space(0.5), fontWeight: '600' }}>
                    Final payment due — open to Pay Now
                  </Caption>
                ) : null}
              </Pressable>
              {open ? (
                <View
                  style={{
                    gap: space(2),
                    paddingTop: space(2),
                    borderTopWidth: 1,
                    borderTopColor: rgb(theme.border),
                  }}
                >
                  {row.eventName ? <Caption>Event: {row.eventName}</Caption> : null}
                  {row.cancellationReason ? (
                    <Caption>Cancellation: {row.cancellationReason}</Caption>
                  ) : null}
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
                  <BuyerMoneyPanel booking={row} />
                  <BookingChat bookingId={row.id} />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
