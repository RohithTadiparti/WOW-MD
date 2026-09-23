import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { MILESTONE_LABEL, Permission, can } from '../lib/permissions';
import { paymentStatusLabel } from '../lib/labels';
import { Loading } from '../components/ui/Feedback';
import PayoutAccount from '../components/PayoutAccount';
import { useAuth } from '../store/auth';
import { useBusinesses } from '../store/business';

const maskAccountId = (value: string | null | undefined) => {
  if (!value) return 'Not configured';
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
};

interface LedgerRow {
  paymentId: string;
  bookingId: string;
  milestone: string;
  status: string;
  amount: string;
  commissionAmount: string;
  payoutAmount: string;
  confirmedAt: string | null;
  createdAt: string;
  /** Who the booking was for and what was sold, when the server names them. */
  clientName?: string | null;
  serviceName?: string | null;
}

interface Earnings {
  heldInEscrow: string;
  /** Earned and owed, but not yet transferred — usually payout onboarding. */
  pendingPayout: string;
  released: string;
  refunded: string;
  commission: string;
  gross: string;
  currency: string;
  ledger: LedgerRow[];
}

const STATUS_STYLE: Record<string, string> = {
  initiated: 'bg-gray-100 text-gray-600',
  held_in_escrow: 'bg-amber-50 text-amber-800',
  disputed: 'bg-red-50 text-red-700',
  released: 'bg-emerald-50 text-emerald-800',
  refunded: 'bg-gray-100 text-gray-500',
  partially_settled: 'bg-sky-50 text-sky-800',
};

/**
 * The provider's money.
 *
 * Held and paid out are shown as separate figures because they answer different
 * questions: one is what the marketplace owes them, the other is what has
 * already reached their bank. Adding them together would flatter the balance
 * and mislead somebody deciding whether they can pay their own suppliers.
 */
