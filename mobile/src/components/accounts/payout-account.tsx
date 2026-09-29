import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { Badge } from '@/components/chrome';
import { Alert, Body, Button, Card, Field, SectionTitle } from '@/components/ui';
import { space } from '@/theme';

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

const validateIfsc = (value: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value.trim());

export function PayoutAccount({
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
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PayoutFormState, string>>>({});
  const [banks, setBanks] = useState<string[]>([]);
  const [bankSelected, setBankSelected] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [showBanks, setShowBanks] = useState(false);
  const [showAccountTypes, setShowAccountTypes] = useState(false);
  const [ifscDetails, setIfscDetails] = useState<IfscDetails | null>(null);
  const [ifscBusy, setIfscBusy] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    if (current) {
      setForm((prev) => ({ ...prev, gatewayAccountId: current }));
      setStatus('Verified');
      onStatusChange?.(true);
    } else {
      setForm(emptyForm());
      setStatus('Not set up');
      onStatusChange?.(false);
    }
  }, [current]);

  useEffect(() => {
    void api.get<string[]>('/vendors/payout/banks').then(({ data }) => setBanks(data)).catch(() => setBanks([]));
  }, []);

  const badgeTone = useMemo(() => {
    switch (status) {
      case 'Verified':
        return 'positive' as const;
      case 'Pending Verification':
        return 'caution' as const;
      case 'Verification Failed':
        return 'critical' as const;
      default:
        return 'neutral' as const;
    }
  }, [status]);

  const updateField = (field: keyof PayoutFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === 'ifscCode') setIfscDetails(null);
  };

  const lookupIfsc = async () => {
    const ifsc = form.ifscCode.trim().toUpperCase();
    setIfscDetails(null);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setFieldErrors((prev) => ({ ...prev, ifscCode: 'Enter a valid IFSC code.' }));
      return;
    }
    setIfscBusy(true);
    try {
      const { data } = await api.get<IfscDetails>(`/vendors/payout/ifsc/${ifsc}`, { params: { bankName: form.bankName || undefined } });
      setIfscDetails(data);
      setForm((prev) => ({ ...prev, bankName: data.bankName, ifscCode: data.ifsc }));
      setBankSelected(true);
      setFieldErrors((prev) => ({ ...prev, ifscCode: undefined, bankName: undefined }));
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, ifscCode: apiMessage(err, 'Invalid IFSC code or bank mismatch.') }));
    } finally {
      setIfscBusy(false);
    }
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof PayoutFormState, string>> = {};
    const holder = form.accountHolderName.trim();
    const bank = form.bankName.trim();
    const digits = form.accountNumber.replace(/\s+/g, '');
    const confirmDigits = form.confirmAccountNumber.replace(/\s+/g, '');
    const ifsc = form.ifscCode.trim();
    const gateway = form.gatewayAccountId.trim();

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
  };

  async function save() {
    setError('');
    setNotice('');
    setBusy(true);

    try {
      if (!validate()) return;
      const gatewayValue = form.gatewayAccountId.trim();
      if (gatewayValue) {
        await api.put(endpoint, { payoutAccountId: gatewayValue });
      }
      setStatus('Pending Verification');
      onStatusChange?.(false);
      setEditing(false);
      setNotice('Saved and sent for verification. We will review it before your next payout is released.');
      await Promise.all(
        ['my-listing', 'earnings', 'payout-account', 'vendor-me', 'planner-me'].map((key) =>
          qc.invalidateQueries({ queryKey: [key] }),
        ),
      );
    } catch (err) {
      setError(apiMessage(err, 'That could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  const displayBank = form.bankName;
  const displayType = form.accountType;
  const displayNumber = form.accountNumber;
  const displayIfsc = form.ifscCode;
  const displayGateway = current || form.gatewayAccountId;
  const filteredBanks = banks.filter((bank) => bank.toLowerCase().includes(bankSearch.trim().toLowerCase()));
  const formValid = Boolean(
    form.accountHolderName.trim() && form.bankName && (banks.length === 0 || banks.some((bank) => bank.toLowerCase() === form.bankName.toLowerCase())) &&
      form.accountType && /^\d{9,18}$/.test(form.accountNumber) && form.accountNumber === form.confirmAccountNumber &&
      bankSelected && ifscDetails && ifscDetails.ifsc === form.ifscCode && ifscDetails.bankName.toLowerCase() === form.bankName.toLowerCase() && displayGateway,
  );

  if (!editing) {
    return (
      <Card style={{ gap: space(3) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2) }}>
          <SectionTitle>Payout Account</SectionTitle>
          <Badge tone={status === 'Verified' ? 'positive' : 'neutral'}>{status === 'Verified' ? 'Verified' : status}</Badge>
        </View>

        {status === 'Verified' ? (
          <View style={{ gap: space(2) }}>
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                backgroundColor: '#FFFFFF',
                padding: space(3),
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), flex: 1 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' }}>
                    <Body style={{ fontSize: 20 }}>🏦</Body>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body>{displayBank}</Body>
                    <Body tone="muted">{displayType} Account</Body>
                  </View>
                </View>
                <View style={{ width: 130, alignItems: 'flex-end' }}>
                  <Body tone="muted">Account Number</Body>
                  <Body style={{ fontVariant: ['tabular-nums'] }}>{maskAccountNumber(displayNumber)}</Body>
                </View>
                <View style={{ width: 110, alignItems: 'flex-end' }}>
                  <Body tone="muted">IFSC Code</Body>
                  <Body style={{ fontVariant: ['tabular-nums'] }}>{displayIfsc}</Body>
                </View>
                <View style={{ width: 150, alignItems: 'flex-end' }}>
                  <Body tone="muted">Razorpay Account ID</Body>
                  <Body style={{ fontVariant: ['tabular-nums'] }}>{displayGateway}</Body>
                </View>
              </View>
            </View>

            <Alert tone="positive">Your payout account is verified. You can receive payments once they are released by the admin.</Alert>
          </View>
        ) : (
          <View style={{ minHeight: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: space(4) }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: space(2) }}>
                <Body style={{ fontSize: 24 }}>🏛️</Body>
              </View>
              <Body style={{ textAlign: 'center' }}>No payout account added</Body>
              <Body tone="muted" style={{ textAlign: 'center' }}>Add your bank account to receive payouts.</Body>
            </View>
          </View>
        )}

        <Button
          label={status === 'Verified' ? 'Edit Details' : 'Add Payout Account'}
          variant="outline"
          small
          onPress={() => setEditing(true)}
        />

        {error ? <Alert tone="critical">{error}</Alert> : null}
        {notice ? <Alert tone="positive">{notice}</Alert> : null}
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space(2) }}>
        <SectionTitle>Payout Account</SectionTitle>
        <Button label="Cancel" variant="outline" small onPress={() => setEditing(false)} />
      </View>

      <View style={{ gap: space(2.5) }}>
        <Field label="Account holder name" value={form.accountHolderName} onChangeText={(value) => updateField('accountHolderName', value)} autoCapitalize="words" error={fieldErrors.accountHolderName} />
        <View style={{ gap: space(1.5) }}>
          <Field label="Bank name" placeholder="Search supported banks" value={bankSearch || form.bankName} editable={!ifscDetails} onFocus={() => setShowBanks(true)} onChangeText={(value) => { setBankSearch(value); setBankSelected(false); setShowBanks(true); }} autoCapitalize="words" error={fieldErrors.bankName} />
          {showBanks && (
            <View style={{ maxHeight: 180, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF' }}>
              {filteredBanks.map((bank) => (
                <Pressable
                  key={bank}
                  onPress={() => {
                    updateField('bankName', bank);
                    setBankSelected(true);
                    setBankSearch('');
                    setShowBanks(false);
                    setIfscDetails(null);
                  }}
                  style={{ padding: space(2) }}
                >
                  <Body>{bank}</Body>
                </Pressable>
              ))}
              {filteredBanks.length === 0 ? <Body tone="muted" style={{ padding: space(2) }}>No supported banks found.</Body> : null}
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <Pressable onPress={() => setShowAccountTypes((visible) => !visible)}>
              <Field label="Account type" placeholder="Select Account Type" value={form.accountType} editable={false} error={fieldErrors.accountType} />
            </Pressable>
            {showAccountTypes ? (
              <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFFFFF' }}>
                {(['Savings', 'Current'] as const).map((type) => (
                  <Pressable key={type} onPress={() => { updateField('accountType', type); setShowAccountTypes(false); }} style={{ padding: space(2) }}>
                    <Body>{type}</Body>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Razorpay Account ID" value={current || 'Generated after verification'} editable={false} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(2) }}>
          <View style={{ flex: 1 }}><Field label="Account number" value={form.accountNumber} secureTextEntry={!accountVisible} keyboardType="number-pad" onChangeText={(value) => updateField('accountNumber', value.replace(/\D/g, ''))} error={fieldErrors.accountNumber} /></View>
          <Button label={accountVisible ? 'Hide' : 'Show'} variant="outline" small onPress={() => setAccountVisible((visible) => !visible)} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space(2) }}>
          <View style={{ flex: 1 }}><Field label="Confirm account number" value={form.confirmAccountNumber} secureTextEntry={!confirmVisible} keyboardType="number-pad" onChangeText={(value) => updateField('confirmAccountNumber', value.replace(/\D/g, ''))} error={fieldErrors.confirmAccountNumber} /></View>
          <Button label={confirmVisible ? 'Hide' : 'Show'} variant="outline" small onPress={() => setConfirmVisible((visible) => !visible)} />
        </View>
        <View style={{ gap: space(1.5) }}>
          <Field label="IFSC code" value={form.ifscCode} autoCapitalize="characters" onChangeText={(value) => updateField('ifscCode', value.toUpperCase())} error={fieldErrors.ifscCode} />
          <Button label={ifscBusy ? 'Verifying IFSC...' : 'Verify IFSC'} variant="outline" small busy={ifscBusy} onPress={() => void lookupIfsc()} />
        </View>
        {ifscDetails ? (
          <View style={{ gap: space(2), padding: space(3), borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }}>
            {([['Bank Name', ifscDetails.bankName], ['Branch', ifscDetails.branch], ['Address', ifscDetails.address], ['City', ifscDetails.city], ['State', ifscDetails.state], ['PIN Code', ifscDetails.pinCode]] as const).map(([label, value]) => <Field key={label} label={label} value={value} editable={false} />)}
          </View>
        ) : null}
        <Button label="Save & Verify" busy={busy} disabled={!formValid || ifscBusy} onPress={() => void save()} />
      </View>

      {error ? <Alert tone="critical">{error}</Alert> : null}
      {notice ? <Alert tone="positive">{notice}</Alert> : null}
    </Card>
  );
}
