import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { Alert, Button, Card, Field } from '@/components/ui';
import { space } from '@/theme';
import { FAMILY_TYPES, stored } from './constants';

interface Form {
  fatherName: string;
  fatherOccupation: string;
  motherName: string;
  motherOccupation: string;
  familyType: string;
  familyStatus: string;
  brothers: string;
  sisters: string;
  familyNetWorth: string;
}

export function FamilyBackgroundForm({
  profileId,
  details,
  onSaved,
  onBack,
  onSkip,
}: {
  profileId: string;
  details: Record<string, unknown>;
  onSaved: () => void;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  
  const father = (details.father as Record<string, unknown>) ?? {};
  const mother = (details.mother as Record<string, unknown>) ?? {};
  
  const [form, setForm] = useState<Form>({
    fatherName: String(father.name ?? ''),
    fatherOccupation: String(father.occupation ?? ''),
    motherName: String(mother.name ?? ''),
    motherOccupation: String(mother.occupation ?? ''),
    familyType: String(details.familyType ?? ''),
    familyStatus: String(details.familyStatus ?? ''),
    brothers: stored(details.brothers),
    sisters: stored(details.sisters),
    familyNetWorth: stored(details.familyNetWorth),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        father: {
          name: form.fatherName.trim() || undefined,
          occupation: form.fatherOccupation.trim() || undefined,
        },
        mother: {
          name: form.motherName.trim() || undefined,
          occupation: form.motherOccupation.trim() || undefined,
        },
        familyType: form.familyType || undefined,
        familyStatus: form.familyStatus.trim() || undefined,
        brothers: form.brothers ? Number(form.brothers) : undefined,
        sisters: form.sisters ? Number(form.sisters) : undefined,
        familyNetWorth: form.familyNetWorth ? Number(form.familyNetWorth) : undefined,
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

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      
      <Card>
        <Field label="Father's Name" value={form.fatherName} onChangeText={set('fatherName')} />
        <Field label="Father's Occupation" value={form.fatherOccupation} onChangeText={set('fatherOccupation')} />
      </Card>
      
      <Card>
        <Field label="Mother's Name" value={form.motherName} onChangeText={set('motherName')} />
        <Field label="Mother's Occupation" value={form.motherOccupation} onChangeText={set('motherOccupation')} />
      </Card>
      
      <Card>
        <SelectField label="Family Type" value={form.familyType} options={FAMILY_TYPES} onChange={set('familyType')} />
        <Field label="Family Status" value={form.familyStatus} onChangeText={set('familyStatus')} hint="E.g. Middle class, Upper middle class" />
        <Field label="Number of Brothers" value={form.brothers} onChangeText={set('brothers')} keyboardType="number-pad" />
        <Field label="Number of Sisters" value={form.sisters} onChangeText={set('sisters')} keyboardType="number-pad" />
        <Field label="Family Net Worth" value={form.familyNetWorth} onChangeText={set('familyNetWorth')} keyboardType="number-pad" hint="Optional, in Rupees" />
      </Card>
      
      <View style={{ gap: space(2) }}>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          {onBack && (
            <Button label="Back" variant="outline" onPress={onBack} disabled={save.isPending} />
          )}
          <Button style={{ flex: 1 }} label="Save & Continue →" busy={save.isPending} onPress={() => save.mutate()} />
        </View>
        {onSkip && (
          <Button label="Skip this step" variant="ghost" onPress={onSkip} disabled={save.isPending} />
        )}
      </View>
    </View>
  );
}
