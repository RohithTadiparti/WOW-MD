import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/dates';
import { BOOKING_STATUS_LABEL } from '../lib/permissions';
import type { QuotationSummary } from '../lib/booking-progress';
import {
  BookingProgress,
  PaymentBreakdown,
  PriceBreakdown,
  QuotationHistory,
  Row,
  Section,
  useBookingSummary,
} from './BookingSummary';

/**
 * Everything about one booking, behind the fold.
 *
 * The row above it carries what the next decision is made on. This is the rest
 * of the record (EZ1-I252): where the job is on its way to completion, the
 * customer, the event and the service, what the customer hoped to spend against
 * what was agreed and what the add-ons came to, every quotation and what became
 * of it, and where every rupee sits (EZ1-I264, EZ1-I265).
 *
 * Cards in the order the questions get asked — who and what for, what was
 * sold, what else was asked for, what it costs, where the money is — and the
 * same order in the app (EZ1-I260).
 *
 * Nothing is repeated from the row above: the customer's contact, the guest
 * count, their requirements and note are all on the row already.
 *
 * Every figure is read live from the booking summary, which both portals share.
 */
interface DetailBooking {
  id: string;
  status: string;
  eventDate: string | null;
  clientName: string | null;
  eventName: string | null;
  eventVenue: string | null;
  eventCity: string | null;
  serviceName: string | null;
  offeringName?: string | null;
  quantity?: number | null;
  quotation?: QuotationSummary | null;
}

type HistoryEvent = { at: string; label: string; detail: string | null };

export default function BookingDetail({
  booking,
  extras,
}: {
  booking: DetailBooking;
  /** What else belongs to this booking — the form answers, the brief, the
   *  add-ons — placed between what was sold and what it costs. */
  extras?: React.ReactNode;
}) {
  const [showTimeline, setShowTimeline] = useState(false);
  const summary = useBookingSummary(booking.id);

  const history = useQuery({
    queryKey: ['booking-history', booking.id],
    queryFn: async () => (await api.get(`/bookings/${booking.id}/history`)).data as HistoryEvent[],
    enabled: showTimeline,
    retry: false,
  });

  return (
    <div className="mt-2 space-y-3 border-t border-gray-200 pt-2 text-xs">
      <Section title="Progress">
        <div className="sm:col-span-2">
          <BookingProgress
            status={booking.status}
            quotation={summary.data?.quotation ?? booking.quotation}
          />
        </div>
      </Section>

      <Section title="Booking">
        <Row label="Booking ID">
          <span className="font-mono">{booking.id}</span>
        </Row>
        <Row label="Status">{BOOKING_STATUS_LABEL[booking.status] ?? booking.status}</Row>
        <Row label="Customer">{booking.clientName ?? 'Customer'}</Row>
        <Row label="Event">{booking.eventName ?? 'Not linked to an event'}</Row>
        <Row label="Date">{formatDate(booking.eventDate)}</Row>
        <Row label="Venue">
          {[booking.eventVenue, booking.eventCity].filter(Boolean).join(', ') || 'Not given'}
        </Row>
      </Section>

      <Section title="Service">
        <Row label="Service">{booking.serviceName ?? 'No service chosen'}</Row>
        {booking.offeringName && <Row label="Package">{booking.offeringName}</Row>}
        {booking.quantity ? <Row label="Quantity">{booking.quantity}</Row> : null}
      </Section>

      {extras}

      {summary.isError && (
        <p className="text-gray-500">The price and payment detail could not be loaded.</p>
      )}
      {summary.data && (
        <>
          <PriceBreakdown summary={summary.data} />
          <QuotationHistory summary={summary.data} />
          <PaymentBreakdown summary={summary.data} />
        </>
      )}

      {showTimeline && history.data && history.data.length > 0 && (
        <Section title="Timeline">
          <ol className="space-y-1 sm:col-span-2">
            {history.data.map((event, index) => (
              <li key={`${event.at}-${index}`}>
                <span className="text-gray-700">{event.label}</span>
                <span className="text-gray-400">
                  {' · '}
                  {[formatDateTime(event.at), event.detail].filter(Boolean).join(' · ')}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <button
        type="button"
        className="btn-ghost btn-sm"
        aria-expanded={showTimeline}
        onClick={() => setShowTimeline((open) => !open)}
      >
        {showTimeline ? 'Hide timeline' : 'Timeline'}
      </button>
    </div>
  );
}
