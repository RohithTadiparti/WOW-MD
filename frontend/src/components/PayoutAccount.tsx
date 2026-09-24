import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, apiMessage } from '../lib/api';

type VerificationStatus = 'Not set up' | 'Pending Verification' | 'Verified' | 'Verification Failed';

type PayoutFormState = {
  accountHolderName: string;
  bankName: string;
  accountType: '' | 'Savings' | 'Current';
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  gatewayAccountId: string;
};

type IfscDetails = {
  ifsc: string;
  bankName: string;
  branch: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
};

const emptyForm = (): PayoutFormState => ({
  accountHolderName: '',
  bankName: '',
  accountType: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  gatewayAccountId: '',
});

const maskAccountNumber = (value: string) => {
  if (!value) return '••••';
  const digits = value.replace(/\s+/g, '');
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}${'X'.repeat(Math.max(0, digits.length - 8))}${digits.slice(-4)}`;
};

function PayoutAccount({
  endpoint,
  current,
  onStatusChange,
}: {
  endpoint: string;
  current: string | null;
  onStatusChange?: (verified: boolean) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PayoutFormState>(emptyForm());
  const [status, setStatus] = useState<VerificationStatus>(current ? 'Verified' : 'Not set up');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PayoutFormState, string>>>({});
  const [banks, setBanks] = useState<string[]>([]);
  const [bankSelected, setBankSelected] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [showBanks, setShowBanks] = useState(false);
  const [ifscDetails, setIfscDetails] = useState<IfscDetails | null>(null);
  const [ifscBusy, setIfscBusy] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    if (current) {
      setForm((prev) => ({ ...prev, gatewayAccountId: current }));
      setStatus('Verified');
    } else {
      setForm(emptyForm());
      setStatus('Not set up');
    }
    onStatusChange?.(Boolean(current));
  }, [current]);

  useEffect(() => {
    void api.get<string[]>('/vendors/payout/banks').then(({ data }) => setBanks(data)).catch(() => setBanks([]));
  }, []);

  const statusClass = useMemo(() => {
    switch (status) {
      case 'Verified':
        return 'bg-emerald-50 text-emerald-800';
      case 'Pending Verification':
        return 'bg-amber-50 text-amber-800';
      case 'Verification Failed':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }, [status]);

  function updateField(field: keyof PayoutFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === 'ifscCode') setIfscDetails(null);
  }

  async function lookupIfsc() {
    const ifsc = form.ifscCode.trim().toUpperCase();
    setIfscDetails(null);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setFieldErrors((prev) => ({ ...prev, ifscCode: 'Enter a valid IFSC code.' }));
      return;
    }
    setIfscBusy(true);
    try {
      const { data } = await api.get<IfscDetails>(`/vendors/payout/ifsc/${ifsc}`, {
        params: { bankName: form.bankName || undefined },
      });
      setIfscDetails(data);
      setForm((prev) => ({ ...prev, bankName: data.bankName, ifscCode: data.ifsc }));
      setBankSelected(true);
      setFieldErrors((prev) => ({ ...prev, ifscCode: undefined, bankName: undefined }));
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, ifscCode: apiMessage(err, 'Invalid IFSC code or bank mismatch.') }));
    } finally {
      setIfscBusy(false);
    }
  }

  function validate() {
    const nextErrors: Partial<Record<keyof PayoutFormState, string>> = {};
    const holder = form.accountHolderName.trim();
    const bank = form.bankName.trim();
    const digits = form.accountNumber.replace(/\s+/g, '');
    const confirmDigits = form.confirmAccountNumber.replace(/\s+/g, '');
    const ifsc = form.ifscCode.trim();

    if (!holder) nextErrors.accountHolderName = 'Account holder name is required.';
    if (!bank) nextErrors.bankName = 'Select a supported bank.';
    else if (!bankSelected || (banks.length > 0 && !banks.some((supportedBank) => supportedBank.toLowerCase() === bank.toLowerCase()))) nextErrors.bankName = 'Select a supported bank from the list.';
    if (!form.accountType) nextErrors.accountType = 'Select an account type.';
    if (!digits) nextErrors.accountNumber = 'Account number is required.';
    else if (!/^\d{9,18}$/.test(digits)) nextErrors.accountNumber = 'Enter a valid account number.';
    if (!confirmDigits) nextErrors.confirmAccountNumber = 'Confirm account number.';
    else if (digits !== confirmDigits) nextErrors.confirmAccountNumber = 'Account numbers do not match.';
    if (!ifsc) nextErrors.ifscCode = 'IFSC code is required.';
    else if (!ifscDetails || ifscDetails.ifsc !== ifsc || ifscDetails.bankName.toLowerCase() !== bank.toLowerCase()) nextErrors.ifscCode = 'Verify the IFSC code and bank match.';

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!validate()) return;

    try {
      const gatewayValue = form.gatewayAccountId.trim();
      if (!gatewayValue) throw new Error('Razorpay account ID has not been generated yet.');
      await api.put(endpoint, { payoutAccountId: gatewayValue });
      setStatus('Pending Verification');
      onStatusChange?.(false);
      setEditing(false);
      setNotice('Saved and sent for verification. We will review it before your next payout is released.');
      await qc.invalidateQueries({ queryKey: ['my-listing'] });
      await qc.invalidateQueries({ queryKey: ['earnings'] });
      await qc.invalidateQueries({ queryKey: ['payout-account'] });
    } catch (err) {
      setError(apiMessage(err, 'That could not be saved.'));
    }
  }

  const displayBank = form.bankName;
  const displayType = form.accountType;
  const displayNumber = form.accountNumber;
  const displayIfsc = form.ifscCode;
  const displayGateway = current || form.gatewayAccountId;
  const filteredBanks = banks.filter((bank) => bank.toLowerCase().includes(bankSearch.trim().toLowerCase()));
  const formValid = Boolean(
    form.accountHolderName.trim() &&
      form.bankName &&
      (banks.length === 0 || banks.some((bank) => bank.toLowerCase() === form.bankName.toLowerCase())) &&
      form.accountType &&
      /^\d{9,18}$/.test(form.accountNumber) &&
      form.accountNumber === form.confirmAccountNumber &&
      ifscDetails &&
      ifscDetails.ifsc === form.ifscCode &&
      bankSelected && ifscDetails.bankName.toLowerCase() === form.bankName.toLowerCase() &&
      displayGateway,
  );

  if (!editing) {
    return (
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Payout Account</h2>
            <p className="text-sm text-gray-600">Your verified bank account where payments are released.</p>
          </div>
          <div className="flex items-center gap-2">
            {status === 'Verified' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Verified
              </span>
            ) : (
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>
                {status}
              </span>
            )}
            <button type="button" className="btn-outline" onClick={() => setEditing(true)}>
              {status === 'Verified' ? 'Edit Details' : '+ Add Payout Account'}
            </button>
          </div>
        </div>
        {status === 'Verified' ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-50 text-2xl text-rose-700">
                    🏦
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{displayBank}</div>
                    <div className="text-sm text-gray-500">{displayType} Account</div>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Account Number</div>
                  <div className="font-mono text-gray-900">{maskAccountNumber(displayNumber)}</div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>IFSC Code</div>
                  <div className="font-mono text-gray-900">{displayIfsc}</div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div>Razorpay Account ID</div>
                  <div className="font-mono text-gray-900">{displayGateway}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Your payout account is verified. You can receive payments once they are released by the admin.
            </div>
          </>
        ) : (
          <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl leading-none shadow-sm">
                🏛️
              </div>
              <div className="text-lg font-medium text-gray-700">No payout account added</div>
              <div className="mt-1 text-sm text-gray-500">Add your bank account to receive payouts.</div>
            </div>
          </div>
        )}

        {error && <p className="alert-critical">{error}</p>}
        {notice && <p className="rounded-sm bg-emerald-50 p-2 text-sm text-emerald-700">{notice}</p>}
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="section-title">Payout Account</h2>
          <p className="text-sm text-gray-600">Add your bank account details to receive payouts.</p>
        </div>
        <button type="button" className="btn-outline" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>

      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block">Account Holder Name</span>
            <input
              className={`input ${fieldErrors.accountHolderName ? 'border-red-300' : ''}`}
              value={form.accountHolderName}
              onChange={(e) => updateField('accountHolderName', e.target.value)}
            />
            {fieldErrors.accountHolderName && <span className="mt-1 block text-xs text-red-600">{fieldErrors.accountHolderName}</span>}
          </label>

          <div className="relative text-sm text-gray-700">
            <span className="mb-1 block">Bank Name</span>
            <input
              className={`input ${fieldErrors.bankName ? 'border-red-300' : ''}`}
              placeholder="Search supported banks"
              value={bankSearch || form.bankName}
              readOnly={Boolean(ifscDetails)}
              onFocus={() => setShowBanks(true)}
              onChange={(e) => {
                setBankSearch(e.target.value);
                setBankSelected(false);
                setShowBanks(true);
              }}
              onBlur={() => window.setTimeout(() => setShowBanks(false), 150)}
              autoComplete="off"
            />
            {showBanks && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                {filteredBanks.map((bank) => (
                  <button
                    type="button"
                    key={bank}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onMouseDown={() => {
                      updateField('bankName', bank);
                      setBankSelected(true);
                      setBankSearch('');
                      setShowBanks(false);
                      setIfscDetails(null);
                    }}
                  >
                    {bank}
                  </button>
                ))}
                {filteredBanks.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No supported banks found.</div>}
              </div>
            )}
            {fieldErrors.bankName && <span className="mt-1 block text-xs text-red-600">{fieldErrors.bankName}</span>}
          </div>

          <label className="text-sm text-gray-700">
            <span className="mb-1 block">Account Type</span>
            <select
              className="input"
              value={form.accountType}
              onChange={(e) => updateField('accountType', e.target.value as PayoutFormState['accountType'])}
            >
              <option value="">Select Account Type</option>
              <option value="Savings">Savings</option>
              <option value="Current">Current</option>
            </select>
            {fieldErrors.accountType && <span className="mt-1 block text-xs text-red-600">{fieldErrors.accountType}</span>}
          </label>

          <label className="text-sm text-gray-700">
            <span className="mb-1 block">Razorpay Account ID</span>
            <input className="input bg-slate-50" value={current || 'Generated after verification'} readOnly />
          </label>

          <label className="text-sm text-gray-700 md:col-span-2">
            <span className="mb-1 block">Account Number</span>
            <input
              className={`input ${fieldErrors.accountNumber ? 'border-red-300' : ''}`}
              type={accountVisible ? 'text' : 'password'}
              value={form.accountNumber}
              onChange={(e) => updateField('accountNumber', e.target.value.replace(/\D/g, ''))}
            />
            <button type="button" className="mt-1 text-xs text-sky-700 underline" onClick={() => setAccountVisible((visible) => !visible)}>{accountVisible ? 'Hide' : 'Show'} account number</button>
            {fieldErrors.accountNumber && <span className="mt-1 block text-xs text-red-600">{fieldErrors.accountNumber}</span>}
          </label>

          <label className="text-sm text-gray-700 md:col-span-2">
            <span className="mb-1 block">Confirm Account Number</span>
            <input
              className={`input ${fieldErrors.confirmAccountNumber ? 'border-red-300' : ''}`}
              type={confirmVisible ? 'text' : 'password'}
              value={form.confirmAccountNumber}
              onChange={(e) => updateField('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
            />
            <button type="button" className="mt-1 text-xs text-sky-700 underline" onClick={() => setConfirmVisible((visible) => !visible)}>{confirmVisible ? 'Hide' : 'Show'} confirmation</button>
            {fieldErrors.confirmAccountNumber && <span className="mt-1 block text-xs text-red-600">{fieldErrors.confirmAccountNumber}</span>}
          </label>

          <label className="text-sm text-gray-700 md:col-span-2">
            <span className="mb-1 block">IFSC Code</span>
            <input
              className={`input uppercase ${fieldErrors.ifscCode ? 'border-red-300' : ''}`}
              value={form.ifscCode}
              onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
            />
            <button type="button" className="mt-1 text-xs text-sky-700 underline disabled:text-gray-400" onClick={() => void lookupIfsc()} disabled={ifscBusy}>
              {ifscBusy ? 'Verifying IFSC...' : 'Verify IFSC'}
            </button>
            {fieldErrors.ifscCode && <span className="mt-1 block text-xs text-red-600">{fieldErrors.ifscCode}</span>}
          </label>
        </div>

        {ifscDetails && (
          <div className="grid gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm md:grid-cols-2">
            {(['bankName', 'branch', 'address', 'city', 'state', 'pinCode'] as const).map((key) => (
              <label key={key} className="text-gray-700">
                <span className="mb-1 block capitalize">{key === 'pinCode' ? 'PIN Code' : key.replace(/([A-Z])/g, ' $1')}</span>
                <input className="input bg-white" value={ifscDetails[key]} readOnly />
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-outline" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button className="btn disabled:cursor-not-allowed disabled:bg-slate-200" disabled={!formValid || ifscBusy}>Save & Verify</button>
        </div>
      </form>

      {error && <p className="alert-critical">{error}</p>}
      {notice && <p className="rounded-sm bg-emerald-50 p-2 text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}

export default PayoutAccount;
