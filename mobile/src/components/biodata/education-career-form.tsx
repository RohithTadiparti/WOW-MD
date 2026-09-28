import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { Alert, Button, Card, Field } from '@/components/ui';
import { CITIES, QUALIFICATIONS } from '@/shared/reference';
import { space } from '@/theme';
import { ChoiceField, canonical } from './choice-field';
import { OCCUPATION_STATUS, stored } from './constants';

interface Form {
  highestQualification: string;
  course: string;
  institution: string;
  collegePlace: string;
  occupationStatus: string;
  company: string;
  designation: string;
  workLocation: string;
  salary: string;
  businessName: string;
  businessIncome: string;
  businessLocation: string;
}

export function EducationCareerForm({
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
  
  const emp = (details.employment as Record<string, unknown>) ?? {};
  const bus = (details.business as Record<string, unknown>) ?? {};
  
  const [form, setForm] = useState<Form>({
    highestQualification: canonical(String(details.highestQualification ?? ''), QUALIFICATIONS),
    course: String(details.course ?? ''),
    institution: String(details.institution ?? ''),
    collegePlace: String(details.collegePlace ?? ''),
    occupationStatus: String(details.occupationStatus ?? ''),
    company: String(emp.company ?? ''),
    designation: String(emp.designation ?? ''),
    workLocation: String(emp.workLocation ?? emp.location ?? ''),
    salary: stored(emp.salary),
    businessName: String(bus.businessName ?? bus.name ?? ''),
    businessIncome: stored(bus.businessIncome ?? bus.income),
    businessLocation: String(bus.businessLocation ?? bus.location ?? ''),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        highestQualification: form.highestQualification.trim(),
        course: form.course.trim(),
        institution: form.institution.trim() || undefined,
        collegePlace: form.collegePlace.trim() || undefined,
        occupationStatus: form.occupationStatus,
        employment: form.occupationStatus === 'employed' ? {
          company: form.company.trim(),
          designation: form.designation.trim(),
          workLocation: form.workLocation.trim() || undefined,
          salary: form.salary || undefined,
        } : undefined,
        business: form.occupationStatus === 'self_employed' ? {
          businessName: form.businessName.trim(),
          businessIncome: form.businessIncome || undefined,
          businessLocation: form.businessLocation.trim() || undefined,
        } : undefined,
      };
      await api.put(`/profiles/${profileId}/details/education`, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['biodata-details', profileId] });
      await qc.invalidateQueries({ queryKey: ['biodata-completion', profileId] });
      setError('');
      onSaved();
    },
    onError: (err) => setError(apiMessage(err, 'Education & career could not be saved.')),
  });

  const set = (key: keyof Form) => (value: string) => setForm({ ...form, [key]: value });
  const digits = (key: keyof Form) => (value: string) => set(key)(value.replace(/\D/g, ''));

  function submit() {
    if (!form.highestQualification.trim() || !form.course.trim() || !form.occupationStatus) {
      setError('Highest qualification, course and occupation status are needed.');
      return;
    }
    if (form.occupationStatus === 'employed' && (!form.company.trim() || !form.designation.trim())) {
      setError('Company and designation are needed for an employed candidate.');
      return;
    }
    if (form.occupationStatus === 'self_employed' && !form.businessName.trim()) {
      setError('Business name is needed for a self-employed candidate.');
      return;
    }
    setError('');
    save.mutate();
  }

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      
      <Card>
        <ChoiceField label="Highest Qualification" value={form.highestQualification} options={QUALIFICATIONS} onChange={set('highestQualification')} />
        <Field label="Course" value={form.course} onChangeText={set('course')} />
        <Field label="Institution / College" value={form.institution} onChangeText={set('institution')} />
        <Field label="College Place" value={form.collegePlace} onChangeText={set('collegePlace')} />
      </Card>
      
      <Card>
        <SelectField 
          label="Occupation Status" 
          value={form.occupationStatus} 
          options={OCCUPATION_STATUS} 
          onChange={set('occupationStatus')} 
        />
        
        {form.occupationStatus === 'employed' && (
          <View style={{ gap: space(2), marginTop: space(2) }}>
            <Field label="Company" value={form.company} onChangeText={set('company')} />
            <Field label="Designation" value={form.designation} onChangeText={set('designation')} />
            <ChoiceField label="Work Location" value={form.workLocation} options={CITIES} onChange={set('workLocation')} />
            <Field label="Salary (Annual)" value={form.salary} onChangeText={digits('salary')} keyboardType="number-pad" />
          </View>
        )}
        
        {form.occupationStatus === 'self_employed' && (
          <View style={{ gap: space(2), marginTop: space(2) }}>
            <Field label="Business Name" value={form.businessName} onChangeText={set('businessName')} />
            <Field label="Business Location" value={form.businessLocation} onChangeText={set('businessLocation')} />
            <Field label="Business Income" value={form.businessIncome} onChangeText={digits('businessIncome')} keyboardType="number-pad" />
          </View>
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
