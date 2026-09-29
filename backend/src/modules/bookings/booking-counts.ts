import { BookingStatus as S } from '../../common/enums';

/** Display buckets also drive list filtering; raw database statuses stay unchanged. */
export const BUYER_BOOKING_BUCKETS: Record<string, S[]> = {
  requested: [S.REQUESTED],
  quotation: [S.QUOTATION_SENT, S.QUOTATION_ACCEPTED],
  payment: [S.PAYMENT_PENDING, S.PENDING],
  confirmed: [S.CONFIRMED],
  in_progress: [S.IN_PROGRESS, S.COMPLETED_PENDING_FINAL_PAYMENT],
  completed: [S.COMPLETED],
  cancelled: [S.CANCELLED],
  disputed: [S.DISPUTED],
};
export const PROVIDER_BOOKING_BUCKETS: Record<string, S[]> = {
  ...BUYER_BOOKING_BUCKETS,
  requests: [S.REQUESTED, S.QUOTATION_SENT, S.QUOTATION_ACCEPTED],
  confirmed: [S.PAYMENT_PENDING, S.PENDING, S.CONFIRMED],
  cancelled: [S.CANCELLED],
  disputed: [S.DISPUTED],
};
export const ACTIVE_BOOKING_STATUSES = Object.values(S).filter(
  status => ![S.COMPLETED, S.CANCELLED, S.DISPUTED].includes(status),
);

export function bookingCounts(
  rows: { status: string; count: string }[],
  buckets = BUYER_BOOKING_BUCKETS,
): Record<string, number> & { all: number; active: number; cancelled: number; completed: number } {
  const raw: Record<string, number> = Object.fromEntries(Object.values(S).map(s => [s, 0]));
  for (const row of rows) raw[row.status] = Number(row.count);
  const sum = (statuses: string[]) => statuses.reduce((total, status) => total + (raw[status] ?? 0), 0);
  // Compute from raw counts, never add to an alias sharing the same name.
  return {
    ...raw,
    ...Object.fromEntries(Object.entries(buckets).map(([key, statuses]) => [key, sum(statuses)])),
    all: sum(Object.keys(raw)),
    active: sum(ACTIVE_BOOKING_STATUSES),
    cancelled: sum(BUYER_BOOKING_BUCKETS.cancelled),
    disputed: raw[S.DISPUTED],
    completed: raw[S.COMPLETED],
  };
}
