import { useState, useMemo } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { Alert, Button, Card, Field, Caption, Body } from '@/components/ui';
import { CASTES_BY_RELIGION, MOTHER_TONGUES, RELIGIONS } from '@/shared/reference';
import { STATES_BY_COUNTRY, districtsForState, DISTRICTS_BY_STATE } from '@/shared/locations';
import { radius, space } from '@/theme';
import { ProfileSilhouette } from '@/components/profile-silhouette';
import { ChoiceField, canonical } from './choice-field';
import { WowCalendar } from '@/components/common/WowCalendar';
import { MediaStrip, PhotoPicker } from '@/components/uploader';
import { capitalizeWords } from '@/lib/format';
import { GENDERS, MARITAL, COMPLEXIONS, displayNameOf, namesFrom, stored } from './constants';

interface Form {
  firstName: string;
  lastName: string;
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

  const names = namesFrom(me.displayName, d);
  return {
    firstName: capitalizeWords(names.firstName),
    lastName: capitalizeWords(names.lastName),
    dateOfBirth: String(me.dateOfBirth ?? full?.dateOfBirth ?? '').slice(0, 10),
    gender: String(me.gender ?? '').toLowerCase(),
    heightCm: stored(d.heightCm),
    maritalStatus: String(d.maritalStatus ?? ''),
    religion,
    caste: canonical(String(d.caste ?? ''), CASTES_BY_RELIGION[religion] ?? []),
    subCaste: String(d.subCaste ?? ''),
    motherTongue: canonical(String(d.motherTongue ?? ''), MOTHER_TONGUES),
    state,
    location: capitalizeWords(city),
    communicationAddress: capitalizeWords(String(d.communicationAddress ?? '')),
    alternateMobile: String(d.alternateMobile ?? ''),
    complexion: String(d.complexion ?? ''),
  };
}

