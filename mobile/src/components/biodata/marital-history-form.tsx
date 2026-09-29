import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { DateField, SelectField } from '@/components/form';
import { Alert, Button, Card, Field } from '@/components/ui';
import { space } from '@/theme';

interface Form {
  marriageDate: string;
  divorceDate: string;
  yearsMarried: string;
  childrenBoys: string;
  childrenGirls: string;
  livingWith: string;
}

export function MaritalHistoryForm({
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
  
  const h = (details.maritalHistory as Record<string, unknown>) ?? {};
  
  const [form, setForm] = useState<Form>({
    marriageDate: String(h.marriageDate ?? ''),
    divorceDate: String(h.divorceDate ?? ''),
    yearsMarried: String(h.yearsMarried ?? ''),
    childrenBoys: String(h.childrenBoys ?? ''),
    childrenGirls: String(h.childrenGirls ?? ''),
    livingWith: String(h.livingWith ?? ''),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        maritalStatus: details.maritalStatus, // keep existing
        maritalHistory: {
          marriageDate: form.marriageDate || undefined,
          divorceDate: form.divorceDate || undefined,
          yearsMarried: form.yearsMarried ? Number(form.yearsMarried) : undefined,
          childrenBoys: form.childrenBoys ? Number(form.childrenBoys) : undefined,
          childrenGirls: form.childrenGirls ? Number(form.childrenGirls) : undefined,
          livingWith: form.livingWith.trim() || undefined,
        },
      };
      await api.put(`/profiles/${profileId}/details/marital`, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['biodata-details', profileId] });
      await qc.invalidateQueries({ queryKey: ['biodata-completion', profileId] });
      setError('');
      onSaved();
    },
    onError: (err) => setError(apiMessage(err, 'Marital history could not be saved.')),
  });

  const set = (key: keyof Form) => (value: string) => setForm({ ...form, [key]: value });

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      
      <Card>
        <DateField label="Marriage Date" value={form.marriageDate} onChange={set('marriageDate')} />
        <DateField label="Divorce/Separation Date" value={form.divorceDate} onChange={set('divorceDate')} />
        <Field label="Years Married" value={form.yearsMarried} onChangeText={set('yearsMarried')} keyboardType="number-pad" />
      </Card>
      
      <Card>
        <Field label="Children (Boys)" value={form.childrenBoys} onChangeText={set('childrenBoys')} keyboardType="number-pad" />
        <Field label="Children (Girls)" value={form.childrenGirls} onChangeText={set('childrenGirls')} keyboardType="number-pad" />
        <Field label="Living With" value={form.livingWith} onChangeText={set('livingWith')} hint="E.g. Father, Mother, Self" />
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
