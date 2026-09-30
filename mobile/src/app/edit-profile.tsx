import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { WowCalendar } from '@/components/common/WowCalendar';
import {
  Alert,
  Button,
  Field,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { ChoiceField, canonical } from '@/components/biodata/choice-field';
import { GENDERS, MARITAL, displayNameOf, namesFrom } from '@/components/biodata/constants';
import { CASTES_BY_RELIGION, RELIGIONS } from '@/shared/reference';
import { STATES_BY_COUNTRY, districtsForState, DISTRICTS_BY_STATE } from '@/shared/locations';
import { space } from '@/theme';

interface Form {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  maritalStatus: string;
  religion: string;
  caste: string;
  state: string;
  location: string;
}

function formFrom(
  me: Record<string, unknown>,
  full?: { details?: Record<string, unknown>; dateOfBirth?: string | null },
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
    ...namesFrom(me.displayName, d),
    dateOfBirth: String(me.dateOfBirth ?? full?.dateOfBirth ?? '').slice(0, 10),
    gender: String(me.gender ?? '').toLowerCase(),
    heightCm: d.heightCm != null ? String(d.heightCm) : '',
    maritalStatus: String(d.maritalStatus ?? ''),
    religion,
    caste: canonical(String(d.caste ?? ''), CASTES_BY_RELIGION[religion] ?? []),
    state,
    location: city,
  };
}

export default function EditProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Form | null>(null);

  const { data: me, isPending } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data as Record<string, unknown>,
    retry: false,
  });
  const profileId = (me?.id as string | undefined) ?? null;

  const { data: full } = useQuery({
    queryKey: ['biodata-details', profileId],
    enabled: Boolean(profileId),
    queryFn: async () =>
      (await api.get(`/profiles/${profileId}/details`)).data as {
        details?: Record<string, unknown>;
        dateOfBirth?: string | null;
      },
    retry: false,
  });

  const form = draft ?? (me ? formFrom(me, full) : formFrom({}));

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      const displayName = displayNameOf(form.firstName, form.lastName);
      if (displayName) payload.displayName = displayName;
      if (form.gender) payload.gender = form.gender;
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.location.trim()) payload.city = form.location.trim();
      await api.put('/users/me/profile', payload);

      if (!profileId) return;
      const d = (full?.details ?? {}) as Record<string, unknown>;
      if (form.heightCm && d.complexion && d.communicationAddress) {
        await api.put(`/profiles/${profileId}/details/personal`, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          heightCm: Number(form.heightCm),
          complexion: d.complexion,
          communicationAddress: d.communicationAddress,
        });
      }
      if (form.religion && d.subCaste && d.motherTongue) {
        await api.put(`/profiles/${profileId}/details/religion`, {
          religion: form.religion,
          caste: form.caste.trim(),
          subCaste: d.subCaste,
          motherTongue: d.motherTongue,
          ...(d.denomination ? { denomination: d.denomination } : {}),
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
      setNotice('Saved.');
      router.back();
    },
    onError: (err) => setError(apiMessage(err, 'Your profile could not be saved.')),
  });

  const set = (key: keyof Form) => (value: string) => setDraft({ ...form, [key]: value });

  if (isPending) {
    return (
      <Screen>
        <Loading rows={4} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionTitle>Basic Information</SectionTitle>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      <Field label="First Name" value={form.firstName} onChangeText={set('firstName')} />
      <Field
        label="Last Name"
        value={form.lastName}
        onChangeText={set('lastName')}
        hint="Family name, as on your documents"
      />
      <WowCalendar title="Select Date of Birth" label="Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
      <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={set('gender')} />
      <Field label="Height (cm)" value={form.heightCm} onChangeText={set('heightCm')} keyboardType="number-pad" maxLength={3} />
      <SelectField
        label="Marital Status"
        value={form.maritalStatus}
        options={MARITAL}
        onChange={set('maritalStatus')}
      />
      <ChoiceField
        label="Religion"
        value={form.religion}
        options={RELIGIONS}
        onChange={(religion) => setDraft({ ...form, religion, caste: '' })}
      />
      <ChoiceField
        key={`caste-${form.religion}`}
        label="Caste"
        value={form.caste}
        options={CASTES_BY_RELIGION[form.religion] ?? []}
        onChange={set('caste')}
      />
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
      />
      <ChoiceField label="City" value={form.location} options={districtsForState(form.state)} onChange={set('location')} />

      <View style={{ marginTop: space(2) }}>
        <Button
          label="Save Changes"
          busy={save.isPending}
          disabled={!form.firstName.trim() || !form.lastName.trim()}
          onPress={() => {
            const h = Number(form.heightCm);
            if (form.heightCm && (Number.isNaN(h) || h < 120 || h > 230)) {
              setError('Height must be between 120cm and 230cm.');
              return;
            }
            save.mutate();
          }}
        />
      </View>
    </Screen>
  );
}
