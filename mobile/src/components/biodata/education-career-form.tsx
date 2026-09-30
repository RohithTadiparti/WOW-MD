import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField } from '@/components/form';
import { Alert, Body, Button, Card, Field } from '@/components/ui';
import { space } from '@/theme';
import {
  OCCUPATION_STATUS,
  OTHER_INCOME_LIMIT,
  OTHER_INCOME_SOURCES,
  stored,
} from './constants';

interface OtherIncome {
  source: string;
  details: string;
  annualIncome: string;
}

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
  otherIncome: OtherIncome[];
  incomeVisible: string;
}

/** Digits only, as the web form takes them (EZ1-I59). */
const digits = (value: string) => value.replace(/\D/g, '');

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
  const other = Array.isArray(details.otherIncome)
    ? (details.otherIncome as Record<string, unknown>[])
    : [];

  // The web form's keys. This form used to write `location`, `name` and
  // `income` instead, so those are still read for anything saved from here.
  const [form, setForm] = useState<Form>({
    highestQualification: String(details.highestQualification ?? ''),
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
    otherIncome: other.map((row) => ({
      source: String(row.source ?? ''),
      details: String(row.details ?? ''),
      annualIncome: stored(row.annualIncome),
    })),
    incomeVisible: details.incomeVisible ? 'yes' : 'no',
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        highestQualification: form.highestQualification.trim() || undefined,
        course: form.course.trim() || undefined,
        institution: form.institution.trim() || undefined,
        collegePlace: form.collegePlace.trim() || undefined,
        occupationStatus: form.occupationStatus || undefined,
        employment:
          form.occupationStatus === 'employed'
            ? {
                company: form.company.trim() || undefined,
                designation: form.designation.trim() || undefined,
                workLocation: form.workLocation.trim() || undefined,
                salary: digits(form.salary) || undefined,
              }
            : undefined,
        business:
          form.occupationStatus === 'self_employed'
            ? {
                businessName: form.businessName.trim() || undefined,
                businessIncome: digits(form.businessIncome) || undefined,
                businessLocation: form.businessLocation.trim() || undefined,
              }
            : undefined,
        // Rows left without a source are ones somebody added and abandoned.
        otherIncome: form.otherIncome
          .filter((row) => row.source)
          .map((row) => ({
            source: row.source,
            details: row.details.trim() || undefined,
            annualIncome: digits(row.annualIncome) || undefined,
          })),
        // Sent every time: the server treats a missing value as "hide", so
        // leaving it out quietly hid income somebody had chosen to show.
        incomeVisible: form.incomeVisible === 'yes',
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
  const setIncome = (i: number, key: keyof OtherIncome) => (value: string) =>
    setForm({
      ...form,
      otherIncome: form.otherIncome.map((row, j) => (j === i ? { ...row, [key]: value } : row)),
    });

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

        {form.occupationStatus === 'self_employed' && (
          <View style={{ gap: space(2), marginTop: space(2) }}>
            <Field label="Business Name" value={form.businessName} onChangeText={set('businessName')} />
            <Field label="Business Location" value={form.businessLocation} onChangeText={set('businessLocation')} />
            <Field label="Business Income (Annual)" value={form.businessIncome} onChangeText={set('businessIncome')} keyboardType="number-pad" />
          </View>
        )}
      </Card>

      {/*
        Optional, whatever the occupation: plenty of people have a job and a
        business on the side, or rent from a property, and the occupation has
        room for only one answer.
      */}
      <Card>
        <Body style={{ fontWeight: '600' }}>Other Sources of Income (optional)</Body>
        {form.otherIncome.map((row, i) => (
          <View key={i} style={{ gap: space(2), marginTop: space(2) }}>
            <SelectField
              label="Source"
              value={row.source}
              options={OTHER_INCOME_SOURCES}
              onChange={setIncome(i, 'source')}
            />
            <Field label="Details" value={row.details} onChangeText={setIncome(i, 'details')} maxLength={160} />
            <Field
              label="Annual Income"
              value={row.annualIncome}
              onChangeText={setIncome(i, 'annualIncome')}
              keyboardType="number-pad"
            />
            <Button
              label="Remove"
              variant="ghost"
              onPress={() =>
                setForm({ ...form, otherIncome: form.otherIncome.filter((_, j) => j !== i) })
              }
            />
          </View>
        ))}
        {form.otherIncome.length < OTHER_INCOME_LIMIT && (
          <Button
            label={`+ Add ${form.otherIncome.length ? 'another' : 'a'} source of income`}
            variant="outline"
            style={{ marginTop: space(2) }}
            onPress={() =>
              setForm({
                ...form,
                otherIncome: [...form.otherIncome, { source: '', details: '', annualIncome: '' }],
              })
            }
          />
        )}
      </Card>

      <Card>
        <SelectField
          label="Show income on the biodata?"
          value={form.incomeVisible}
          options={[
            { value: 'no', label: 'No, keep it private' },
            { value: 'yes', label: 'Yes' },
          ]}
          onChange={set('incomeVisible')}
        />
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
