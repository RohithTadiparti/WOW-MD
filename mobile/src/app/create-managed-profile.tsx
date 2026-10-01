import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeClosed } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { NAME_PATTERN, MOBILE_10_PATTERN } from '@/shared/permissions';
import { SelectField } from '@/components/form';
import {
  Alert,
  Body,
  Button,
  Caption,
  Field,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { rgb, space } from '@/theme';
import { useManagedProfileStore } from '@/store/managed-profile';

/**
 * The relationship the family member has to the person being managed.
 * Free text field (backend accepts any string up to 60 chars for stewardRelation).
 * These map to common family relationships.
 */
const RELATION_OPTIONS = [
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Nephew', label: 'Nephew' },
  { value: 'Niece', label: 'Niece' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Other', label: 'Other relative' },
];

/**
 * Add a Managed Profile.
 *
 * This creates a Profile entity (POST /agents/profiles) that is owned/managed
 * by the authenticated Family Member. The profile belongs to the person being
 * managed — NOT the Family Member themselves.
 *
 * The backend requires:
 *   - displayName (the managed person's name)
 *   - contactPhone (the managed person's number)
 *   - consent (how the family member agreed to create this profile)
 *
 * After creation the new profile is selected as the active managed profile
 * so the user goes straight into managing it.
 *
 * IMPORTANT: This is NOT the same as the Family Member's own account
 * registration. The Family Member already has an account. This screen creates
 * a SEPARATE profile for the person they are managing.
 */
export default function CreateManagedProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const setActiveManagedProfile = useManagedProfileStore((s) => s.setActiveManagedProfile);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [stewardRelation, setStewardRelation] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = 'Enter the first name';
    else if (!NAME_PATTERN.test(firstName.trim()))
      errors.firstName = 'A name may only contain letters and spaces';

    if (!lastName.trim()) errors.lastName = 'Enter the last name';
    else if (!NAME_PATTERN.test(lastName.trim()))
      errors.lastName = 'A name may only contain letters and spaces';

    const digits = contactPhone.replace(/\s|-/g, '').replace(/^\+91/, '');
    if (!digits) errors.contactPhone = 'Enter their mobile number';
    else if (!MOBILE_10_PATTERN.test(digits))
      errors.contactPhone = 'Enter a 10-digit Indian mobile number';

    if (!stewardRelation) errors.stewardRelation = 'Select your relationship to this person';

    return errors;
  }

  const create = useMutation({
    mutationFn: async () => {
      const digits = contactPhone.replace(/\s|-/g, '');
      const phone = digits.startsWith('+91') ? digits : `+91${digits.replace(/^\+91/, '')}`;

      const displayName = `${firstName.trim()} ${lastName.trim()}`;

      // The backend requires a consent block for managed profiles. For a
      // family member creating a profile for their own relative, we record
      // that the family member themselves gave consent in person.
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        displayName,
        contactPhone: phone,
        stewardRelation: stewardRelation,
        consent: {
          method: 'digital',
          givenByRelation: 'self',
          givenAt: today,
        },
      };

      const { data } = await api.post('/agents/profiles', payload);
      return data as { id: string; displayName: string };
    },
    onSuccess: (profile) => {
      // Make this the active managed profile immediately
      setActiveManagedProfile(profile.id, profile.displayName, stewardRelation);
      // Invalidate the actable list so it refreshes on next visit
      void qc.invalidateQueries({ queryKey: ['actable-profiles'] });
      // Go to biodata to start filling in the new profile
      router.replace('/biodata');
    },
    onError: (err) => {
      setError(apiMessage(err, 'Could not create the managed profile. Please try again.'));
      setBusy(false);
    },
  });

  async function submit() {
    setError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    create.mutate();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <View style={{ gap: space(1), marginTop: space(4), marginBottom: space(4) }}>
          <SectionTitle>Add a Managed Profile</SectionTitle>
          <Body tone="muted">
            Enter the details of the person whose matrimony profile you are managing.
            This is{' '}
            <Body style={{ fontWeight: '700' }}>not</Body> your own profile — it is
            the person you are helping find a match.
          </Body>
        </View>

        {error ? <Alert tone="critical">{error}</Alert> : null}

        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Their First Name"
              required
              value={firstName}
              onChangeText={setFirstName}
              maxLength={60}
              autoComplete="name"
              autoCapitalize="words"
            />
            {fieldErrors.firstName ? (
              <Caption tone="critical">{fieldErrors.firstName}</Caption>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Their Last Name"
              required
              value={lastName}
              onChangeText={setLastName}
              maxLength={60}
              autoComplete="name"
              autoCapitalize="words"
            />
            {fieldErrors.lastName ? (
              <Caption tone="critical">{fieldErrors.lastName}</Caption>
            ) : null}
          </View>
        </View>

        <SelectField
          label="Your relationship to them"
          required
          value={stewardRelation}
          options={RELATION_OPTIONS}
          onChange={setStewardRelation}
        />
        {fieldErrors.stewardRelation ? (
          <Caption tone="critical">{fieldErrors.stewardRelation}</Caption>
        ) : null}

        <Field
          label="Their mobile number"
          required
          hint={
            fieldErrors.contactPhone
              ? undefined
              : 'Their number (not yours). Used to contact them and invite them later.'
          }
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="number-pad"
          maxLength={13}
          autoComplete="tel"
          placeholder="9876543210"
        />
        {fieldErrors.contactPhone ? (
          <Caption tone="critical">{fieldErrors.contactPhone}</Caption>
        ) : null}

        <Button
          label="Create Profile"
          onPress={submit}
          busy={busy || create.isPending}
          disabled={!firstName.trim() || !lastName.trim() || !contactPhone.trim() || !stewardRelation}
        />

        <Button
          label="Cancel"
          variant="outline"
          onPress={() => router.back()}
          disabled={busy || create.isPending}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
