import { useState } from 'react';
import { View } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { DetailGrid, DetailRow } from '@/components/chrome';
import { SelectField } from '@/components/form';
import { Alert, Button, Caption, Card, Field, SectionTitle } from '@/components/ui';
import { space } from '@/theme';
import { NRI_OPTIONS, NRI_LABEL, stored } from './constants';

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
    religion: String(bag.religion ?? ''),
    caste: String(bag.caste ?? ''),
    education: String(bag.education ?? ''),
    profession: String(bag.profession ?? ''),
    locations: String(bag.locations ?? ''),
    complexion: String(bag.complexion ?? ''),
    preferredRashis: String(bag.preferredRashis ?? ''),
    preferredStars: String(bag.preferredStars ?? ''),
    nriPreference: String(bag.nriPreference ?? ''),
    preferredNriCountry: String(bag.preferredNriCountry ?? ''),
    anythingElse: String(bag.anythingElse ?? ''),
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
          ...(form.complexion.trim() ? { complexion: form.complexion.trim() } : {}),
          ...(form.preferredRashis.trim() ? { preferredRashis: form.preferredRashis.trim() } : {}),
          ...(form.preferredStars.trim() ? { preferredStars: form.preferredStars.trim() } : {}),
          ...(form.anythingElse.trim() ? { anythingElse: form.anythingElse.trim() } : {}),
        },
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

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function submit() {
    const ranges = [
      form.preferredAgeMin,
      form.preferredAgeMax,
      form.preferredHeightMinCm,
      form.preferredHeightMaxCm,
    ];
    if (ranges.some((value) => !value.trim())) {
      setError('Give both ends of the age range and the height range before saving.');
      return;
    }
    if (Number(form.preferredAgeMin) > Number(form.preferredAgeMax)) {
      setError('The minimum age cannot be above the maximum.');
      return;
    }
    if (Number(form.preferredHeightMinCm) > Number(form.preferredHeightMaxCm)) {
      setError('The minimum height cannot be above the maximum.');
      return;
    }
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
                <Field label="Age from" value={form.preferredAgeMin} onChangeText={set('preferredAgeMin')} keyboardType="number-pad" maxLength={3} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Age to" value={form.preferredAgeMax} onChangeText={set('preferredAgeMax')} keyboardType="number-pad" maxLength={3} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: space(2) }}>
              <View style={{ flex: 1 }}>
                <Field label="Height from (cm)" value={form.preferredHeightMinCm} onChangeText={set('preferredHeightMinCm')} keyboardType="number-pad" maxLength={3} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Height to (cm)" value={form.preferredHeightMaxCm} onChangeText={set('preferredHeightMaxCm')} keyboardType="number-pad" maxLength={3} />
              </View>
            </View>

            <Field label="Religion" value={form.religion} onChangeText={set('religion')} />
            <Field label="Caste" value={form.caste} onChangeText={set('caste')} />
            <Field label="Education" value={form.education} onChangeText={set('education')} />
            <Field label="Profession" value={form.profession} onChangeText={set('profession')} />
            <Field label="Preferred Location" value={form.locations} onChangeText={set('locations')} hint="One or more towns, separated by commas." />
            <Field label="Complexion" value={form.complexion} onChangeText={set('complexion')} />
            <Field label="Preferred Rashis" value={form.preferredRashis} onChangeText={set('preferredRashis')} />
            <Field label="Preferred Stars" value={form.preferredStars} onChangeText={set('preferredStars')} />

            <SelectField
              label="Is the partner an NRI?"
              value={form.nriPreference}
              options={NRI_OPTIONS}
              onChange={set('nriPreference')}
              placeholder="No preference"
            />
            {form.nriPreference === 'yes' ? (
              <Field
                label="Preferred NRI country"
                value={form.preferredNriCountry}
                onChangeText={set('preferredNriCountry')}
                placeholder="USA, UK, Canada, Australia…"
                maxLength={120}
              />
            ) : null}

            <Field label="Anything Else" value={form.anythingElse} onChangeText={set('anythingElse')} />

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
              <DetailRow label="Complexion">{String(bag.complexion ?? '—')}</DetailRow>
              <DetailRow label="Rashis">{String(bag.preferredRashis ?? '—')}</DetailRow>
              <DetailRow label="Stars">{String(bag.preferredStars ?? '—')}</DetailRow>
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
