import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';
import { formatDate } from '../lib/dates';
import { Loading } from '../components/ui/Feedback';

/** What the wedding's Direct Link shows before anybody fills it in. */
interface DirectLinkView {
  title: string;
  coupleNames: string | null;
  cardUrl: string | null;
  eventDate: string | null;
}

/**
 * The wedding's Direct Link, as a guest opens it.
 *
 * The invitation card and three fields: name, mobile, and how many are coming.
 * No email and no "will you be attending" question: the reply adds the guest
 * to the couple's list for the whole wedding, and the couple takes it from
 * there. Public, like the other invitation pages, and as thin: it shows the
 * card and nothing about the guest list.
 */
export default function WeddingInvitation() {
  const { token = '' } = useParams<{ token: string }>();
  const { data, isPending, error } = useQuery<DirectLinkView>({
    queryKey: ['wedding-direct-link', token],
    queryFn: async () => (await api.get(`/events/wedding-link/${token}`)).data,
    enabled: Boolean(token),
    retry: false,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; partySize?: string }>({});
  const [failed, setFailed] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Please give your name.';
    if (digits && !/^[6-9]\d{9}$/.test(digits)) next.phone = 'Enter a 10-digit mobile number.';
    const count = partySize.trim() ? Number(partySize) : null;
    if (count !== null && (!Number.isInteger(count) || count < 1 || count > 100)) {
      next.partySize = 'Enter a number from 1 to 100, or leave it blank.';
    }
    setErrors(next);
    setFailed('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const { data: result } = await api.post(`/events/wedding-link/${token}`, {
        name: name.trim(),
        ...(digits ? { phone: digits } : {}),
        ...(count !== null ? { partySize: count } : {}),
      });
      setSent(result?.name ?? name.trim());
    } catch (err) {
      setFailed(apiMessage(err, 'That could not be sent. Try again in a moment.'));
    } finally {
      setBusy(false);
    }
  }

  if (isPending) return <div className="mx-auto max-w-xl p-6"><Loading rows={4} /></div>;

  if (error || !data) {
    return (
      <main className="flex min-h-[100dvh] items-center px-4 py-8 sm:px-6">
        <div className="card mx-auto w-full max-w-xl text-center">
          <h1 className="section-title">This invitation is not available</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            The link may have been withdrawn, or copied incompletely. Ask whoever sent it for a fresh one.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] items-center px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <section className="card px-5 py-7 text-center sm:px-8">
          {data.cardUrl && (
            <img
              src={data.cardUrl}
              alt="Wedding invitation card"
              className="mx-auto mb-6 max-h-[32rem] w-full border border-gray-200 object-contain"
            />
          )}
          <span aria-hidden className="mx-auto block h-px w-16 bg-gold" />
          <h1 className="page-title mx-auto mt-4">{data.title}</h1>
          {data.eventDate && <p className="mt-2 text-sm text-gray-600">{formatDate(data.eventDate)}</p>}
        </section>

        {sent ? (
          <section className="card space-y-2 text-center">
            <h2 className="section-title">Thank you, {sent}</h2>
            <p className="text-sm leading-relaxed text-gray-600">Your details have reached the couple.</p>
            <button
              className="btn-outline mt-2"
              onClick={() => {
                setSent(null);
                setName('');
                setPhone('');
                setPartySize('');
              }}
            >
              Add somebody else
            </button>
          </section>
        ) : (
          <form className="card space-y-5 px-5 py-6 sm:px-8" onSubmit={submit} noValidate>
            {failed && <p className="alert-critical" role="alert">{failed}</p>}
            <div>
              <label className="label" htmlFor="guest-name">
                Name <span className="text-red-600">*</span>
              </label>
              <input
                id="guest-name"
                className={`input${errors.name ? ' border-red-500' : ''}`}
                value={name}
                maxLength={120}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="label" htmlFor="guest-phone">Phone number</label>
              <input
                id="guest-phone"
                className={`input${errors.phone ? ' border-red-500' : ''}`}
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                maxLength={16}
                onChange={(e) => setPhone(e.target.value)}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>
            <div>
              <label className="label" htmlFor="guest-count">
                Number of guests <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="guest-count"
                className={`input${errors.partySize ? ' border-red-500' : ''}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
              {errors.partySize && <p className="mt-1 text-xs text-red-600">{errors.partySize}</p>}
            </div>
            <button className="btn w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
