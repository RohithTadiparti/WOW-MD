import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { SELLER_STATUS_LABEL, type IncomingBooking } from '@/lib/bookings';
import { dateTime, shortDate } from '@/lib/format';
import { formatAnswer, type FieldSpec } from '@/shared/dynamic-form';
import { BOOKING_STATUS_LABEL, Permission, can } from '@/shared/permissions';
import { usePlacedForClients } from '@/components/bookings/placed-for-clients';
import { useAuth } from '@/store/auth';
import { DetailGrid, DetailRow, Divider } from '@/components/chrome';
import { VendorAddOns } from '@/components/bookings/addons';
import {
  BookingProgress,
  PaymentBreakdown,
  PriceBreakdown,
  QuotationHistory,
  Section,
  useBookingSummary,
} from '@/components/bookings/summary';
import { Button, Caption } from '@/components/ui';
import { space } from '@/theme';

/**
 * Everything about one booking, behind the fold.
 *
 * The card above it carries what the next decision is made on. This is the rest
 * of the record (EZ1-I252): where the job is on its way to completion, the
 * customer, the event and the service, what the customer hoped to spend against
 * what was agreed and what the add-ons came to, every quotation and what became
 * of it, and where every rupee sits (EZ1-I264, EZ1-I265).
 *
 * The same order as the web portal, because a provider who has looked a
 * booking up on one should not have to learn the other (EZ1-I260). Then the
 * thread with the customer, which the card puts underneath.
 *
 * Nothing is repeated from the card above: the customer's contact, the guest
 * count, their requirements and note are all on it already.
 */
type HistoryEvent = { at: string; label: string; detail: string | null };

export function BookingDetail({ booking }: { booking: IncomingBooking }) {
  const [showTimeline, setShowTimeline] = useState(false);
  const summary = useBookingSummary(booking.id);
  // A planner books vendors for the couples who hired them, and those are the
  // couple's bookings rather than rows in this queue — so they are named on the
  // couple's booking with the planner, where the planner looks for them.
  const permissions = useAuth((s) => s.user?.permissions ?? []);
  const isPlanner = can(permissions, Permission.BOOKING_REQUEST_FOR_CLIENT);
  const placed = usePlacedForClients(isPlanner);
  const vendorsForClient = (placed.data ?? []).filter((v) => v.clientUserId === booking.userId);

  const history = useQuery({
    queryKey: ['booking-history', booking.id],
    queryFn: async () => (await api.get(`/bookings/${booking.id}/history`)).data as HistoryEvent[],
    enabled: showTimeline,
    retry: false,
  });

  return (
    <View style={{ gap: space(3) }}>
      <Section title="Progress">
        <BookingProgress
          status={booking.status}
          quotation={summary.data?.quotation ?? booking.quotation}
        />
      </Section>

      <Section title="Booking">
        <DetailGrid>
          <DetailRow label="Booking ID">{booking.id}</DetailRow>
          <DetailRow label="Status">
            {SELLER_STATUS_LABEL[booking.status] ?? booking.status.replace(/_/g, ' ')}
          </DetailRow>
          <DetailRow label="Customer">{booking.clientName ?? 'Customer'}</DetailRow>
          {booking.providerName ? (
            <DetailRow label="Booked with">{booking.providerName}</DetailRow>
          ) : null}
          {isPlanner ? (
            <DetailRow label="Vendors booked">
              {vendorsForClient.length === 0
                ? 'None for this client yet'
                : vendorsForClient
                    .map((v) => `${v.name} (${BOOKING_STATUS_LABEL[v.status] ?? v.status.replace(/_/g, ' ')})`)
                    .join(', ')}
            </DetailRow>
          ) : null}
          <DetailRow label="Event">{booking.eventName ?? 'Not linked to an event'}</DetailRow>
          <DetailRow label="Date">{shortDate(booking.eventDate)}</DetailRow>
          <DetailRow label="Venue">
            {[booking.eventVenue, booking.eventCity].filter(Boolean).join(', ') || 'Not given'}
          </DetailRow>
        </DetailGrid>
      </Section>

      <Section title="Service">
        <DetailGrid>
          <DetailRow label="Service">{booking.serviceName ?? 'No service chosen'}</DetailRow>
          {booking.offeringName ? (
            <DetailRow label="Package">{booking.offeringName}</DetailRow>
          ) : null}
          {booking.quantity ? <DetailRow label="Quantity">{String(booking.quantity)}</DetailRow> : null}
        </DetailGrid>
        <ServiceAnswers booking={booking} />
      </Section>

      {/* The extras the customer asked for after the quotation: what they
          asked for, what they offered, what the vendor answered. */}
      <VendorAddOns bookingId={booking.id} />

      {summary.isError ? (
        <Caption tone="muted">The price and payment detail could not be loaded.</Caption>
      ) : null}
      {summary.data ? (
        <>
          <PriceBreakdown summary={summary.data} />
          <QuotationHistory summary={summary.data} />
          <PaymentBreakdown summary={summary.data} />
        </>
      ) : null}

      {showTimeline && history.data && history.data.length > 0 ? (
        <Section title="Timeline">
          {history.data.map((event, index) => (
            <View key={`${event.at}-${index}`} style={{ gap: space(0.5) }}>
              {index > 0 ? <Divider /> : null}
              <Caption>{event.label}</Caption>
              <Caption tone="faint">
                {[dateTime(event.at), event.detail].filter(Boolean).join(' · ')}
              </Caption>
            </View>
          ))}
        </Section>
      ) : null}

      <Button
        label={showTimeline ? 'Hide timeline' : 'Timeline'}
        variant="ghost"
        small
        onPress={() => setShowTimeline((open) => !open)}
      />
    </View>
  );
}

/**
 * What the buyer answered on this service's own form.
 *
 * Fetched per service rather than stored on the booking, so a label an
 * administrator has since reworded reads correctly on an old request.
 */
function ServiceAnswers({ booking }: { booking: IncomingBooking }) {
  const answers = booking.serviceAnswers ?? {};
  const hasAnswers = Object.keys(answers).length > 0;

  const { data, isError } = useQuery<{ bookingForm: FieldSpec[] }>({
    queryKey: ['service-booking-form', booking.vendorServiceId],
    queryFn: async () => (await api.get(`/services/${booking.vendorServiceId}/booking-form`)).data,
    enabled: Boolean(booking.vendorServiceId) && hasAnswers,
    retry: false,
  });

  if (!hasAnswers) return null;
  const fields = data?.bookingForm ?? [];
  // Said rather than rendered as nothing: the answers are on the booking and
  // the labels for them are not, so a failure here would read as a customer
  // who filled nothing in.
  if (isError || (data && fields.length === 0)) {
    return <Caption tone="muted">The customer’s answers could not be loaded for this service.</Caption>;
  }
  if (fields.length === 0) return null;

  return (
    <DetailGrid>
      {fields
        .filter((field) => answers[field.key] !== undefined)
        .map((field) => (
          <DetailRow key={field.key} label={field.label}>
            {formatAnswer(field, answers[field.key])}
          </DetailRow>
        ))}
    </DetailGrid>
  );
}
