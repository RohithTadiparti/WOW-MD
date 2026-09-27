import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { DateField, SelectField } from '@/components/form';
import {
  Alert,
  Button,
  Field,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { space } from '@/theme';

const GENDERS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
];

const MARITAL = [
  { value: 'never_married', label: 'Never Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
];

const RELIGIONS = [
  { value: 'hindu', label: 'Hindu' },
  { value: 'muslim', label: 'Muslim' },
  { value: 'christian', label: 'Christian' },
  { value: 'sikh', label: 'Sikh' },
  { value: 'jain', label: 'Jain' },
  { value: 'buddhist', label: 'Buddhist' },
  { value: 'other', label: 'Other' },
];

const HEIGHTS = [
  { value: '152', label: `5' 0" (152 cm)` },
  { value: '155', label: `5' 1" (155 cm)` },
  { value: '157', label: `5' 2" (157 cm)` },
  { value: '160', label: `5' 3" (160 cm)` },
  { value: '163', label: `5' 4" (163 cm)` },
  { value: '165', label: `5' 5" (165 cm)` },
  { value: '168', label: `5' 6" (168 cm)` },
  { value: '170', label: `5' 7" (170 cm)` },
  { value: '173', label: `5' 8" (173 cm)` },
  { value: '175', label: `5' 9" (175 cm)` },
  { value: '178', label: `5' 10" (178 cm)` },
  { value: '180', label: `5' 11" (180 cm)` },
  { value: '183', label: `6' 0" (183 cm)` },
];

interface Form {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  maritalStatus: string;
  religion: string;
  caste: string;
  location: string;
}

function formFrom(
  me: Record<string, unknown>,
  full?: { details?: Record<string, unknown>; dateOfBirth?: string | null },
): Form {
  const d = (full?.details ?? {}) as Record<string, unknown>;
  return {
    fullName: String(me.displayName ?? ''),
    dateOfBirth: String(me.dateOfBirth ?? full?.dateOfBirth ?? '').slice(0, 10),
    gender: String(me.gender ?? '').toLowerCase(),
    heightCm: d.heightCm != null ? String(d.heightCm) : '',
    maritalStatus: String(d.maritalStatus ?? ''),
    religion: String(d.religion ?? '').toLowerCase(),
    caste: String(d.caste ?? ''),
    location: String(me.city ?? d.city ?? ''),
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
        });
      } catch {
        /* personal section may require complexion; account fields already saved */
      }
      if (form.religion) {
        try {
          await api.put(`/profiles/${profileId}/details/religion`, {
            religion: form.religion,
            caste: form.caste.trim() || undefined,
          });
        } catch {
          /* optional */
        }
      }
      if (form.maritalStatus) {
        try {
          await api.put(`/profiles/${profileId}/details/marital`, {
            maritalStatus: form.maritalStatus,
          });
        } catch {
          /* optional */
        }
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

      <Field label="Full Name" value={form.fullName} onChangeText={set('fullName')} />
      <DateField label="Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
      <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={set('gender')} />
      <SelectField label="Height" value={form.heightCm} options={HEIGHTS} onChange={set('heightCm')} />
      <SelectField
        label="Marital Status"
        value={form.maritalStatus}
        options={MARITAL}
        onChange={set('maritalStatus')}
      />
      <SelectField
        label="Religion"
        value={form.religion}
        options={RELIGIONS}
        onChange={set('religion')}
      />
      <Field label="Caste" value={form.caste} onChangeText={set('caste')} />
      <Field label="Location" value={form.location} onChangeText={set('location')} />

      <View style={{ marginTop: space(2) }}>
        <Button
          label="Save Changes"
          busy={save.isPending}
          disabled={!form.fullName.trim()}
          onPress={() => save.mutate()}
        />
      </View>
    </Screen>
  );
}
