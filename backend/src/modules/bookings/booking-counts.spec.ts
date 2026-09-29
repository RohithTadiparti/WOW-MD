import { BookingStatus } from '../../common/enums';
import { bookingCounts, PROVIDER_BOOKING_BUCKETS } from './booking-counts';

describe('booking counts', () => {
  const rows = Object.values(BookingStatus).map(status => ({ status, count: '1' }));
  it('partitions every persisted status into exactly one buyer tab', () => {
    const counts = bookingCounts(rows);
    expect(counts).toMatchObject({ all: rows.length, requested: 1, quotation: 2, payment: 2, confirmed: 1, in_progress: 2, completed: 1, cancelled: 1, disputed: 1 });
    expect(
      counts.requested + counts.quotation + counts.payment + counts.confirmed + counts.in_progress + counts.completed + counts.cancelled + counts.disputed,
    ).toBe(counts.all);
  });
  it('keeps the established provider groups without double counting exact statuses', () => {
    const counts = bookingCounts(rows, PROVIDER_BOOKING_BUCKETS);
    expect(counts).toMatchObject({ requests: 3, confirmed: 3, in_progress: 2, completed: 1, cancelled: 1, disputed: 1 });
    expect(counts.requests + counts.confirmed + counts.in_progress + counts.completed + counts.cancelled + counts.disputed).toBe(counts.all);
  });
  it('moves one confirmed booking into cancelled, preserving All', () => {
    expect(bookingCounts([{ status: BookingStatus.CONFIRMED, count: '1' }])).toMatchObject({ all: 1, confirmed: 1, cancelled: 0 });
    expect(bookingCounts([{ status: BookingStatus.CANCELLED, count: '1' }])).toMatchObject({ all: 1, confirmed: 0, cancelled: 1 });
  });
  it('counts cancelled and disputed separately instead of double-counting the cancelled bucket', () => {
    const counts = bookingCounts([
      { status: BookingStatus.CANCELLED, count: '1' },
      { status: BookingStatus.DISPUTED, count: '1' },
    ]);
    expect(counts).toMatchObject({ all: 2, cancelled: 1, disputed: 1 });
    expect(counts.cancelled + counts.disputed).toBe(counts.all);
  });
  it('returns zero counts for an empty account', () => {
    expect(bookingCounts([])).toMatchObject({ all: 0, requested: 0, quotation: 0, payment: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 });
  });
});
