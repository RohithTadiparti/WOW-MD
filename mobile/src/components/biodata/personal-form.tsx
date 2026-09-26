import { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { DateField, SelectField } from '@/components/form';
import { Alert, Button, Card, Field } from '@/components/ui';
import { space } from '@/theme';
import { GENDERS, MARITAL, RELIGIONS, COMPLEXIONS, stored } from './constants';

interface Form {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  maritalStatus: string;
  religion: string;
  caste: string;
  subCaste: string;
  motherTongue: string;
  denomination: string;
  location: string;
  communicationAddress: string;
  placeOfBirth: string;
  nativePlace: string;
  nativeDistrict: string;
  nativeState: string;
  nativeCountry: string;
  isNri: string;
  nriCity: string;
  nriCountry: string;
  alternateMobile: string;
  complexion: string;
}

function formFrom(
  me: Record<string, unknown>,
  full?: { details?: Record<string, unknown> | null; dateOfBirth?: string | null },
): Form {
  const d = (full?.details ?? {}) as Record<string, unknown>;
  return {
    fullName: String(me.displayName ?? ''),
    dateOfBirth: String(me.dateOfBirth ?? full?.dateOfBirth ?? '').slice(0, 10),
    gender: String(me.gender ?? '').toLowerCase(),
    heightCm: stored(d.heightCm),
    maritalStatus: String(d.maritalStatus ?? ''),
    religion: String(d.religion ?? '').toLowerCase(),
    caste: String(d.caste ?? ''),
    subCaste: String(d.subCaste ?? ''),
    motherTongue: String(d.motherTongue ?? ''),
    denomination: String(d.denomination ?? ''),
    location: String(me.city ?? d.city ?? ''),
    communicationAddress: String(d.communicationAddress ?? ''),
    placeOfBirth: String(d.placeOfBirth ?? ''),
    nativePlace: String(d.nativePlace ?? ''),
    nativeDistrict: String(d.nativeDistrict ?? ''),
    nativeState: String(d.nativeState ?? ''),
    nativeCountry: String(d.nativeCountry ?? ''),
    isNri: d.isNri === true ? 'yes' : d.isNri === false ? 'no' : '',
    nriCity: String(d.nriCity ?? ''),
    nriCountry: String(d.nriCountry ?? ''),
    alternateMobile: String(d.alternateMobile ?? ''),
    complexion: String(d.complexion ?? ''),
  };
}

export function PersonalForm({
  profileId,
  me,
  full,
  onSaved,
  onBack,
}: {
  profileId: string | null;
  me: Record<string, unknown>;
  full?: { details?: Record<string, unknown> | null; dateOfBirth?: string | null };
  onSaved: () => void;
  onBack?: () => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Form | null>(null);

  const form = draft ?? formFrom(me, full);

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 21);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (form.fullName.trim()) payload.displayName = form.fullName.trim();
      if (form.gender) payload.gender = form.gender;
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.location.trim()) payload.city = form.location.trim();
      await api.put('/users/me/profile', payload);

      if (!profileId) return;
      const names = form.fullName.trim().split(/\s+/);
      try {
        await api.put(`/profiles/${profileId}/details/personal`, {
          firstName: names[0] || form.fullName.trim(),
          lastName: names.slice(1).join(' ') || undefined,
          heightCm: form.heightCm ? Number(form.heightCm) : undefined,
          city: form.location.trim() || undefined,
          complexion: form.complexion.trim() || undefined,
          nativePlace: form.nativePlace.trim() || undefined,
          nativeDistrict: form.nativeDistrict.trim() || undefined,
          nativeState: form.nativeState.trim() || undefined,
          nativeCountry: form.nativeCountry.trim() || undefined,
          isNri: form.isNri === 'yes' ? true : form.isNri === 'no' ? false : undefined,
          nriCity: form.nriCity.trim() || undefined,
          nriCountry: form.nriCountry.trim() || undefined,
          placeOfBirth: form.placeOfBirth.trim() || undefined,
          communicationAddress: form.communicationAddress.trim() || undefined,
          alternateMobile: form.alternateMobile.trim() || undefined,
        });
      } catch {}
      
      try {
        await api.put(`/profiles/${profileId}/details/religion`, {
          religion: form.religion.trim() || undefined,
          caste: form.caste.trim() || undefined,
          subCaste: form.subCaste.trim() || undefined,
          motherTongue: form.motherTongue.trim() || undefined,
          denomination: form.denomination.trim() || undefined,
        });
      } catch {}
      
      if (form.maritalStatus) {
        try {
          await api.put(`/profiles/${profileId}/details/marital`, {
            maritalStatus: form.maritalStatus,
          });
        } catch {}
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      if (profileId) {
        await qc.invalidateQueries({ queryKey: ['biodata-details', profileId] });
        await qc.invalidateQueries({ queryKey: ['biodata-completion', profileId] });
      }
      setDraft(null);
      setError('');
      onSaved();
    },
    onError: (err) => setError(apiMessage(err, 'Your profile could not be saved.')),
  });

  const set = (key: keyof Form) => (value: string) => setDraft({ ...form, [key]: value });

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <Card>
        <Field label="Full Name" value={form.fullName} onChangeText={set('fullName')} />
        <DateField label="Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} to={maxDob} />
        <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={set('gender')} />
        <Field label="Height (cm)" value={form.heightCm} onChangeText={set('heightCm')} keyboardType="numeric" />
        <SelectField label="Complexion" value={form.complexion} options={COMPLEXIONS} onChange={set('complexion')} />
        <SelectField label="Marital Status" value={form.maritalStatus} options={MARITAL} onChange={set('maritalStatus')} />
        <Field label="Place of Birth" value={form.placeOfBirth} onChangeText={set('placeOfBirth')} />
      </Card>
      
      <Card>
        <SelectField label="Religion" value={form.religion} options={RELIGIONS} onChange={set('religion')} />
        <Field label="Caste" value={form.caste} onChangeText={set('caste')} />
        <Field label="Sub-Caste" value={form.subCaste} onChangeText={set('subCaste')} />
        <Field label="Mother Tongue" value={form.motherTongue} onChangeText={set('motherTongue')} />
        <Field label="Denomination" value={form.denomination} onChangeText={set('denomination')} />
      </Card>

      <Card>
        <Field label="Location (Current City)" value={form.location} onChangeText={set('location')} />
        <Field label="Communication Address" value={form.communicationAddress} onChangeText={set('communicationAddress')} />
        <Field label="Alternate Mobile" value={form.alternateMobile} onChangeText={set('alternateMobile')} />
      </Card>
      
      <Card>
        <Field label="Native Place" value={form.nativePlace} onChangeText={set('nativePlace')} />
        <Field label="Native District" value={form.nativeDistrict} onChangeText={set('nativeDistrict')} />
        <Field label="Native State" value={form.nativeState} onChangeText={set('nativeState')} />
        <Field label="Native Country" value={form.nativeCountry} onChangeText={set('nativeCountry')} />
        <SelectField 
          label="Are you an NRI?" 
          value={form.isNri} 
          options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} 
          onChange={set('isNri')} 
        />
        {form.isNri === 'yes' && (
          <>
            <Field label="NRI City" value={form.nriCity} onChangeText={set('nriCity')} />
            <Field label="NRI Country" value={form.nriCountry} onChangeText={set('nriCountry')} />
          </>
        )}
      </Card>
      
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        {onBack && (
          <Button label="Back" variant="outline" onPress={onBack} disabled={save.isPending} />
        )}
        <Button
          style={{ flex: 1 }}
          label="Save & Continue →"
          busy={save.isPending}
          disabled={!form.fullName.trim()}
          onPress={() => {
            if (form.heightCm) {
              const h = Number(form.heightCm);
              if (Number.isNaN(h) || h < 120 || h > 230) {
                setError('Height must be between 120cm and 230cm.');
                return;
              }
            }
            setError('');
            save.mutate();
          }}
        />
      </View>
    </View>
  );
}
