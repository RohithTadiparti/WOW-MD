import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { Alert, Button, Card, Field } from '@/components/ui';
import { space } from '@/theme';
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
    highestQualification: String(details.highestQualification ?? ''),
    course: String(details.course ?? ''),
    institution: String(details.institution ?? ''),
    collegePlace: String(details.collegePlace ?? ''),
    occupationStatus: String(details.occupationStatus ?? ''),
    company: String(emp.company ?? ''),
    designation: String(emp.designation ?? ''),
    workLocation: String(emp.location ?? ''),
    salary: stored(emp.salary),
    businessName: String(bus.name ?? ''),
    businessIncome: stored(bus.income),
    businessLocation: String(bus.location ?? ''),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        highestQualification: form.highestQualification.trim() || undefined,
        course: form.course.trim() || undefined,
        institution: form.institution.trim() || undefined,
        collegePlace: form.collegePlace.trim() || undefined,
        occupationStatus: form.occupationStatus || undefined,
        employment: form.occupationStatus === 'employed' ? {
          company: form.company.trim() || undefined,
          designation: form.designation.trim() || undefined,
          location: form.workLocation.trim() || undefined,
          salary: form.salary ? Number(form.salary) : undefined,
        } : undefined,
        business: form.occupationStatus === 'business' ? {
          name: form.businessName.trim() || undefined,
          income: form.businessIncome ? Number(form.businessIncome) : undefined,
          location: form.businessLocation.trim() || undefined,
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

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      
      <Card>
        <Field label="Highest Qualification" value={form.highestQualification} onChangeText={set('highestQualification')} />
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
            <Field label="Work Location" value={form.workLocation} onChangeText={set('workLocation')} />
            <Field label="Salary (Annual)" value={form.salary} onChangeText={set('salary')} keyboardType="number-pad" />
          </View>
        )}
        
        {form.occupationStatus === 'business' && (
          <View style={{ gap: space(2), marginTop: space(2) }}>
            <Field label="Business Name" value={form.businessName} onChangeText={set('businessName')} />
            <Field label="Business Location" value={form.businessLocation} onChangeText={set('businessLocation')} />
            <Field label="Business Income" value={form.businessIncome} onChangeText={set('businessIncome')} keyboardType="number-pad" />
          </View>
        )}
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
