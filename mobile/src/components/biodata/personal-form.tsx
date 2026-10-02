import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, apiMessage } from '@/lib/api';
import { SelectField, Textarea } from '@/components/form';
import { Alert, Button, Card, Field, Caption, Body, useFieldAnchors } from '@/components/ui';
import { CASTES_BY_RELIGION, MOTHER_TONGUES, RELIGIONS } from '@/shared/reference';
import { STATES_BY_COUNTRY, districtsForState, DISTRICTS_BY_STATE } from '@/shared/locations';
import { radius, space } from '@/theme';
import { MAX_HEIGHT_CM, MIN_HEIGHT_CM, heightPartsError, heightPartsFromCm, feetInchesToCm } from '@/shared/height';
import { ProfileSilhouette } from '@/components/profile-silhouette';
import { ChoiceField, canonical } from './choice-field';
import { WowCalendar } from '@/components/common/WowCalendar';
import { MediaStrip, PhotoPicker } from '@/components/uploader';
import { capitalizeWords } from '@/lib/format';
import { GENDERS, MARITAL, COMPLEXIONS, displayNameOf, namesFrom, stored } from './constants';

interface Form {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  maritalStatus: string;
  religion: string;
  caste: string;
  subCaste: string;
  motherTongue: string;
  state: string;
  location: string;
  communicationAddress: string;
  alternateMobile: string;
  complexion: string;
  bio: string;
}

/** The order fields appear in, so an error scrolls to the first one on screen. */
const FIELD_ORDER = [
  'photos', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'heightCm', 'complexion',
  'maritalStatus', 'religion', 'caste', 'motherTongue', 'communicationAddress',
] as const;

const REQUIRED = 'This field is required.';

/** "bride" / "groom" as the profile's gender, for a managed profile with none stored yet. */
const genderOfRole = (role: unknown) =>
  role === 'bride' ? 'female' : role === 'groom' ? 'male' : '';

function formFrom(
  signedIn: Record<string, unknown>,
  full?: { details?: Record<string, unknown> | null; dateOfBirth?: string | null; profile?: Record<string, unknown> | null },
  fixedGender?: string | null,
  ownProfile = true,
): Form {
  const d = (full?.details ?? {}) as Record<string, unknown>;
  const profile = full?.profile ?? {};
  // A family member's own account is never a source for the person they
  // manage: falling back to it is how the parent's gender, date of birth and
  // city appeared on the bride's form. Only the account holder's own biodata
  // reads the account.
  const subject = ownProfile ? signedIn : {};
  const religion = canonical(String(d.religion ?? ''), RELIGIONS);
  const city = String(profile.city ?? subject.city ?? '');
  // A state read from a document is used as given when it is on the list;
  // otherwise it is worked out from the city, as before.
  const states = STATES_BY_COUNTRY['India'] ?? [];
  let state = canonical(String(d.state ?? ''), states);
  if (!states.includes(state)) state = '';
  for (const [s, cities] of Object.entries(DISTRICTS_BY_STATE)) {
    if (state) break;
    if (cities.includes(city)) {
      state = s;
      break;
    }
  }

  const names = namesFrom(profile.displayName ?? subject.displayName, d);
  return {
    firstName: capitalizeWords(names.firstName),
    lastName: capitalizeWords(names.lastName),
    dateOfBirth: String(profile.dateOfBirth ?? full?.dateOfBirth ?? subject.dateOfBirth ?? '').slice(0, 10),
    gender:
      fixedGender ??
      (String(profile.gender ?? subject.gender ?? '').toLowerCase() || genderOfRole(profile.managingFor)),
    heightCm: stored(d.heightCm),
    maritalStatus: String(d.maritalStatus ?? ''),
    religion,
    caste: canonical(String(d.caste ?? ''), CASTES_BY_RELIGION[religion] ?? []),
    subCaste: String(d.subCaste ?? ''),
    motherTongue: canonical(String(d.motherTongue ?? ''), MOTHER_TONGUES),
    state,
    location: capitalizeWords(city),
    communicationAddress: capitalizeWords(String(d.communicationAddress ?? '')),
    alternateMobile: String(d.alternateMobile ?? ''),
    complexion: String(d.complexion ?? ''),
    bio: String(profile.bio ?? subject.bio ?? ''),
  };
}

