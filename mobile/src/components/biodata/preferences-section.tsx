import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { DetailGrid, DetailRow } from '@/components/chrome';
import { SelectField } from '@/components/form';
import { Alert, Button, Caption, Card, Field, SectionTitle } from '@/components/ui';
import { CASTES_BY_RELIGION, CITIES, PADAMS, PROFESSIONS, QUALIFICATIONS, RASHIS, RELIGIONS } from '@/shared/reference';
import { space } from '@/theme';
import { ChoiceField, canonical } from './choice-field';
import { capitalizeWords } from '@/lib/format';
import {
  COMPLEXIONS,
  HOROSCOPE_EXPECTATIONS,
  KUJA_PREFERENCES,
  NRI_OPTIONS,
  NRI_LABEL,
  stored,
} from './constants';

const labelOf = (options: { value: string; label: string }[], value: unknown) =>
  options.find((o) => o.value === value)?.label ?? (value ? String(value) : '—');

export function PreferencesSection({
  profileId,
  details,
  onSaved,
  onBack,
  onSkip,
  startEditing = false,
  isWizard = false,
  scrollRef,
}: {
  profileId: string;
  details: Record<string, unknown>;
  onSaved: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  startEditing?: boolean;
  isWizard?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
}) {
  const bag = (details.partnerPreferences as Record<string, unknown> | undefined) ?? {};
  const [editing, setEditing] = useState(isWizard || startEditing);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    preferredAgeMin: stored(details.preferredAgeMin),
    preferredAgeMax: stored(details.preferredAgeMax),
    preferredHeightMinCm: stored(details.preferredHeightMinCm),
    preferredHeightMaxCm: stored(details.preferredHeightMaxCm),
    religion: canonical(String(bag.religion ?? ''), RELIGIONS),
    caste: String(bag.caste ?? ''),
    education: canonical(String(bag.education ?? ''), QUALIFICATIONS),
    profession: canonical(String(bag.profession ?? ''), PROFESSIONS),
    locations: canonical(String(bag.locations ?? ''), CITIES),
    complexion: String(bag.complexion ?? '').toLowerCase(),
    horoscopeExpectation: String(bag.horoscopeExpectation ?? ''),
    kujaDosham: String(bag.kujaDosham ?? ''),
    preferredRashi: canonical(String(bag.preferredRashi ?? bag.preferredRashis ?? ''), RASHIS),
    nriPreference: String(bag.nriPreference ?? ''),
    preferredNriCountry: capitalizeWords(String(bag.preferredNriCountry ?? '')),
    other: String(bag.other ?? bag.anythingElse ?? ''),
  });

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/profiles/${profileId}/details/preferences`, {
        preferredAgeMin: Number(form.preferredAgeMin),
        preferredAgeMax: Number(form.preferredAgeMax),
        preferredHeightMinCm: Number(form.preferredHeightMinCm),
        preferredHeightMaxCm: Number(form.preferredHeightMaxCm),
        preferences: {
          ...(form.religion.trim() ? { religion: form.religion.trim() } : {}),
          ...(form.caste.trim() ? { caste: form.caste.trim() } : {}),
          ...(form.education.trim() ? { education: form.education.trim() } : {}),
          ...(form.profession.trim() ? { profession: form.profession.trim() } : {}),
          ...(form.locations.trim() ? { locations: form.locations.trim() } : {}),
          ...(form.complexion ? { complexion: form.complexion } : {}),
          ...(form.other.trim() ? { other: form.other.trim() } : {}),
        },
        ...(form.horoscopeExpectation ? { horoscopeExpectation: form.horoscopeExpectation } : {}),
        ...(form.kujaDosham ? { kujaDosham: form.kujaDosham } : {}),
        ...(form.preferredRashi ? { preferredRashi: form.preferredRashi } : {}),
        ...(form.nriPreference ? { nriPreference: form.nriPreference } : {}),
        ...(form.nriPreference === 'yes' && form.preferredNriCountry.trim()
          ? { preferredNriCountry: form.preferredNriCountry.trim() }
          : {}),
      });
    },
    onSuccess: () => {
      setError('');
      setNotice('Saved. Matches are scored against this from now on.');
      if (!isWizard) setEditing(false);
      onSaved();
    },
    onError: (err) => setError(apiMessage(err, 'Those preferences could not be saved.')),
  });

  const set = (key: keyof typeof form, capitalize?: boolean) => (value: string) =>
    setForm((current) => ({ ...current, [key]: capitalize ? capitalizeWords(value) : value }));

  function submit() {
    let newErrors: Record<string, string> = {};

    const ageMin = form.preferredAgeMin.trim();
    const ageMax = form.preferredAgeMax.trim();
    if (!ageMin) newErrors.preferredAgeMin = 'Please enter both Age From and Age To.';
    if (!ageMax) newErrors.preferredAgeMax = 'Please enter both Age From and Age To.';
    if (ageMin && ageMax && Number(ageMin) > Number(ageMax)) {
      newErrors.preferredAgeMin = 'Age From cannot be greater than Age To.';
    }

    const heightMin = form.preferredHeightMinCm.trim();
    const heightMax = form.preferredHeightMaxCm.trim();
    if (!heightMin) newErrors.preferredHeightMinCm = 'Please enter both Height From and Height To.';
    if (!heightMax) newErrors.preferredHeightMaxCm = 'Please enter both Height From and Height To.';
    if (heightMin && heightMax && Number(heightMin) > Number(heightMax)) {
      newErrors.preferredHeightMinCm = 'Height From cannot be greater than Height To.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('');
      if (scrollRef?.current) {
        scrollRef.current.scrollTo({ y: 0, animated: true });
      }
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
        {!isWizard && <SectionTitle>Partner preferences</SectionTitle>}
        {notice && !isWizard ? <Alert tone="positive">{notice}</Alert> : null}

        {editing ? (
          <>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <Field label="Age from" value={form.preferredAgeMin} onChangeText={set('preferredAgeMin')} keyboardType="number-pad" maxLength={3} required error={errors.preferredAgeMin} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Age to" value={form.preferredAgeMax} onChangeText={set('preferredAgeMax')} keyboardType="number-pad" maxLength={3} required error={errors.preferredAgeMax} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <Field label="Height from (cm)" value={form.preferredHeightMinCm} onChangeText={set('preferredHeightMinCm')} keyboardType="number-pad" maxLength={3} required error={errors.preferredHeightMinCm} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Height to (cm)" value={form.preferredHeightMaxCm} onChangeText={set('preferredHeightMaxCm')} keyboardType="number-pad" maxLength={3} required error={errors.preferredHeightMaxCm} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <ChoiceField
                  label="Religion"
                  value={form.religion}
                  options={RELIGIONS}
                  placeholder="No preference"
                  onChange={(religion) => setForm((current) => ({ ...current, religion, caste: '' }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ChoiceField
                  key={`caste-${form.religion}`}
                  label="Caste"
                  value={form.caste}
                  options={CASTES_BY_RELIGION[form.religion] ?? []}
                  placeholder="No preference"
                  onChange={set('caste')}
                />
              </View>
            </View>
            
            <ChoiceField label="Education" value={form.education} options={QUALIFICATIONS} placeholder="No preference" onChange={set('education')} />
            <ChoiceField label="Profession" value={form.profession} options={PROFESSIONS} placeholder="No preference" onChange={set('profession')} />
            <ChoiceField label="Preferred Location" value={form.locations} options={CITIES} placeholder="No preference" onChange={set('locations')} />

            <SelectField
              label="Complexion"
              value={form.complexion}
              options={[{ value: '', label: 'No preference' }, ...COMPLEXIONS]}
              placeholder="No preference"
              onChange={set('complexion')}
            />

            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <SelectField
                  label="Horoscope"
                  value={form.horoscopeExpectation}
                  options={[{ value: '', label: 'No preference' }, ...HOROSCOPE_EXPECTATIONS]}
                  placeholder="No preference"
                  onChange={set('horoscopeExpectation')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SelectField
                  label="Kuja dosham"
                  value={form.kujaDosham}
                  options={[{ value: '', label: 'No preference' }, ...KUJA_PREFERENCES]}
                  placeholder="No preference"
                  onChange={set('kujaDosham')}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <ChoiceField label="Preferred Rashi" value={form.preferredRashi} options={RASHIS} placeholder="No preference" allowOther={false} onChange={set('preferredRashi')} />
              </View>
              <View style={{ flex: 1 }}>
                <SelectField
                  label="Is NRI?"
                  value={form.nriPreference}
                  options={NRI_OPTIONS}
                  onChange={set('nriPreference')}
                  placeholder="No preference"
                />
              </View>
            </View>
            {form.nriPreference === 'yes' ? (
              <Field
                label="Preferred NRI country"
                value={form.preferredNriCountry}
                onChangeText={set('preferredNriCountry', true)}
                placeholder="USA, UK, Canada, Australia…"
                maxLength={120}
                autoCapitalize="sentences"
              />
            ) : null}

            <Field label="Looking for Anything Else" value={form.other} onChangeText={set('other')} />

            {!isWizard && (
              <View style={{ gap: space(2) }}>
                <Button label="Save preferences" busy={save.isPending} onPress={submit} />
                <Button
                  label="Cancel"
                  variant="outline"
                  disabled={save.isPending}
                  onPress={() => {
                    setEditing(false);
                    setError('');
                  }}
                />
              </View>
            )}
          </>
        ) : (
          <>
            <DetailGrid>
              <DetailRow label="Age">{`${details.preferredAgeMin ?? '—'} to ${details.preferredAgeMax ?? '—'}`}</DetailRow>
              <DetailRow label="Height">{`${details.preferredHeightMinCm ?? '—'} to ${details.preferredHeightMaxCm ?? '—'} cm`}</DetailRow>
              <DetailRow label="Religion">{String(bag.religion ?? '—')}</DetailRow>
              <DetailRow label="Caste">{String(bag.caste ?? '—')}</DetailRow>
              <DetailRow label="Education">{String(bag.education ?? '—')}</DetailRow>
              <DetailRow label="Profession">{String(bag.profession ?? '—')}</DetailRow>
              <DetailRow label="Location">{String(bag.locations ?? '—')}</DetailRow>
              <DetailRow label="Complexion">{labelOf(COMPLEXIONS, bag.complexion)}</DetailRow>
              <DetailRow label="Horoscope">{labelOf(HOROSCOPE_EXPECTATIONS, bag.horoscopeExpectation)}</DetailRow>
              <DetailRow label="Kuja dosham">{labelOf(KUJA_PREFERENCES, bag.kujaDosham)}</DetailRow>
              <DetailRow label="Rashi">{String(bag.preferredRashi ?? bag.preferredRashis ?? '—')}</DetailRow>
              <DetailRow label="NRI">{NRI_LABEL[String(bag.nriPreference ?? '')] ?? 'Not said'}</DetailRow>
              {bag.nriPreference === 'yes' ? <DetailRow label="Country">{String(bag.preferredNriCountry ?? '—')}</DetailRow> : null}
            </DetailGrid>
            <Button label="Edit preferences" variant="outline" small onPress={() => setEditing(true)} />
            <Caption tone="faint">
              Matches are scored against these.
            </Caption>
          </>
        )}
      </Card>

      {isWizard && (
        <View style={{ gap: space(2) }}>
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            {onBack && (
              <Button label="Back" variant="outline" onPress={onBack} disabled={save.isPending} />
            )}
            <Button style={{ flex: 1 }} label="Save & Continue →" busy={save.isPending} onPress={submit} />
          </View>
          {onSkip && (
            <Button label="Skip this step" variant="ghost" onPress={onSkip} disabled={save.isPending} />
          )}
        </View>
      )}
    </View>
  );
}
