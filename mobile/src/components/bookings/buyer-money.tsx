import { useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { PAYMENT_LABEL, PAYMENT_TONE } from '@/lib/bookings';
import { money } from '@/lib/format';
import { MILESTONE_LABEL, Permission, can } from '@/shared/permissions';
import { useAuth } from '@/store/auth';
import { Badge } from '@/components/chrome';
import { Alert as UiAlert, Body, Button, Caption, Field } from '@/components/ui';
import { rgb, space, useTheme, radius } from '@/theme';
import { Txt } from '@/theme/fonts';

type MilestoneKey = 'advance' | 'second' | 'final';

const PAYABLE_AT: Record<MilestoneKey, string[]> = {
  advance: ['payment_pending'],
  second: ['in_progress'],
  final: ['completed_pending_final_payment'],
};

const WAITING_ON: Record<MilestoneKey, string> = {
  advance: 'Waiting on the provider to accept the job',
  second: 'Due once they start the work',
  final: 'Due once they mark it delivered',
};

const CANCELABLE = new Set([
  'requested',
  'quotation_sent',
  'quotation_accepted',
  'payment_pending',
  'pending',
  'confirmed',
  'in_progress',
]);

const DISPUTABLE = new Set([
  'confirmed',
  'in_progress',
  'completed_pending_final_payment',
  'completed',
]);

const METHOD_LABEL: Record<string, string> = {
  card: 'Card',
  upi: 'UPI',
  netbanking: 'Net banking',
  cash: 'Cash',
};

interface MilestoneRow {
  milestone: MilestoneKey;
  amount: string;
  status: string | null;
  paymentId: string | null;
}

interface MilestonesPayload {
  bookingId: string;
  total: string;
  currency: string;
  milestones: MilestoneRow[];
}

interface QuotationRow {
  id: string;
  amount: string;
  currency: string;
  status: string;
  notes: string | null;
}

interface PaymentMethods {
  methods: string[];
  cash: { enabled: boolean; maxAmount: number };
}

export interface BuyerMoneyBooking {
  id: string;
  status: string;
  amount?: string | null;
  currency?: string | null;
  deliveredAt?: string | null;
  deliveryAcceptedAt?: string | null;
  deliveryNotes?: string | null;
}

function invalidateMoney(qc: ReturnType<typeof useQueryClient>, bookingId: string) {
  for (const key of [
    'my-bookings',
    'escrow',
    'booking-summary',
    'booking-history',
    'earnings',
    'incoming-bookings',
  ]) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
  void qc.invalidateQueries({ queryKey: ['buyer-milestones', bookingId] });
  void qc.invalidateQueries({ queryKey: ['buyer-quotations', bookingId] });
  void qc.invalidateQueries({ queryKey: ['booking-summary', bookingId] });
}

export function BuyerMoneyPanel({ booking }: { booking: BuyerMoneyBooking }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const permissions = useAuth((s) => s.user?.permissions ?? []);
  const canPay = can(permissions, Permission.BOOKING_PAY);
  const canRaiseCase = can(permissions, Permission.CASE_RAISE);

  const [method, setMethod] = useState('card');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [disputeTitle, setDisputeTitle] = useState('');
  const [disputeBody, setDisputeBody] = useState('');
  const payKeyRef = useRef<string | null>(null);
  const terminal = booking.status === 'cancelled' || booking.status === 'disputed';

  const methodsQuery = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => (await api.get('/payments/methods')).data as PaymentMethods,
    staleTime: 10 * 60_000,
    retry: false,
    enabled: canPay,
  });

  const milestonesQuery = useQuery({
    queryKey: ['buyer-milestones', booking.id],
    queryFn: async () =>
      (await api.get(`/bookings/${booking.id}/milestones`)).data as MilestonesPayload,
    retry: false,
  });

  const quotationsQuery = useQuery({
    queryKey: ['buyer-quotations', booking.id],
    queryFn: async () =>
      (await api.get(`/bookings/${booking.id}/quotations`)).data as QuotationRow[],
    retry: false,
  });

  const act = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => {
      setError('');
      setNotice('');
      return fn();
    },
    onSuccess: (result) => {
      invalidateMoney(qc, booking.id);
      setShowCancel(false);
      setCancelReason('');
      setShowDispute(false);
      setDisputeTitle('');
      setDisputeBody('');
      payKeyRef.current = null;
      const payment = (result as { data?: { payment?: { status?: string; amount?: string; method?: string } } })
        ?.data?.payment;
      if (payment?.status === 'held_in_escrow') {
        setNotice(
          `Payment confirmed. ${money(payment.amount ?? '0', booking.currency ?? 'INR')} is held in escrow.`,
        );
      } else if (payment?.status === 'released' && payment.method === 'cash') {
        setNotice('Cash payment recorded. It was not held in escrow.');
      } else if (payment?.status === 'failed') {
        setError('Payment failed. Nothing was held in escrow.');
      } else if (payment?.status === 'initiated') {
        setNotice('Payment is processing. Escrow will update when the payment is confirmed.');
      }
    },
    onError: (err) => {
      setError(apiMessage(err, 'That action could not be completed.'));
    },
  });

  const availableMethods = methodsQuery.data?.methods?.length
    ? methodsQuery.data.methods
    : ['card'];
  const activeMethod = availableMethods.includes(method) ? method : availableMethods[0]!;
  const milestones = milestonesQuery.data?.milestones ?? [];
  const currency = milestonesQuery.data?.currency ?? booking.currency ?? 'INR';
  const paid = new Set(
    milestones
      .filter((m) => m.status && m.status !== 'refunded' && m.status !== 'failed')
      .map((m) => m.milestone),
  );
  const nextDue = milestones.find((m) => !paid.has(m.milestone));
  const dueNow =
    nextDue && PAYABLE_AT[nextDue.milestone]?.includes(booking.status)
      ? nextDue.milestone
      : null;
  const liveQuote = (quotationsQuery.data ?? []).find((q) => q.status === 'sent');
  const busy = act.isPending;

  function run(fn: () => Promise<unknown>) {
    if (busy) return;
    act.mutate(fn);
  }

  function pay(milestone: MilestoneKey, amount: string) {
    if (busy || terminal) return;
    const cashCap = methodsQuery.data?.cash?.maxAmount;
    if (
      activeMethod === 'cash' &&
      cashCap != null &&
      Number.isFinite(cashCap) &&
      cashCap > 0 &&
      Number(amount) > cashCap
    ) {
      setError(
        `Cash is limited to ${currency} ${cashCap} per instalment because it is not held in escrow.`,
      );
      return;
    }
    const label = MILESTONE_LABEL[milestone] ?? milestone;
    const total = milestonesQuery.data?.total ?? booking.amount;
    Alert.alert(
      'Confirm payment',
      [
        total ? `Booking total ${money(total, currency)}.` : null,
        `Pay ${money(amount, currency)} for ${label} now via ${METHOD_LABEL[activeMethod] ?? activeMethod}?`,
        activeMethod === 'cash'
          ? 'Cash is not held in escrow.'
          : 'Online payment is held in escrow until delivery is accepted.',
      ]
        .filter(Boolean)
        .join('\n\n'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: () => {
            if (!payKeyRef.current) {
              payKeyRef.current = `pay-${booking.id}-${milestone}-${Date.now()}`;
            }
            const key = payKeyRef.current;
            run(() =>
              api.put(
                `/bookings/${booking.id}/pay`,
                { milestone, method: activeMethod },
                { headers: { 'Idempotency-Key': key } },
              ),
            );
          },
        },
      ],
    );
  }

  return (
    <View style={{ gap: space(3) }}>
      {error ? <UiAlert tone="critical">{error}</UiAlert> : null}
      {notice ? <UiAlert tone="positive">{notice}</UiAlert> : null}

      {(quotationsQuery.data?.length ?? 0) > 0 ? (
        <View style={{ gap: space(2) }}>
          <Caption style={{ fontWeight: '700', textTransform: 'uppercase' }}>Quotations</Caption>
          {(quotationsQuery.data ?? []).slice(0, 4).map((q) => (
            <View
              key={q.id}
              style={{
                gap: space(1),
                padding: space(2),
                borderRadius: radius.md,
                backgroundColor: rgb(theme.surfaceSunken),
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space(2) }}>
                <Body style={{ fontWeight: '600' }}>{money(q.amount, q.currency)}</Body>
                <Badge
                  tone={
                    q.status === 'accepted' ? 'positive' : q.status === 'sent' ? 'brand' : 'neutral'
                  }
                >
                  {q.status.replace(/_/g, ' ')}
                </Badge>
              </View>
              {q.notes ? <Caption tone="muted">{q.notes}</Caption> : null}
              {liveQuote?.id === q.id && canPay && !terminal ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: space(2),
                    marginTop: space(1),
                  }}
                >
                  <Button
                    label="Accept quotation"
                    small
                    busy={busy}
                    disabled={busy}
                    onPress={() => run(() => api.put(`/bookings/quotations/${q.id}/accept`, {}))}
                  />
                  <Button
                    label="Ask to re-quote"
                    variant="outline"
                    small
                    busy={busy}
                    disabled={busy}
                    onPress={() => run(() => api.put(`/bookings/quotations/${q.id}/reject`, {}))}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: space(2) }}>
        <Caption style={{ fontWeight: '700', textTransform: 'uppercase' }}>Instalments</Caption>
        <Caption tone="muted">
          Paid in order. Online payments are held in escrow until delivery is accepted.
        </Caption>
        {milestonesQuery.isPending ? (
          <Caption tone="muted">Loading instalments…</Caption>
        ) : milestonesQuery.isError ? (
          <UiAlert tone="critical">
            {apiMessage(milestonesQuery.error, 'Instalments could not be loaded.')}
          </UiAlert>
        ) : Number(booking.amount ?? milestonesQuery.data?.total ?? 0) <= 0 ? (
          <Caption tone="muted">Instalments appear once you accept a quotation.</Caption>
        ) : (
          <>
            {milestonesQuery.data?.total ? (
              <Caption>
                Booking total{' '}
                <Txt style={{ fontWeight: '600' }}>
                  {money(milestonesQuery.data.total, currency)}
                </Txt>
              </Caption>
            ) : null}
            {milestones.map((m) => {
            const isDue = canPay && !terminal && dueNow === m.milestone;
            return (
              <View
                key={m.milestone}
                style={{
                  gap: space(1.5),
                  paddingVertical: space(1.5),
                  borderBottomWidth: 1,
                  borderBottomColor: rgb(theme.border),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                  <Caption style={{ flex: 1, fontWeight: '600' }}>
                    {MILESTONE_LABEL[m.milestone] ?? m.milestone}
                  </Caption>
                  <Caption style={{ fontVariant: ['tabular-nums'] }}>
                    {money(m.amount, currency)}
                  </Caption>
                  {m.status ? (
                    <Badge tone={PAYMENT_TONE[m.status] ?? 'neutral'}>
                      {PAYMENT_LABEL[m.status] ?? m.status.replace(/_/g, ' ')}
                    </Badge>
                  ) : (
                    <Caption tone="faint">
                      {nextDue?.milestone === m.milestone
                        ? WAITING_ON[m.milestone]
                        : 'Not due yet'}
                    </Caption>
                  )}
                </View>
                {isDue ? (
                  <View style={{ gap: space(1.5) }}>
                    <Caption tone="muted">
                      Payable now: {money(m.amount, currency)}
                      {activeMethod !== 'cash' ? ' · held in escrow after confirmation' : ''}
                    </Caption>
                    {availableMethods.length > 1 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) }}>
                        {availableMethods.map((mth) => {
                          const active = activeMethod === mth;
                          return (
                            <Pressable
                              key={mth}
                              disabled={busy}
                              onPress={() => setMethod(mth)}
                              style={{
                                paddingHorizontal: space(2.5),
                                paddingVertical: space(1),
                                borderRadius: radius.md,
                                borderWidth: 1,
                                borderColor: active ? rgb(theme.brand) : rgb(theme.border),
                                backgroundColor: active ? rgb(theme.brandSoft) : 'transparent',
                              }}
                            >
                              <Caption
                                tone={active ? 'brand' : 'default'}
                                style={{ fontWeight: '600' }}
                              >
                                {METHOD_LABEL[mth] ?? mth}
                              </Caption>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                    {activeMethod === 'cash' ? (
                      <Caption tone="critical">
                        Cash is paid directly to the provider and is not held in escrow.
                      </Caption>
                    ) : null}
                    <Button
                      label={
                        busy
                          ? 'Paying…'
                          : `Pay Now · ${money(m.amount, currency)}`
                      }
                      small
                      busy={busy}
                      disabled={busy}
                      onPress={() => pay(m.milestone, m.amount)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          </>
        )}
      </View>

      {!terminal && booking.deliveredAt && !booking.deliveryAcceptedAt ? (
        <View style={{ gap: space(1.5) }}>
          {booking.deliveryNotes ? (
            <Caption>
              <Caption tone="faint">What was delivered: </Caption>
              {booking.deliveryNotes}
            </Caption>
          ) : null}
          <Button
            label="Accept delivery"
            small
            busy={busy}
            disabled={busy}
            onPress={() => run(() => api.put(`/bookings/${booking.id}/confirm-delivery`, {}))}
          />
          <Caption tone="muted">
            Confirming delivery lets held escrow move to the provider.
          </Caption>
        </View>
      ) : null}

      {!terminal && CANCELABLE.has(booking.status) ? (
        <View style={{ gap: space(1.5) }}>
          {!showCancel ? (
            <Button
              label="Cancel booking"
              variant="outline"
              small
              disabled={busy}
              onPress={() => {
                setError('');
                setShowCancel(true);
              }}
            />
          ) : (
            <View style={{ gap: space(2) }}>
              <Caption tone="muted">
                {Number(booking.amount) > 0
                  ? 'Anything held in escrow is returned if the refund is confirmed. This cannot be undone.'
                  : 'The provider will be told you no longer need them.'}
              </Caption>
              <Field
                label="Reason (optional)"
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Let them know why"
                maxLength={500}
                editable={!busy}
              />
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                <Button
                  label="Keep booking"
                  variant="ghost"
                  small
                  disabled={busy}
                  onPress={() => setShowCancel(false)}
                />
                <Button
                  label="Confirm cancellation"
                  small
                  busy={busy}
                  disabled={busy}
                  onPress={() =>
                    run(() =>
                      api.put(`/bookings/${booking.id}/cancel`, {
                        ...(cancelReason.trim() ? { reason: cancelReason.trim() } : {}),
                      }),
                    )
                  }
                />
              </View>
            </View>
          )}
        </View>
      ) : null}

      {!terminal && canRaiseCase && DISPUTABLE.has(booking.status) ? (
        <View style={{ gap: space(1.5) }}>
          {!showDispute ? (
            <Button
              label="Raise an issue"
              variant="outline"
              small
              disabled={busy}
              onPress={() => {
                setError('');
                setShowDispute(true);
              }}
            />
          ) : (
            <View style={{ gap: space(2) }}>
              <Caption tone="muted">
                Held escrow stays frozen until an officer settles the case.
              </Caption>
              <Field
                label="In one line"
                value={disputeTitle}
                onChangeText={setDisputeTitle}
                placeholder="What went wrong"
                maxLength={120}
                editable={!busy}
              />
              <Field
                label="Full story"
                value={disputeBody}
                onChangeText={setDisputeBody}
                placeholder="Describe what happened"
                multiline
                numberOfLines={4}
                style={{ minHeight: 88, textAlignVertical: 'top' }}
                editable={!busy}
              />
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                <Button
                  label="Never mind"
                  variant="ghost"
                  small
                  disabled={busy}
                  onPress={() => setShowDispute(false)}
                />
                <Button
                  label="Submit issue"
                  small
                  busy={busy}
                  disabled={
                    busy || disputeTitle.trim().length < 5 || disputeBody.trim().length < 10
                  }
                  onPress={() => {
                    if (disputeTitle.trim().length < 5 || disputeBody.trim().length < 10) {
                      Alert.alert(
                        'More detail needed',
                        'Add a short title and a fuller description before submitting.',
                      );
                      return;
                    }
                    run(() =>
                      api.post('/verification/cases', {
                        subjectType: 'booking',
                        subjectId: booking.id,
                        title: disputeTitle.trim(),
                        description: disputeBody.trim(),
                      }),
                    );
                  }}
                />
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
