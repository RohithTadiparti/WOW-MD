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
  
  // The server keeps divorced people's end date as divorceDate and everyone else's as separationDate.
  const divorced = details.maritalStatus === 'divorced';

  const [form, setForm] = useState<Form>({
    marriageDate: String(h.marriageDate ?? ''),
    divorceDate: String(h.divorceDate ?? h.separationDate ?? ''),
    yearsMarried: String(h.yearsMarried ?? ''),
    childrenBoys: String(h.boys ?? ''),
    childrenGirls: String(h.girls ?? ''),
    livingWith: String(h.childrenLivingWith ?? ''),
  });

  const save = useMutation({
    mutationFn: async () => {
      const boys = form.childrenBoys ? Number(form.childrenBoys) : undefined;
      const girls = form.childrenGirls ? Number(form.childrenGirls) : undefined;
      const payload = {
        maritalStatus: details.maritalStatus,
        marriageDate: form.marriageDate || undefined,
        [divorced ? 'divorceDate' : 'separationDate']: form.divorceDate || undefined,
        yearsMarried: form.yearsMarried ? Number(form.yearsMarried) : undefined,
        hasChildren: boys === undefined && girls === undefined ? undefined : (boys ?? 0) + (girls ?? 0) > 0,
        boys,
        girls,
        childrenLivingWith: form.livingWith.trim() || undefined,
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
  const setCount = (key: keyof Form) => (value: string) => setForm({ ...form, [key]: value.replace(/\D/g, '') });

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      
      <Card>
        <DateField label="Marriage Date" value={form.marriageDate} onChange={set('marriageDate')} />
        <DateField label="Divorce/Separation Date" value={form.divorceDate} onChange={set('divorceDate')} />
        <Field label="Years Married" value={form.yearsMarried} onChangeText={setCount('yearsMarried')} keyboardType="number-pad" maxLength={2} />
      </Card>
      
      <Card>
        <Field label="Children (Boys)" value={form.childrenBoys} onChangeText={setCount('childrenBoys')} keyboardType="number-pad" maxLength={2} />
        <Field label="Children (Girls)" value={form.childrenGirls} onChangeText={setCount('childrenGirls')} keyboardType="number-pad" maxLength={2} />
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
