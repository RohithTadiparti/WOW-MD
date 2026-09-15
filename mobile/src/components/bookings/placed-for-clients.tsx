import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import { SELLER_STATUS_LABEL } from '@/lib/bookings';
import { BOOKING_STATUS_LABEL } from '@/shared/permissions';
import { Divider } from '@/components/chrome';
import { Body, Caption, Card, SectionTitle } from '@/components/ui';
import { space } from '@/theme';

export interface PlacedBooking {
  bookingId: string;
  clientUserId: string;
  clientName: string;
  name: string;
  category: string;
  service: string | null;
  package: string | null;
  status: string;
  paymentStatus: string | null;
  amount: string;
  currency: string;
  eventDate: string | null;
  createdAt: string;
}

export function usePlacedForClients(enabled = true) {
  return useQuery({
    queryKey: ['planner-bookings-placed'],
    queryFn: async () => (await api.get('/planner/bookings-placed')).data as PlacedBooking[],
    enabled,
    retry: false,
    refetchInterval: 30_000,
  });
}

const statusLabel = (status: string) =>
  BOOKING_STATUS_LABEL[status] ?? SELLER_STATUS_LABEL[status] ?? status.replace(/_/g, ' ');

/**
 * The vendors a planner has asked on their clients' behalf (EZ1-I235).
 *
 * Those bookings belong to the couples, so the queue below — the work coming
 * in against the planner's own agency — never contained them, and a planner who
 * had just booked a vendor could not see which one. The same list the web
 * Bookings page shows.
 */
export function PlacedForClients() {
  const { data, isPending, isError } = usePlacedForClients();
  if (isPending) return null;

  return (
    <Card>
      <SectionTitle>Booked for your clients</SectionTitle>
      <Caption tone="faint">
        Vendors you asked on a couple’s behalf. The booking is theirs; the couple sees it too.
      </Caption>
      {isError ? (
        <Caption tone="muted">These bookings could not be loaded.</Caption>
      ) : !data || data.length === 0 ? (
        <Caption tone="muted">
          Nothing yet. Requests you place for a client from the Vendors page appear here.
        </Caption>
      ) : (
        data.map((b, index) => (
          <View key={b.bookingId} style={{ gap: space(0.5) }}>
            {index > 0 ? <Divider /> : null}
            <Body numberOfLines={2}>{`${b.name} · for ${b.clientName}`}</Body>
            <Caption tone="faint" numberOfLines={2}>
              {[b.category.replace(/_/g, ' '), b.service, b.package, b.eventDate ? shortDate(b.eventDate) : null]
                .filter(Boolean)
                .join(' · ')}
            </Caption>
            <Caption>
              {[
                Number(b.amount) > 0
                  ? money(b.amount, b.currency)
                  : b.status === 'quotation_sent'
                    ? 'Quotation with the couple'
                    : 'Awaiting a quotation',
                statusLabel(b.status),
                `asked ${shortDate(b.createdAt)}`,
              ].join(' · ')}
            </Caption>
          </View>
        ))
      )}
    </Card>
  );
}