export function PersonalForm({
  profileId,
  me,
  full,
  photos,
  onPhotoAdded,
  onPhotoRemoved,
  primaryPhotoUrl,
  onMakePrimary,
  onSaved,
  onBack,
  autofilledKeys,
}: {
  profileId: string | null;
  me: Record<string, unknown>;
  full?: { details?: Record<string, unknown> | null; dateOfBirth?: string | null };
  photos?: string[];
  onPhotoAdded?: (url: string) => void;
  onPhotoRemoved?: (url: string) => void;
  /** The photo shown first; when given with onMakePrimary, the person can choose it. */
  primaryPhotoUrl?: string | null;
  onMakePrimary?: (url: string) => void;
  onSaved: () => void;
  onBack?: () => void;
  autofilledKeys?: Set<string>;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      const displayName = displayNameOf(form.firstName, form.lastName);
      if (displayName) payload.displayName = displayName;
      if (form.gender) payload.gender = form.gender;
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.location.trim()) payload.city = form.location.trim();
      await api.put('/users/me/profile', payload);

      if (!profileId) return;
        await api.put(`/profiles/${profileId}/details/personal`, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          heightCm: Number(form.heightCm),
          complexion: form.complexion,
          communicationAddress: form.communicationAddress.trim(),
          alternateMobile: form.alternateMobile.trim() || null,
          dateOfBirth: form.dateOfBirth || undefined,
        });

      if (religionStarted) {
        await api.put(`/profiles/${profileId}/details/religion`, {
          religion: form.religion,
          caste: form.caste.trim(),
          subCaste: form.subCaste.trim(),
          motherTongue: form.motherTongue.trim(),
        });
      }

      // Only when it has changed: saving the status alone replaces the marital
      // history, so re-saving this step must not wipe what the next one holds.
      const savedStatus = String(full?.details?.maritalStatus ?? '');
      if (form.maritalStatus && form.maritalStatus !== savedStatus) {
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

  const set = (key: keyof Form, capitalize?: boolean) => (value: string) => {
    setErrors(e => ({ ...e, [key]: '' }));
    setDraft({ ...form, [key]: capitalize ? capitalizeWords(value) : value });
  };

  function submit() {
    let newErrors: Record<string, string> = {};
    if (!photos || photos.length < 3) return setError('At least 3 photographs are required.');
    
    if (!form.firstName.trim()) newErrors.firstName = 'First Name is required.';
    if (!form.lastName.trim()) newErrors.lastName = 'Last Name is required.';
    if (!form.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required.';
    if (!form.gender) newErrors.gender = 'Gender is required.';
    
    const h = Number(form.heightCm);
    if (!form.heightCm || Number.isNaN(h) || h < 120 || h > 230) {
      newErrors.heightCm = 'Height must be between 120cm and 230cm.';
    }
    
    if (!form.complexion) newErrors.complexion = 'Complexion is required.';
    if (!form.maritalStatus) newErrors.maritalStatus = 'Marital Status is required.';
    
    if (!form.religion) newErrors.religion = 'Religion is required.';
    if (!form.caste.trim()) newErrors.caste = 'Caste is required.';
    if (!form.motherTongue.trim()) newErrors.motherTongue = 'Mother Tongue is required.';
    if (!form.communicationAddress.trim()) newErrors.communicationAddress = 'Communication Address is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please fix the errors below.');
      return;
    }

    setErrors({});
    setError('');
    save.mutate();
  }

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <Card>
        <Body tone="muted">
          Add at least 3 photographs — basic information cannot be saved without them.
        </Body>
        {(photos ?? []).length === 0 ? (
          <ProfileSilhouette
            gender={typeof me.gender === 'string' ? me.gender : null}
            style={{ width: 116, height: 84, borderRadius: radius.sm }}
          />
        ) : null}
        {(photos ?? []).length > 1 && onMakePrimary ? (
          <Caption tone="muted">
            Tap “Set as profile photo” under the one you want families to see first.
          </Caption>
        ) : null}
        <MediaStrip
          urls={photos ?? []}
          primary={primaryPhotoUrl ?? photos?.[0] ?? null}
          onMakePrimary={onMakePrimary}
          onRemove={onPhotoRemoved}
        />
        <PhotoPicker
          label="Add a photograph"
          onUploaded={(url) => onPhotoAdded && onPhotoAdded(url)}
        />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <Field label="First Name" value={form.firstName} onChangeText={set('firstName', true)} required autoFilled={autofilledKeys?.has('firstName')} autoCapitalize="sentences" error={errors.firstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Last Name" value={form.lastName} onChangeText={set('lastName', true)} required autoFilled={autofilledKeys?.has('lastName')} autoCapitalize="sentences" error={errors.lastName} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <WowCalendar label="Date of Birth" title="Select Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} maximumDate={maxDob} required autoFilled={autofilledKeys?.has('dateOfBirth')} />
            {errors.dateOfBirth ? <Caption tone="critical">{errors.dateOfBirth}</Caption> : null}
          </View>
          <View style={{ flex: 1 }}>
            <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={set('gender')} required autoFilled={autofilledKeys?.has('gender')} error={errors.gender} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <Field label="Height (cm)" value={form.heightCm} onChangeText={set('heightCm')} keyboardType="number-pad" maxLength={3} required autoFilled={autofilledKeys?.has('heightCm')} error={errors.heightCm} />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField label="Complexion" value={form.complexion} options={COMPLEXIONS} onChange={set('complexion')} required autoFilled={autofilledKeys?.has('complexion')} error={errors.complexion} />
          </View>
        </View>
        
        <SelectField label="Marital Status" value={form.maritalStatus} options={MARITAL} onChange={set('maritalStatus')} required autoFilled={autofilledKeys?.has('maritalStatus')} error={errors.maritalStatus} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <ChoiceField
              label="Religion"
              value={form.religion}
              options={RELIGIONS}
              onChange={(religion) => {
                setErrors(e => ({ ...e, religion: '', caste: '' }));
                setDraft({ ...form, religion, caste: '' });
              }}
              required
              autoFilled={autofilledKeys?.has('religion')}
            />
            {errors.religion ? <Caption tone="critical">{errors.religion}</Caption> : null}
          </View>
          <View style={{ flex: 1 }}>
            <ChoiceField
              key={`caste-${form.religion}`}
              label="Caste"
              value={form.caste}
              options={CASTES_BY_RELIGION[form.religion] ?? []}
              onChange={set('caste')}
              required
              autoFilled={autofilledKeys?.has('caste')}
            />
            {errors.caste ? <Caption tone="critical">{errors.caste}</Caption> : null}
          </View>
        </View>

        <Field label="Sub-Caste" value={form.subCaste} onChangeText={set('subCaste', true)} maxLength={60} autoFilled={autofilledKeys?.has('subCaste')} autoCapitalize="sentences" />
        <ChoiceField label="Mother Tongue" value={form.motherTongue} options={MOTHER_TONGUES} onChange={set('motherTongue')} required autoFilled={autofilledKeys?.has('motherTongue')} />
        {errors.motherTongue ? <Caption tone="critical">{errors.motherTongue}</Caption> : null}
      </Card>

      <Card>
        <ChoiceField
          label="State"
          value={form.state}
          options={STATES_BY_COUNTRY['India'] ?? []}
          onChange={(newState) => {
            setErrors(e => ({ ...e, state: '', location: '' }));
            setDraft({
              ...form,
              state: newState,
              location: districtsForState(newState).includes(form.location) ? form.location : '',
            });
          }}
          autoFilled={autofilledKeys?.has('state')}
        />
        {errors.state ? <Caption tone="critical">{errors.state}</Caption> : null}
        
        <ChoiceField label="City" value={form.location} options={districtsForState(form.state)} onChange={set('location', true)} autoFilled={autofilledKeys?.has('location')} />

        <Field label="Communication Address" value={form.communicationAddress} onChangeText={set('communicationAddress', true)} required autoFilled={autofilledKeys?.has('communicationAddress')} autoCapitalize="sentences" error={errors.communicationAddress} />
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
          disabled={!form.firstName.trim() || !form.lastName.trim()}
          onPress={submit}
        />
      </View>
    </View>
  );
}