export function PersonalForm({
  profileId,
  me,
  full,
  photos,
  onPhotoAdded,
  onPhotoRemoved,
  primaryPhotoUrl,
  onMakePrimary,
  onSaved,
  onBack,
  autofilledKeys,
  syncAccount = true,
  fixedGender = null,
}: {
  profileId: string | null;
  me: Record<string, unknown>;
  full?: { details?: Record<string, unknown> | null; dateOfBirth?: string | null; profile?: Record<string, unknown> | null };
  photos?: string[];
  onPhotoAdded?: (url: string) => void;
  onPhotoRemoved?: (url: string) => void;
  /** The photo shown first; when given with onMakePrimary, the person can choose it. */
  primaryPhotoUrl?: string | null;
  onMakePrimary?: (url: string) => void;
  onSaved: () => void;
  onBack?: () => void;
  autofilledKeys?: Set<string>;
  /** Only the account holder's own biodata may update /users/me/profile. */
  syncAccount?: boolean;
  /** Bride/groom accounts inherit gender from their role. */
  fixedGender?: string | null;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Form | null>(null);

  const form = draft ?? formFrom(me, full, fixedGender, syncAccount);
  const { anchor, revealFirst } = useFieldAnchors(FIELD_ORDER);
  const heightSource = form.heightCm;
  const heightSourceRef = useRef(heightSource);
  const [heightParts, setHeightParts] = useState(() => heightPartsFromCm(heightSource));

  useEffect(() => {
    if (heightSourceRef.current === heightSource) return;
    heightSourceRef.current = heightSource;
    setHeightParts(heightPartsFromCm(heightSource));
  }, [heightSource]);

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 21);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const personalStarted = Boolean(
    form.heightCm || form.complexion || form.communicationAddress.trim() || form.alternateMobile.trim(),
  );
  const religionStarted = Boolean(form.religion || form.caste || form.subCaste.trim() || form.motherTongue);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      const displayName = displayNameOf(form.firstName, form.lastName);
      if (displayName) payload.displayName = displayName;
      if (fixedGender ?? form.gender) payload.gender = fixedGender ?? form.gender;
      if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
      if (form.location.trim()) payload.city = form.location.trim();
      if (form.bio.trim()) payload.bio = form.bio.trim();
      // A managed profile belongs to the selected bride/groom, not to the
      // parent/guardian who is signed in. Its details are saved through the
      // profile endpoint below; writing /users/me here overwrote the guardian.
      if (syncAccount) await api.put('/users/me/profile', payload);

      if (!profileId) return;
        await api.put(`/profiles/${profileId}/details/personal`, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          gender: (fixedGender ?? form.gender) || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          heightCm: Number(form.heightCm),
          complexion: form.complexion,
          communicationAddress: form.communicationAddress.trim(),
          alternateMobile: form.alternateMobile.trim() || null,
          // On the profile itself, for whichever profile this is: the only
          // way a family member's edits to a relative's city stick.
          city: form.location.trim(),
          bio: form.bio.trim(),
        });

      if (religionStarted) {
        await api.put(`/profiles/${profileId}/details/religion`, {
          religion: form.religion,
          caste: form.caste.trim(),
          subCaste: form.subCaste.trim(),
          motherTongue: form.motherTongue.trim(),
        });
      }

      // Only when it has changed: saving the status alone replaces the marital
      // history, so re-saving this step must not wipe what the next one holds.
      const savedStatus = String(full?.details?.maritalStatus ?? '');
      if (form.maritalStatus && form.maritalStatus !== savedStatus) {
        await api.put(`/profiles/${profileId}/details/marital`, {
          maritalStatus: form.maritalStatus,
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] });
      if (profileId) {
        await qc.invalidateQueries({ queryKey: ['biodata-details', profileId] });
        await qc.invalidateQueries({ queryKey: ['biodata-completion', profileId] });
      }
      setDraft(null);
      setError('');
      onSaved();
    },
    onError: (err) => setError(apiMessage(err, 'Your profile could not be saved.')),
  });

  const set = (key: keyof Form, capitalize?: boolean) => (value: string) => {
    setError('');
    setErrors(e => ({ ...e, [key]: '' }));
    setDraft({ ...form, [key]: capitalize ? capitalizeWords(value) : value });
  };

  const updateHeight = (unit: 'feet' | 'inches', value: string) => {
    const next = { ...heightParts, [unit]: value };
    setHeightParts(next);
    const message = heightPartsError(next, true);
    setErrors((current) => ({ ...current, heightCm: message ?? '' }));
    const cm = feetInchesToCm(next.feet, next.inches);
    if (cm !== null) setDraft({ ...form, heightCm: String(cm) });
    else if (!next.feet && !next.inches) setDraft({ ...form, heightCm: '' });
  };

  function submit() {
    const newErrors: Record<string, string> = {};
    if (!photos || photos.length < 3) newErrors.photos = 'Add at least 3 photographs.';

    if (!form.firstName.trim()) newErrors.firstName = REQUIRED;
    if (!form.lastName.trim()) newErrors.lastName = REQUIRED;
    if (!form.dateOfBirth) newErrors.dateOfBirth = REQUIRED;
    if (!form.gender) newErrors.gender = REQUIRED;

    const heightMessage = heightPartsError(heightParts, true);
    const h = feetInchesToCm(heightParts.feet, heightParts.inches);
    if (heightMessage || h === null || h < MIN_HEIGHT_CM || h > MAX_HEIGHT_CM) {
      newErrors.heightCm =
        !heightParts.feet && !heightParts.inches
          ? REQUIRED
          : (heightMessage ?? 'Height must be between 3 ft 0 in and 8 ft 0 in.');
    }

    if (!form.complexion) newErrors.complexion = REQUIRED;
    if (!form.maritalStatus) newErrors.maritalStatus = REQUIRED;

    if (!form.religion) newErrors.religion = REQUIRED;
    if (!form.caste.trim()) newErrors.caste = REQUIRED;
    if (!form.motherTongue.trim()) newErrors.motherTongue = REQUIRED;
    if (!form.communicationAddress.trim()) newErrors.communicationAddress = REQUIRED;

    // Every message under its own field, and the screen taken to the first.
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('');
      revealFirst(newErrors);
      return;
    }

    setErrors({});
    setError('');
    save.mutate();
  }

  return (
    <View style={{ gap: space(4) }}>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <View ref={anchor('photos')} collapsable={false}>
      <Card>
        <Body tone="muted">
          Add at least 3 photographs<Caption tone="critical"> *</Caption>. Basic information cannot be saved without them.
        </Body>
        {errors.photos ? <Caption tone="critical">{errors.photos}</Caption> : null}
        {(photos ?? []).length === 0 ? (
          <ProfileSilhouette
            gender={typeof me.gender === 'string' ? me.gender : null}
            style={{ width: 116, height: 84, borderRadius: radius.sm }}
          />
        ) : null}
        {(photos ?? []).length > 1 && onMakePrimary ? (
          <Caption tone="muted">
            Tap “Set as profile photo” under the one you want families to see first.
          </Caption>
        ) : null}
        <MediaStrip
          urls={photos ?? []}
          primary={primaryPhotoUrl ?? photos?.[0] ?? null}
          onMakePrimary={onMakePrimary}
          onRemove={onPhotoRemoved}
        />
        <PhotoPicker
          label="Add a photograph"
          purpose="profile_photo"
          onUploaded={(url) => {
            setErrors((e) => ({ ...e, photos: '' }));
            if (onPhotoAdded) onPhotoAdded(url);
          }}
        />
      </Card>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <View ref={anchor('firstName')} collapsable={false}><Field label="First Name" value={form.firstName} onChangeText={set('firstName', true)} required autoFilled={autofilledKeys?.has('firstName')} autoCapitalize="words" error={errors.firstName} /></View>
          </View>
          <View style={{ flex: 1 }}>
            <View ref={anchor('lastName')} collapsable={false}><Field label="Last Name" value={form.lastName} onChangeText={set('lastName', true)} required autoFilled={autofilledKeys?.has('lastName')} autoCapitalize="words" error={errors.lastName} /></View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <View ref={anchor('dateOfBirth')} collapsable={false} />
            <WowCalendar label="Date of Birth" title="Select Date of Birth" value={form.dateOfBirth} onChange={set('dateOfBirth')} maximumDate={maxDob} required autoFilled={autofilledKeys?.has('dateOfBirth')} />
            {errors.dateOfBirth ? <Caption tone="critical">{errors.dateOfBirth}</Caption> : null}
          </View>
          <View style={{ flex: 1 }}>
            <View ref={anchor('gender')} collapsable={false} />
            <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={set('gender')} required autoFilled={autofilledKeys?.has('gender')} error={errors.gender} disabled={Boolean(fixedGender ?? full?.profile?.gender)} hint={fixedGender ? 'Set from your registered role.' : full?.profile?.gender ? 'Set from the registered profile.' : undefined} />
          </View>
        </View>

        {/* Feet and inches, as the web form and partner preferences ask it; stored in cm. */}
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <View ref={anchor('heightCm')} collapsable={false} />
            <Field label="Height (feet)" value={heightParts.feet} onChangeText={(value) => updateHeight('feet', value)} keyboardType="number-pad" maxLength={1} required autoFilled={autofilledKeys?.has('heightCm')} error={errors.heightCm} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Height (inches)" value={heightParts.inches} onChangeText={(value) => updateHeight('inches', value)} keyboardType="number-pad" maxLength={2} required autoFilled={autofilledKeys?.has('heightCm')} error={errors.heightCm} />
          </View>
        </View>

        <View ref={anchor('complexion')} collapsable={false} />
        <SelectField label="Complexion" value={form.complexion} options={COMPLEXIONS} onChange={set('complexion')} required autoFilled={autofilledKeys?.has('complexion')} error={errors.complexion} />

        <View ref={anchor('maritalStatus')} collapsable={false} />
        <SelectField label="Marital Status" value={form.maritalStatus} options={MARITAL} onChange={set('maritalStatus')} required autoFilled={autofilledKeys?.has('maritalStatus')} error={errors.maritalStatus} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <View style={{ flex: 1 }} ref={anchor('religion')} collapsable={false}>
            <ChoiceField
              label="Religion"
              value={form.religion}
              options={RELIGIONS}
              onChange={(religion) => {
                setErrors(e => ({ ...e, religion: '', caste: '' }));
                setDraft({ ...form, religion, caste: '' });
              }}
              required
              autoFilled={autofilledKeys?.has('religion')}
              error={errors.religion}
            />
          </View>
          <View style={{ flex: 1 }} ref={anchor('caste')} collapsable={false}>
            <ChoiceField
              key={`caste-${form.religion}`}
              label="Caste"
              value={form.caste}
              options={CASTES_BY_RELIGION[form.religion] ?? []}
              onChange={set('caste')}
              required
              autoFilled={autofilledKeys?.has('caste')}
              error={errors.caste}
            />
          </View>
        </View>

        <Field label="Sub-Caste" value={form.subCaste} onChangeText={set('subCaste', true)} maxLength={60} autoFilled={autofilledKeys?.has('subCaste')} autoCapitalize="words" />
        <View ref={anchor('motherTongue')} collapsable={false}>
          <ChoiceField label="Mother Tongue" value={form.motherTongue} options={MOTHER_TONGUES} onChange={set('motherTongue')} required autoFilled={autofilledKeys?.has('motherTongue')} error={errors.motherTongue} />
        </View>
      </Card>

      <Card>
        <ChoiceField
          label="State"
          value={form.state}
          options={STATES_BY_COUNTRY['India'] ?? []}
          onChange={(newState) => {
            setErrors(e => ({ ...e, state: '', location: '' }));
            setDraft({
              ...form,
              state: newState,
              location: districtsForState(newState).includes(form.location) ? form.location : '',
            });
          }}
          autoFilled={autofilledKeys?.has('state')}
        />
        {errors.state ? <Caption tone="critical">{errors.state}</Caption> : null}

        <ChoiceField label="City" value={form.location} options={districtsForState(form.state)} onChange={set('location', true)} autoFilled={autofilledKeys?.has('location')} />

        <View ref={anchor('communicationAddress')} collapsable={false}><Field label="Communication Address" value={form.communicationAddress} onChangeText={set('communicationAddress', true)} required autoFilled={autofilledKeys?.has('communicationAddress')} autoCapitalize="words" error={errors.communicationAddress} /></View>
        <Field label="Alternate Mobile" value={form.alternateMobile} onChangeText={set('alternateMobile')} keyboardType="phone-pad" autoFilled={autofilledKeys?.has('alternateMobile')} />
      </Card>

      <Card>
        <Textarea
          label="About Me"
          value={form.bio}
          onChange={(value) => set('bio')(value.length === 1 ? value.toUpperCase() : value)}
          rows={4}
          maxLength={2000}
          placeholder="A few lines about yourself, your family and what you are looking for."
        />
      </Card>

      <View style={{ flexDirection: 'row', gap: space(2) }}>
        {onBack && (
          <Button label="Back" variant="outline" onPress={onBack} disabled={save.isPending} />
        )}
        <Button
          style={{ flex: 1 }}
          label="Save & Continue →"
          busy={save.isPending}
          onPress={submit}
        />
      </View>
    </View>
  );
}
