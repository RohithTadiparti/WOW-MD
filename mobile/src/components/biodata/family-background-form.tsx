import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { Alert, Button, Card, Field } from '@/components/ui';
import { PROFESSIONS } from '@/shared/reference';
import { space } from '@/theme';
import { ChoiceField, DependentLocation, canonical } from './choice-field';
import { FAMILY_TYPES, FAMILY_STATUSES, LIFE_STATUSES, stored } from './constants';

interface Form {
  fatherName: string;
  fatherProfession: string;
  fatherLifeStatus: string;
  motherName: string;
  motherProfession: string;
  motherLifeStatus: string;
  familyType: string;
  familyStatus: string;
  brothers: string;
  sisters: string;
  familyNetWorth: string;
  nativeCountry: string;
  nativeState: string;
  nativeDistrict: string;
  nativePlace: string;
  isNri: string;
  nriCity: string;
  nriCountry: string;
}

export function FamilyBackgroundForm({
  profileId,
  details,
  onSaved,
  onBack,
  onSkip,
  autofilledKeys,
}: {
  profileId: string;
  details: Record<string, unknown>;
  onSaved: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  autofilledKeys?: Set<string>;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  
  const father = (details.father as Record<string, unknown>) ?? {};
  const mother = (details.mother as Record<string, unknown>) ?? {};
  
  const [form, setForm] = useState<Form>({
    fatherName: String(father.name ?? ''),
    fatherProfession: canonical(String(father.profession ?? ''), PROFESSIONS),
    fatherLifeStatus: String(father.lifeStatus ?? ''),
    motherName: String(mother.name ?? ''),
    motherProfession: canonical(String(mother.profession ?? ''), PROFESSIONS),
    motherLifeStatus: String(mother.lifeStatus ?? ''),
    familyType: String(details.familyType ?? ''),
    familyStatus: String(details.familyStatus ?? ''),
    brothers: stored(details.brothers),
    sisters: stored(details.sisters),
    familyNetWorth: stored(details.familyNetWorth),
    nativeCountry: String(details.nativeCountry ?? ''),
    nativeState: String(details.nativeState ?? ''),
    nativeDistrict: String(details.nativeDistrict ?? ''),
    nativePlace: String(details.nativePlace ?? ''),
    isNri: details.isNri === true ? 'yes' : 'no',
    nriCity: String(details.nriCity ?? ''),
    nriCountry: String(details.nriCountry ?? ''),
  });

  const save = useMutation({
    mutationFn: async () => {
      const nri = form.isNri === 'yes';
      const payload = {
        father: {
          name: form.fatherName.trim(),
          profession: form.fatherProfession.trim() || undefined,
          lifeStatus: form.fatherLifeStatus || undefined,
        },
        mother: {
          name: form.motherName.trim(),
          profession: form.motherProfession.trim() || undefined,
          lifeStatus: form.motherLifeStatus || undefined,
        },
        familyType: form.familyType,
        familyStatus: form.familyStatus,
        brothers: Number(form.brothers) || 0,
        sisters: Number(form.sisters) || 0,
        familyNetWorth: form.familyNetWorth ? Number(form.familyNetWorth) : undefined,
        nativeCountry: form.nativeCountry || undefined,
        nativeState: form.nativeState || undefined,
        nativeDistrict: form.nativeDistrict || undefined,
        nativePlace: form.nativePlace.trim() || undefined,
        isNri: nri,
        nriCity: nri ? form.nriCity.trim() || undefined : undefined,
        nriCountry: nri ? form.nriCountry.trim() || undefined : undefined,
      };
      await api.put(`/profiles/${profileId}/details/family`, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['biodata-details', profileId] });
      await qc.invalidateQueries({ queryKey: ['biodata-completion', profileId] });
      setError('');
      onSaved();
    },
    onError: (err) => setError(apiMessage(err, 'Family background could not be saved.')),
  });

  const set = (key: keyof Form) => (value: string) => setForm({ ...form, [key]: value });

  function submit() {
    if (!form.fatherName.trim() || !form.motherName.trim() || !form.familyType || !form.familyStatus) {
      setError("Father's name, mother's name, family type and family status are needed.");
      return;
    }
    setError('');
    save.mutate();
  }

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      
      <Card>
        <Field label="Father's Name" value={form.fatherName} onChangeText={set('fatherName')} required autoFilled={autofilledKeys?.has('father.name') || autofilledKeys?.has('fatherName')} />
        <ChoiceField label="Father's Profession" value={form.fatherProfession} options={PROFESSIONS} onChange={set('fatherProfession')} autoFilled={autofilledKeys?.has('father.profession') || autofilledKeys?.has('fatherProfession')} />
        <SelectField label="Father's Living Status" value={form.fatherLifeStatus} options={LIFE_STATUSES} onChange={set('fatherLifeStatus')} placeholder="Not said" autoFilled={autofilledKeys?.has('father.lifeStatus') || autofilledKeys?.has('fatherLifeStatus')} />
      </Card>
      
      <Card>
        <Field label="Mother's Name" value={form.motherName} onChangeText={set('motherName')} required autoFilled={autofilledKeys?.has('mother.name') || autofilledKeys?.has('motherName')} />
        <ChoiceField label="Mother's Profession" value={form.motherProfession} options={PROFESSIONS} onChange={set('motherProfession')} autoFilled={autofilledKeys?.has('mother.profession') || autofilledKeys?.has('motherProfession')} />
        <SelectField label="Mother's Living Status" value={form.motherLifeStatus} options={LIFE_STATUSES} onChange={set('motherLifeStatus')} placeholder="Not said" autoFilled={autofilledKeys?.has('mother.lifeStatus') || autofilledKeys?.has('motherLifeStatus')} />
      </Card>
      
      <Card>
        <SelectField label="Family Type" value={form.familyType} options={FAMILY_TYPES} onChange={set('familyType')} required autoFilled={autofilledKeys?.has('familyType')} />
        <SelectField label="Family Status" value={form.familyStatus} options={FAMILY_STATUSES} onChange={set('familyStatus')} required autoFilled={autofilledKeys?.has('familyStatus')} />
        <Field label="Number of Brothers" value={form.brothers} onChangeText={set('brothers')} keyboardType="number-pad" maxLength={2} autoFilled={autofilledKeys?.has('brothers')} />
        <Field label="Number of Sisters" value={form.sisters} onChangeText={set('sisters')} keyboardType="number-pad" maxLength={2} autoFilled={autofilledKeys?.has('sisters')} />
        <Field label="Family Net Worth" value={form.familyNetWorth} onChangeText={set('familyNetWorth')} keyboardType="number-pad" hint="Optional, in Rupees" autoFilled={autofilledKeys?.has('familyNetWorth')} />
      </Card>

      <Card>
        <DependentLocation
          country={form.nativeCountry}
          state={form.nativeState}
          district={form.nativeDistrict}
          onChange={(next) =>
            setForm({ ...form, nativeCountry: next.country, nativeState: next.state, nativeDistrict: next.district })
          }
          labels={{ country: 'Native Country', state: 'Native State', district: 'Native District' }}
          autoFilled={autofilledKeys?.has('nativeCountry') || autofilledKeys?.has('nativeState') || autofilledKeys?.has('nativeDistrict')}
        />
        <Field label="Native Place (village / town)" value={form.nativePlace} onChangeText={set('nativePlace')} maxLength={120} autoFilled={autofilledKeys?.has('nativePlace')} />
        <SelectField
          label="Settled abroad"
          value={form.isNri}
          options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes, an NRI' }]}
          onChange={set('isNri')}
          autoFilled={autofilledKeys?.has('isNri')}
        />
        {form.isNri === 'yes' && (
          <>
            <Field label="City abroad" value={form.nriCity} onChangeText={set('nriCity')} maxLength={120} autoFilled={autofilledKeys?.has('nriCity')} />
            <Field label="Country" value={form.nriCountry} onChangeText={set('nriCountry')} maxLength={80} autoFilled={autofilledKeys?.has('nriCountry')} />
          </>
        )}
      </Card>
      
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
    </View>
  );
}