export default function Accounts() {
  const navigate = useNavigate();
  const permissions = useAuth((s) => s.user?.permissions ?? []);
  const isVendor = can(permissions, Permission.VENDOR_LISTING_MANAGE);
  /*
   * A planner is a provider too, and took bookings, and was shown the figure
   * this page calls "Owed to you -- waiting on a payout account to send it
   * to" with no control anywhere that could supply one. The column and the
   * read had always existed; only the way in was missing, so every completed
   * planner booking stayed at PENDING_PAYOUT (council round 2).
   */
  const isPlanner = can(permissions, Permission.PLANNER_LISTING_MANAGE);
  const { activeId } = useBusinesses();

  const [payoutVerified, setPayoutVerified] = useState(false);

  const { data, isLoading } = useQuery<Earnings>({
    queryKey: ['earnings'],
    queryFn: async () => (await api.get('/bookings/earnings')).data,
  });

  // The provider's payout account lives here now, not in My Business (EZ1-I100).
  const { data: payout } = useQuery<{ payoutAccountId: string | null } | null>({
    queryKey: ['payout-account', isPlanner ? 'planner' : activeId],
    enabled: (isVendor && Boolean(activeId)) || isPlanner,
    queryFn: async () => {
      if (isPlanner) {
        return (await api.get('/wedding-planners/me')).data as { payoutAccountId: string | null };
      }
      const listings = (await api.get('/vendors/me')).data as { id: string; payoutAccountId: string | null }[];
      return listings.find((l) => l.id === activeId) ?? null;
    },
    retry: false,
  });

  const money = (value: string) =>
    `${data?.currency === 'INR' ? '₹' : ''}${Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
    })}`;

  const availableBalance = Number(data?.pendingPayout ?? '0');
  const escrowRows = useMemo(
    () => (data?.ledger ?? []).filter((row) => ['held_in_escrow', 'disputed'].includes(row.status)),
    [data?.ledger],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Accounts</h1>
        <p className="page-subtitle">
          Every rupee that has moved through your bookings, and where it currently sits.
        </p>
      </div>

      {isVendor && activeId && (
        <PayoutAccount
          endpoint={`/vendors/${activeId}/payout-account`}
          current={payout?.payoutAccountId ?? null}
          onStatusChange={setPayoutVerified}
        />
      )}
      {isPlanner && (
        <PayoutAccount
          endpoint="/wedding-planners/me/payout-account"
          current={payout?.payoutAccountId ?? null}
          onStatusChange={setPayoutVerified}
        />
      )}

      {isLoading && <Loading rows={3} />}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Figure label="Total earned" value={money(data.gross)} tone="text-brand-700" note="Gross bookings revenue" />
            <Figure label="Escrow" value={money(data.heldInEscrow)} tone="text-amber-700" note="Currently on hold" />
            <Figure label="Available for payout" value={money(data.pendingPayout)} tone="text-sky-700" note="Eligible for transfer" />
            <Figure label="Paid" value={money(data.released)} tone="text-emerald-700" note="Already released" />
            <Figure label="Commission" value={money(data.commission)} tone="text-gray-700" note="Deducted from payouts" />
            <Figure label="Refunded" value={money(data.refunded)} tone="text-gray-700" note="Returned to the customer" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">Request payout</h2>
                <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                  Available: {money(data.pendingPayout)}
                </span>
              </div>

              <PayoutRequestForm
                currentBalance={availableBalance}
                payoutAccount={payout?.payoutAccountId ?? null}
                currency={data.currency}
                verified={payoutVerified}
              />
            </div>

            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">Payout account</h2>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${payout?.payoutAccountId ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
                >
                  {payout?.payoutAccountId ? 'Verified' : 'Not configured'}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-medium text-slate-900">Razorpay account</div>
                <div className="mt-1 font-mono">{maskAccountId(payout?.payoutAccountId ?? null)}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {payout?.payoutAccountId
                    ? 'Transfers can be sent once the account is verified by the payout provider.'
                    : 'Add a linked payout account to allow transfers from escrow.'}
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Escrow</h2>
              <span className="text-xs text-gray-400">Only eligible milestones can move to available for payout</span>
            </div>
            {escrowRows.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">No escrow is currently pending release.</div>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="pb-2">Booking</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Milestone</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Expected release</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {escrowRows.map((row) => (
                    <tr key={row.paymentId}>
                      <td className="py-2 font-mono text-xs text-gray-700">{row.bookingId.slice(0, 8)}</td>
                      <td className="py-2 text-gray-700">{row.clientName ?? 'Customer'}</td>
                      <td className="py-2">{MILESTONE_LABEL[row.milestone] ?? row.milestone}</td>
                      <td className="py-2 text-right font-medium">{money(row.payoutAmount)}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-1 text-xs ${row.status === 'disputed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
                          {paymentStatusLabel(row.status, 'provider')}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600">{row.confirmedAt ? new Date(row.confirmedAt).toLocaleDateString() : 'Awaiting confirmation'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card overflow-x-auto">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-semibold text-gray-900">Ledger</h2>
              <span className="text-xs text-gray-400">Select a row for full transaction details</span>
            </div>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Booking</th>
                  <th className="pb-2">Instalment</th>
                  <th className="pb-2 text-right">Charged</th>
                  <th className="pb-2 text-right">Commission</th>
                  <th className="pb-2 text-right">Your share</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {data.ledger.map((row) => (
                  <tr
                    key={row.paymentId}
                    onClick={() => navigate(`/accounts/transactions/${row.paymentId}`)}
                    className="cursor-pointer hover:bg-surface-sunken"
                    title="Open transaction details"
                  >
                    <td className="py-2 text-gray-600">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    {/* Who and what the money was for, with the reference
                        underneath for anyone matching it against a statement. */}
                    <td className="py-2">
                      <span className="block text-gray-900">
                        {[row.clientName, row.serviceName].filter(Boolean).join(' · ') ||
                          'Booking'}
                      </span>
                      <span className="font-mono text-xs text-brand-strong hover:underline">
                        {row.bookingId.slice(0, 8)}
                      </span>
                    </td>
                    <td className="py-2">{MILESTONE_LABEL[row.milestone] ?? row.milestone}</td>
                    <td className="py-2 text-right">{money(row.amount)}</td>
                    <td className="py-2 text-right text-gray-500">
                      −{money(row.commissionAmount)}
                    </td>
                    <td className="py-2 text-right font-medium">{money(row.payoutAmount)}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          STATUS_STYLE[row.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {paymentStatusLabel(row.status, 'provider')}
                      </span>
                      {/*
                        Only where the money is stuck. A "settle my payment"
                        button beside every row would be a button people press
                        on payments that are working, and the desk would fill
                        with requests that have no answer.
                      */}
                      {row.status === 'pending_payout' && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <SettleMyPayment bookingId={row.bookingId} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {data.ledger.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-400">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * "Settle my payment", on a payment that has not landed.
 *
 * It answers before it routes. The commonest reason a payout is stuck is a
 * provider who has not finished their own onboarding, and saying so is a better
 * outcome than putting a request on somebody's desk and making them wait for
 * the same sentence. Only if they still want a person does a case exist — and
 * the second press returns the one already open rather than raising another.
 */
function PayoutRequestForm({
  currentBalance,
  payoutAccount,
  currency,
  verified,
}: {
  currentBalance: number;
  payoutAccount: string | null;
  currency: string;
  verified: boolean;
}) {
  const [amount, setAmount] = useState('0.00');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxAmount = Math.max(0, currentBalance);
  const requestAmount = Number(amount || 0);
  const invalid = !verified || !payoutAccount || requestAmount <= 0 || requestAmount > maxAmount;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!verified || !payoutAccount) {
      setError('Please verify your payout account before requesting a payout.');
      return;
    }
    if (requestAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (requestAmount > maxAmount) {
      setError(`You can request up to ${currency === 'INR' ? '₹' : ''}${maxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
      return;
    }
    setError(null);
    setNotice(`Request for ${currency === 'INR' ? '₹' : ''}${requestAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is ready to submit to admin for approval.`);
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <label className="block text-sm text-gray-700">
        <span className="mb-1 block">Amount</span>
        <input
          className="input w-full"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Max: {currency === 'INR' ? '₹' : ''}{maxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <button type="button" className="text-sky-700 underline" onClick={() => setAmount(maxAmount.toFixed(2))}>
          Use max
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-emerald-700">{notice}</p>}
      <button type="submit" className="btn w-full disabled:cursor-not-allowed disabled:bg-slate-200" disabled={invalid}>
        Request payout
      </button>
    </form>
  );
}

function SettleMyPayment({ bookingId }: { bookingId: string }) {
  const [state, setState] = useState<{ reason: string; owed: string; open: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post(`/verification/cases/settlement/${bookingId}`, {});
      setState({ reason: data.reason, owed: data.owed, open: data.alreadyOpen });
    } catch (err) {
      setError(apiMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (state) {
    return (
      <div className="mt-1 max-w-xs rounded-sm bg-amber-50 p-2 text-xs text-amber-900">
        <p>{state.reason}</p>
        <p className="mt-1 text-amber-700">
          {state.open
            ? 'A request on this is already with the support desk.'
            : 'Raised with the support desk.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <button className="text-xs text-brand underline" disabled={busy} onClick={() => void ask()}>
        {busy ? 'Checking…' : 'Settle my payment'}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Figure({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone?: string;
  note: string;
}) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${tone ?? 'text-gray-900'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  );
}
