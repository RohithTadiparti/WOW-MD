import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { cmToFeetInches, feetInchesToCm, formatHeight, heightPartsError, heightPartsFromCm } from '@/shared/height';
import { DetailGrid, DetailRow } from '@/components/chrome';
import { SelectField } from '@/components/form';
import { Alert, Button, Caption, Card, Field, SectionTitle, useFieldAnchors } from '@/components/ui';
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
}: {
  profileId: string;
  details: Record<string, unknown>;
  onSaved: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  startEditing?: boolean;
  isWizard?: boolean;
}) {
  const bag = (details.partnerPreferences as Record<string, unknown> | undefined) ?? {};
  const [editing, setEditing] = useState(isWizard || startEditing);
  const [error, setError] = useState('');
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
  const heightSource = `${form.preferredHeightMinCm}|${form.preferredHeightMaxCm}`;
  const heightSourceRef = useRef(heightSource);
  const [heightParts, setHeightParts] = useState({
    preferredHeightMinCm: heightPartsFromCm(form.preferredHeightMinCm),
    preferredHeightMaxCm: heightPartsFromCm(form.preferredHeightMaxCm),
  });

  useEffect(() => {
    if (heightSourceRef.current === heightSource) return;
    heightSourceRef.current = heightSource;
    setHeightParts({
      preferredHeightMinCm: heightPartsFromCm(form.preferredHeightMinCm),
      preferredHeightMaxCm: heightPartsFromCm(form.preferredHeightMaxCm),
    });
  }, [heightSource, form.preferredHeightMinCm, form.preferredHeightMaxCm]);

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

  // The age and height ranges are what the completion check and the match
  // search read, so all four ends are required, each with its own message.
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { anchor, revealFirst } = useFieldAnchors([
    'preferredAgeMin', 'preferredAgeMax', 'preferredHeightMinCm', 'preferredHeightMaxCm',
  ]);

  const set = (key: keyof typeof form, capitalize?: boolean) => (value: string) => {
    setErrors((current) => ({ ...current, [key]: '' }));
    setForm((current) => ({ ...current, [key]: capitalize ? capitalizeWords(value) : value }));
  };

  function submit() {
    const REQUIRED = 'This field is required.';
    const next: Record<string, string> = {};
    if (!form.preferredAgeMin.trim()) next.preferredAgeMin = REQUIRED;
    if (!form.preferredAgeMax.trim()) next.preferredAgeMax = REQUIRED;
    for (const key of ['preferredHeightMinCm', 'preferredHeightMaxCm'] as const) {
      const parts = heightParts[key];
      if (!parts.feet && !parts.inches) next[key] = REQUIRED;
      else if (heightPartsError(parts, true) || feetInchesToCm(parts.feet, parts.inches) === null) {
        next[key] = heightPartsError(parts, true) ?? 'Enter a height between 3 ft 0 in and 8 ft 0 in.';
      }
    }
    if (!next.preferredAgeMin && !next.preferredAgeMax && Number(form.preferredAgeMin) > Number(form.preferredAgeMax)) {
      next.preferredAgeMax = 'Must not be below the minimum age.';
    }
    const minHeight = feetInchesToCm(heightParts.preferredHeightMinCm.feet, heightParts.preferredHeightMinCm.inches);
    const maxHeight = feetInchesToCm(heightParts.preferredHeightMaxCm.feet, heightParts.preferredHeightMaxCm.inches);
    if (!next.preferredHeightMaxCm && minHeight !== null && maxHeight !== null && minHeight > maxHeight) {
      next.preferredHeightMaxCm = 'Must not be below the minimum height.';
    }
    setErrors(next);
    setError('');
    if (Object.keys(next).length > 0) {
      revealFirst(next);
      return;
    }
    save.mutate();
  }

  const heightFields = [
    { key: 'preferredHeightMinCm' as const, label: 'Height from', height: heightParts.preferredHeightMinCm },
    { key: 'preferredHeightMaxCm' as const, label: 'Height to', height: heightParts.preferredHeightMaxCm },
  ];
  const updateHeight = (key: typeof heightFields[number]['key'], unit: 'feet' | 'inches', value: string) => {
    const next = { ...heightParts[key], [unit]: value };
    setHeightParts((current) => ({ ...current, [key]: next }));
    setErrors((current) => ({ ...current, [key]: '' }));
    const cm = feetInchesToCm(next.feet, next.inches);
    if (cm !== null) setForm((current) => ({ ...current, [key]: String(cm) }));
    else if (!next.feet && !next.inches) setForm((current) => ({ ...current, [key]: '' }));
  };

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <Card>
        {!isWizard && <SectionTitle>Partner preferences</SectionTitle>}
        {notice && !isWizard ? <Alert tone="positive">{notice}</Alert> : null}

        {editing ? (
          <>
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }} ref={anchor('preferredAgeMin')} collapsable={false}>
                <Field label="Age from" required value={form.preferredAgeMin} onChangeText={set('preferredAgeMin')} keyboardType="number-pad" maxLength={3} error={errors.preferredAgeMin} />
              </View>
              <View style={{ flex: 1 }} ref={anchor('preferredAgeMax')} collapsable={false}>
                <Field label="Age to" required value={form.preferredAgeMax} onChangeText={set('preferredAgeMax')} keyboardType="number-pad" maxLength={3} error={errors.preferredAgeMax} />
              </View>
            </View>

          {heightFields.map(({ key, label, height }) => (
            <View key={key} ref={anchor(key)} collapsable={false} style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <Field label={`${label} (feet)`} required value={height.feet}
                  onChangeText={(value) => updateHeight(key, 'feet', value)} keyboardType="number-pad" maxLength={1} error={errors[key]} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={`${label} (inches)`} required value={height.inches}
                  onChangeText={(value) => updateHeight(key, 'inches', value)} keyboardType="number-pad" maxLength={2} />
              </View>
            </View>
          ))}

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
                autoCapitalize="words"
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
