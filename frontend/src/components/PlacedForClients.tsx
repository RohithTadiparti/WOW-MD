import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate } from '../lib/dates';
import { BOOKING_STATUS_LABEL } from '../lib/permissions';

interface PlacedBooking {
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

/**
 * The vendors a planner has asked on their clients' behalf (EZ1-I235).
 *
 * Those bookings belong to the couples, so the planner's own queue below — the
 * work coming in against their agency — never contained them, and a planner who
 * had just booked a vendor could not see which one. Each row opens the client,
 * where the booking is followed.
 */
export default function PlacedForClients() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['planner-bookings-placed'],
    queryFn: async () => (await api.get('/planner/bookings-placed')).data as PlacedBooking[],
    retry: false,
    refetchInterval: 30_000,
  });

  if (isPending) return null;

  return (
    <section className="card">
      <h2 className="section-title">Booked for your clients</h2>
      <p className="mt-0.5 text-sm text-gray-500">
        Vendors you asked on a couple’s behalf. The booking is theirs — open the client to follow
        it.
      </p>
      {isError ? (
        <p className="mt-2 text-sm text-gray-500">These bookings could not be loaded.</p>
      ) : !data || data.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          Nothing yet. Requests you place from the Vendors page for a client appear here.
        </p>
      ) : (
        <ul className="mt-2 divide-y">
          {data.map((b) => (
            <li key={b.bookingId}>
              <Link
                to={`/my-clients/${b.clientUserId}#vendors`}
                className="flex flex-wrap items-start justify-between gap-2 py-2 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {b.name}
                    <span className="font-normal text-gray-500"> · for {b.clientName}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="capitalize">{b.category.replace(/_/g, ' ')}</span>
                    {[b.service, b.package, b.eventDate ? formatDate(b.eventDate) : null]
                      .filter(Boolean)
                      .map((part) => ` · ${part}`)
                      .join('')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {Number(b.amount) > 0
                      ? `${b.currency} ${Number(b.amount).toLocaleString('en-IN')}`
                      : b.status === 'quotation_sent'
                        ? 'Quotation with the couple'
                        : 'Awaiting a quotation'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {BOOKING_STATUS_LABEL[b.status] ?? b.status.replace(/_/g, ' ')}
                    {b.paymentStatus ? ` · ${b.paymentStatus.replace(/_/g, ' ')}` : ''}
                    {` · asked ${formatDate(b.createdAt)}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
