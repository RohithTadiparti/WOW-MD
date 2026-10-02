import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ClipboardText } from '@phosphor-icons/react';
import { api, apiMessage } from '../../lib/api';
import { plannerServiceLabel, plannerSpecializationLabel } from '../../lib/planner-profile';
import { Modal, SERVICE_ICONS, iso, longDate, type PlannerSelection } from './shared';

/**
 * The request a couple sends a planner, opened from either call to action on
 * the profile.
 *
 * It arrives filled in with what the couple already picked on the page (the
 * date from the calendar, the ticked services, any specialisations) and every
 * part of it can still be changed here. Guest count and the specialisations
 * have no field of their own on a booking, so they travel at the end of the
 * requirements, where the planner reads them alongside the rest.
 */

const MAX_REQUIREMENTS = 4000;
const MIN_REQUIREMENTS = 10;

interface Props {
  plannerId: string;
  plannerName: string;
  services: string[];
  selection: PlannerSelection;
  onSelectionChange: (next: PlannerSelection) => void;
  onSent: () => void;
  onClose: () => void;
}

export default function PlannerRequestForm({
  plannerId,
  plannerName,
  services,
  selection,
  onSelectionChange,
  onSent,
  onClose,
}: Props) {
  const [requirements, setRequirements] = useState('');
  const [guests, setGuests] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<{ id?: string; date: string } | null>(null);
  const [existing, setExisting] = useState('');

  const today = iso(new Date());
  const toggleService = (key: string) =>
    onSelectionChange({
      ...selection,
      services: selection.services.includes(key)
        ? selection.services.filter((k) => k !== key)
        : [...selection.services, key],
    });

  // The note the planner reads: the couple's own words first, then the facts
  // that have no column of their own.
  const extras = [
    Number(guests) > 0 ? `Guest count: ${Math.round(Number(guests))}` : '',
    selection.specializations.length
      ? `Specialisation: ${selection.specializations.map(plannerSpecializationLabel).join(', ')}`
      : '',
  ].filter(Boolean);
  const composed = [requirements.trim(), ...extras].filter(Boolean).join('\n\n');
  const tooLong = composed.length > MAX_REQUIREMENTS;
  // The server refuses a note under ten characters, so a two-word one is
  // caught here, with a reason, rather than bounced back as a bare error.
  const tooShort = composed.length > 0 && composed.length < MIN_REQUIREMENTS;
  const [triedShort, setTriedShort] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (tooShort) {
      setTriedShort(true);
      return;
    }
    if (tooLong || busy) return;
    setBusy(true);
    setError('');
    setExisting('');
    try {
      const amount = Number(budget);
      const { data } = await api.post('/bookings', {
        providerType: 'planner',
        providerId: plannerId,
        ...(selection.date ? { eventDate: selection.date } : {}),
        ...(selection.services.length ? { requestedServices: selection.services.slice(0, 16) } : {}),
        ...(composed ? { requirements: composed } : {}),
        // An empty budget means "quote me": a number is never invented on the
        // couple's behalf.
        ...(budget.trim() && Number.isFinite(amount) && amount > 0 ? { expectedBudget: amount } : {}),
      });
      setSent({ id: (data as { id?: string } | undefined)?.id, date: selection.date });
      onSent();
    } catch (err) {
      const body = (
        err as {
          response?: { status?: number; data?: { bookingId?: string; code?: string; error?: { code?: string; bookingId?: string } } };
        }
      ).response;
      const code = body?.data?.error?.code ?? body?.data?.code;
      const bookingId = body?.data?.error?.bookingId ?? body?.data?.bookingId;
      if (code === 'DUPLICATE_BOOKING_REQUEST') {
        setExisting(bookingId ?? 'unknown');
      } else {
        setError(apiMessage(err, 'That request could not be sent.'));
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Modal title="Request sent" onClose={onClose}>
        <div className="space-y-4 text-center">
          <CheckCircle size={44} weight="light" className="mx-auto text-positive-fg" aria-hidden />
          <p className="text-[0.9375rem] leading-relaxed text-gray-700">
            Your request has gone to <span className="font-medium text-gray-900">{plannerName}</span>
            {sent.date ? ` for ${longDate(sent.date)}` : ''}. They will reply in Bookings, where you can follow
            it and pay into escrow once they confirm.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to={sent.id ? `/bookings?highlight=${sent.id}` : '/bookings'} className="btn">
              Go to Bookings
            </Link>
            <button type="button" className="btn-outline" onClick={onClose}>
              Back to profile
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Send a request"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="planner-request" className="btn" disabled={busy || tooLong}>
            {busy ? 'Sending…' : 'Submit request'}
          </button>
        </div>
      }
    >
      <form id="planner-request" onSubmit={submit} className="space-y-5">
        <label className="block">
          <span>Planner</span>
          <input className="input" value={plannerName} readOnly aria-readonly="true" />
        </label>

        <label className="block">
          <span>Selected wedding date</span>
          <input
            className="input"
            type="date"
            min={today}
            value={selection.date}
            onChange={(e) => onSelectionChange({ ...selection, date: e.target.value })}
          />
        </label>

        <fieldset>
          <legend className="label">Selected services</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((key) => {
              const Icon = SERVICE_ICONS[key] ?? ClipboardText;
              const on = selection.services.includes(key);
              return (
                <label
                  key={key}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2 text-sm transition-colors ${
                    on ? 'border-brand bg-brand-soft text-brand-strong' : 'border-gray-200 text-gray-700 hover:border-brand'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-brand"
                    checked={on}
                    onChange={() => toggleService(key)}
                  />
                  <Icon size={18} weight="light" aria-hidden className="shrink-0" />
                  <span className="min-w-0">{plannerServiceLabel(key)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {selection.specializations.length > 0 && (
          <div>
            <p className="label">Specialisation</p>
            <div className="flex flex-wrap gap-2">
              {selection.specializations.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="pill-brand"
                  onClick={() =>
                    onSelectionChange({
                      ...selection,
                      specializations: selection.specializations.filter((k) => k !== key),
                    })
                  }
                  aria-label={`Remove ${plannerSpecializationLabel(key)}`}
                >
                  {plannerSpecializationLabel(key)} <span aria-hidden>×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block">
          <span>Additional wedding requirements</span>
          <textarea
            className="input min-h-[7rem]"
            value={requirements}
            maxLength={MAX_REQUIREMENTS}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Tell the planner about your wedding: events, style, venue ideas, anything they should know."
          />
        </label>
        {tooLong && <p className="text-xs text-critical-fg">Please shorten your requirements a little.</p>}
        {tooShort && triedShort && (
          <p className="text-xs text-critical-fg">Tell the planner what you need, at least a sentence.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span>Guest count (optional)</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </label>
          <label className="block">
            <span>Expected budget in ₹ (optional)</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Leave blank to be quoted"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
            />
          </label>
        </div>

        {existing && (
          <div className="alert-caution space-y-1 text-sm">
            <p>You already have a request with this planner that is still open.</p>
            <Link
              to={existing === 'unknown' ? '/bookings' : `/bookings?highlight=${existing}`}
              className="font-medium underline underline-offset-4"
            >
              View it in Bookings
            </Link>
          </div>
        )}
        {error && <p className="alert-critical">{error}</p>}
      </form>
    </Modal>
  );
}
