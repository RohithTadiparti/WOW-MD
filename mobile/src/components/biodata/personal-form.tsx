import { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { Alert, Button, Card, Field } from '@/components/ui';
import { CASTES_BY_RELIGION, MOTHER_TONGUES, RELIGIONS } from '@/shared/reference';
import { STATES_BY_COUNTRY, districtsForState, DISTRICTS_BY_STATE } from '@/shared/locations';
import { space } from '@/theme';
import { ChoiceField, canonical } from './choice-field';
import { WowCalendar } from '@/components/common/WowCalendar';
import { GENDERS, MARITAL, COMPLEXIONS, stored } from './constants';

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
  state: string;
  location: string;
  communicationAddress: string;
  alternateMobile: string;
  complexion: string;
}

function formFrom(
  me: Record<string, unknown>,
  full?: { details?: Record<string, unknown> | null; dateOfBirth?: string | null },
): Form {
  const d = (full?.details ?? {}) as Record<string, unknown>;
  const religion = canonical(String(d.religion ?? ''), RELIGIONS);
  const city = String(me.city ?? '');
  let state = '';
  for (const [s, cities] of Object.entries(DISTRICTS_BY_STATE)) {
    if (cities.includes(city)) {
      state = s;
      break;
    }
  }

  return {
    fullName: String(me.displayName ?? ''),
    dateOfBirth: String(me.dateOfBirth ?? full?.dateOfBirth ?? '').slice(0, 10),
    gender: String(me.gender ?? '').toLowerCase(),
    heightCm: stored(d.heightCm),
    maritalStatus: String(d.maritalStatus ?? ''),
    religion,
    caste: canonical(String(d.caste ?? ''), CASTES_BY_RELIGION[religion] ?? []),
    subCaste: String(d.subCaste ?? ''),
    motherTongue: canonical(String(d.motherTongue ?? ''), MOTHER_TONGUES),
    state,
    location: city,
    communicationAddress: String(d.communicationAddress ?? ''),
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
  autofilledKeys,
}: {
  profileId: string | null;
  me: Record<string, unknown>;
  full?: { details?: Record<string, unknown> | null; dateOfBirth?: string | null };
  onSaved: () => void;
  onBack?: () => void;
  autofilledKeys?: Set<string>;
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

  const personalStarted = Boolean(
    form.heightCm || form.complexion || form.communicationAddress.trim() || form.alternateMobile.trim(),
  );
  const religionStarted = Boolean(form.religion || form.caste || form.subCaste.trim() || form.motherTongue);

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
      if (personalStarted) {
        await api.put(`/profiles/${profileId}/details/personal`, {
          firstName: names[0] || form.fullName.trim(),
          lastName: names.slice(1).join(' ') || undefined,
          heightCm: Number(form.heightCm),
          complexion: form.complexion,
          communicationAddress: form.communicationAddress.trim(),
          alternateMobile: form.alternateMobile.trim() || null,
        });
      }

      if (religionStarted) {
        await api.put(`/profiles/${profileId}/details/religion`, {
          religion: form.religion,
          caste: form.caste.trim(),
          subCaste: form.subCaste.trim(),
          motherTongue: form.motherTongue.trim(),
        });
      }

      if (form.maritalStatus) {
        await api.put(`/profiles/${profileId}/details/marital`, {
          maritalStatus: form.maritalStatus,
        });
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

  function submit() {
    if (personalStarted) {
      const h = Number(form.heightCm);
      if (!form.heightCm || Number.isNaN(h) || h < 120 || h > 230) {
        setError('Height must be between 120cm and 230cm.');
        return;
      }
      if (!form.complexion || !form.communicationAddress.trim()) {
        setError('Complexion and communication address are needed to save personal details.');
        return;
      }
    }
    if (religionStarted && (!form.religion || !form.caste.trim() || !form.subCaste.trim() || !form.motherTongue.trim())) {
      setError('Religion, caste, sub-caste and mother tongue are all needed to save religion details.');
      return;
    }
    setError('');
    save.mutate();
  }

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <Card>
        <Field label="Full Name" value={form.fullName} onChangeText={set('fullName')} required autoFilled={autofilledKeys?.has('firstName') || autofilledKeys?.has('lastName')} />
        <WowCalendar label="Date of Birth" title="Select Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} maximumDate={maxDob} required autoFilled={autofilledKeys?.has('dateOfBirth')} />
        <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={set('gender')} required autoFilled={autofilledKeys?.has('gender')} />
        <Field label="Height (cm)" value={form.heightCm} onChangeText={set('heightCm')} keyboardType="number-pad" maxLength={3} required autoFilled={autofilledKeys?.has('heightCm')} />
        <SelectField label="Complexion" value={form.complexion} options={COMPLEXIONS} onChange={set('complexion')} required autoFilled={autofilledKeys?.has('complexion')} />
        <SelectField label="Marital Status" value={form.maritalStatus} options={MARITAL} onChange={set('maritalStatus')} required autoFilled={autofilledKeys?.has('maritalStatus')} />
      </Card>

      <Card>
        <ChoiceField
          label="Religion"
          value={form.religion}
          options={RELIGIONS}
          onChange={(religion) => setDraft({ ...form, religion, caste: '' })}
          required
          autoFilled={autofilledKeys?.has('religion')}
        />
        <ChoiceField
          key={`caste-${form.religion}`}
          label="Caste"
          value={form.caste}
          options={CASTES_BY_RELIGION[form.religion] ?? []}
          onChange={set('caste')}
          required
          autoFilled={autofilledKeys?.has('caste')}
        />
        <Field label="Sub-Caste" value={form.subCaste} onChangeText={set('subCaste')} maxLength={60} required autoFilled={autofilledKeys?.has('subCaste')} />
        <ChoiceField label="Mother Tongue" value={form.motherTongue} options={MOTHER_TONGUES} onChange={set('motherTongue')} required autoFilled={autofilledKeys?.has('motherTongue')} />
      </Card>

      <Card>
        <ChoiceField
          label="State"
          value={form.state}
          options={STATES_BY_COUNTRY['India'] ?? []}
          onChange={(newState) => {
            setDraft({
              ...form,
              state: newState,
              location: districtsForState(newState).includes(form.location) ? form.location : '',
            });
          }}
          autoFilled={autofilledKeys?.has('state')}
        />
        <ChoiceField label="City" value={form.location} options={districtsForState(form.state)} onChange={set('location')} autoFilled={autofilledKeys?.has('location')} />
        <Field label="Communication Address" value={form.communicationAddress} onChangeText={set('communicationAddress')} required autoFilled={autofilledKeys?.has('communicationAddress')} />
        <Field label="Alternate Mobile" value={form.alternateMobile} onChangeText={set('alternateMobile')} keyboardType="phone-pad" autoFilled={autofilledKeys?.has('alternateMobile')} />
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
          onPress={submit}
        />
      </View>
    </View>
  );
}
