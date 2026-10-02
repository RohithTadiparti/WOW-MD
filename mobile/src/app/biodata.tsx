import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Alert as NativeAlert, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, IdentificationCard } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import {
  COMPLEXIONS,
  FAMILY_STATUSES,
  FAMILY_TYPES,
  MARITAL,
  OCCUPATION_STATUS,
  PersonalForm,
  MaritalHistoryForm,
  EducationCareerForm,
  FamilyBackgroundForm,
  HoroscopeSection,
  PreferencesSection,
  UploadFlow,
} from '@/components/biodata';
import { draftFromExtraction, underlay, type ExtractedDraft } from '@/components/biodata/extraction';
import { ProfileCompletionCard } from '@/components/profile-completion-card';
import { DetailGrid, DetailRow } from '@/components/chrome';
import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';
import { formatHeight } from '@/shared/height';
import { ageFrom, genderForIndividualRole, GENDER_LABEL } from '@/lib/labels';
import { useAuth } from '@/store/auth';

interface BiodataResponse {
  profileId: string;
  details: Record<string, unknown> | null;
  dateOfBirth: string | null;
  profile?: {
    displayName?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    city?: string | null;
    bio?: string | null;
    managingFor?: string | null;
  };
}

/** `GET /profiles/:id/details/completion`, worked out from the stored data each time. */
interface Completion {
  percent: number;
  complete: boolean;
  sections: { section: string; complete: boolean; label: string }[];
  missing: string[];
}

/** Which step completes each of the server's required sections. */
const STEP_FOR_SECTION: Record<string, string> = {
  personal: 'personal',
  religion: 'personal',
  marital: 'personal',
  education: 'education',
  occupation: 'education',
  family: 'family',
  horoscope: 'horoscope',
  preferences: 'preferences',
  identity: 'identity',
};

const labelOf = (list: { value: string; label: string }[], value: unknown) =>
  list.find((o) => o.value === value)?.label ?? (value ? String(value).replace(/_/g, ' ') : '—');

const shown = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));

export default function BiodataWizard() {
  const qc = useQueryClient();
  const router = useRouter();
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const params = useLocalSearchParams<{ profileId?: string | string[] }>();

  const [step, setStep] = useState(0);
  const [autofilledKeys, setAutofilledKeys] = useState<Set<string>>(new Set());
  // What a read document filled in, kept here rather than in the query cache:
  // saving a step refetches the server's copy, which used to throw away
  // everything extracted for the steps not saved yet.
  const [extracted, setExtracted] = useState<ExtractedDraft | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [incomplete, setIncomplete] = useState(false);

  const { data: me, isPending: loadingMe } = useQuery({
    queryKey: ['me'],
    queryFn: async () =>
      (await api.get('/users/me')).data as { id?: string | null; gender?: string | null; managingFor?: string | null; displayName?: string | null; dateOfBirth?: string | null; city?: string | null },
    retry: false,
  });
  // A family member can open a managed person's biodata by profile id.  Never
  // fall back to the family account after a profile was explicitly selected:
  // that is how one relative's fields leaked into another one's form.
  const selectedProfileId = Array.isArray(params.profileId) ? params.profileId[0] : params.profileId;
  const profileId = selectedProfileId ?? me?.id ?? null;
  const isOwnProfile = profileId !== null && profileId === me?.id;

  const { data: saved, isPending } = useQuery({
    queryKey: ['biodata-details', profileId],
    enabled: Boolean(profileId),
    queryFn: async () =>
      (await api.get(`/profiles/${profileId}/details`)).data as BiodataResponse,
    retry: false,
  });

  const { data: photos } = useQuery({
    queryKey: ['biodata-photos', profileId],
    enabled: Boolean(profileId),
    queryFn: async () =>
      (await api.get(`/profiles/${profileId}/details/photos`)).data as {
        photos: string[];
        primaryPhotoUrl?: string | null;
      },
    retry: false,
  });

  const { data: completion, refetch: refetchCompletion } = useQuery({
    queryKey: ['biodata-completion', profileId],
    enabled: Boolean(profileId),
    queryFn: async () =>
      (await api.get(`/profiles/${profileId}/details/completion`)).data as Completion,
    retry: false,
  });

  // The saved biodata with anything extracted laid under it: a read value
  // shows only where nothing is saved yet, so saved data always wins.
  const full = useMemo<BiodataResponse | undefined>(() => {
    if (!saved || !extracted) return saved;
    return {
      ...saved,
      details: underlay(saved.details, extracted.details),
      profile: underlay(saved.profile, extracted.profile) as BiodataResponse['profile'],
    };
  }, [saved, extracted]);

  // Skip selection screen if already has details
  useEffect(() => {
    if (step === 0 && saved !== undefined) {
      const hasDetails = Object.keys(saved?.details ?? {}).length > 0;
      if (hasDetails) {
        setStep(1);
      }
    }
  }, [step, saved]);

  // Expo can keep this route mounted while a family member changes the target
  // profile. Reset everything route-local, the extracted draft included, so
  // nothing of one person's biodata survives onto another's.
  useEffect(() => {
    setStep(0);
    setAutofilledKeys(new Set());
    setExtracted(null);
    setIncomplete(false);
  }, [profileId]);

  // Coming back from identity verification changes the completion.
  useFocusEffect(
    useCallback(() => {
      if (profileId) void qc.invalidateQueries({ queryKey: ['biodata-completion', profileId] });
    }, [qc, profileId]),
  );

  if (loadingMe || (profileId && isPending)) {
    return (
      <Screen>
        <Loading rows={4} />
      </Screen>
    );
  }

  if (!profileId) {
    return (
      <Screen>
        <Card>
          <SectionTitle>No profile yet</SectionTitle>
          <Body tone="muted">
            This account has no matrimony profile.
          </Body>
        </Card>
      </Screen>
    );
  }

  const d = (full?.details ?? {}) as Record<string, unknown>;
  const profile = full?.profile ?? {};
  // A self-managed bride/groom's role is canonical. A managed profile uses its
  // own stored gender, or the bride/groom it was created for; never the
  // signed-in family member's.
  const fixedGender = isOwnProfile ? genderForIndividualRole(user?.role) : null;
  const targetGender = String(
    fixedGender ??
      profile.gender ??
      profile.managingFor ??
      (isOwnProfile ? (me?.gender ?? me?.managingFor) : null) ??
      '',
  ).toLowerCase();
  const isGroom = targetGender === 'groom' || targetGender === 'male' || targetGender === 'm';
  const showMarital = d.maritalStatus && d.maritalStatus !== 'never_married';
  const dateOfBirth = profile.dateOfBirth ?? full?.dateOfBirth ?? (isOwnProfile ? me?.dateOfBirth : null) ?? null;

  // Photographs are on the first step: the server will not save the basic
  // information until the profile has three of them.
  const steps = [
    { id: 'personal', title: 'Basic Information & Photos' },
    ...(showMarital ? [{ id: 'marital', title: 'Marital History' }] : []),
    { id: 'education', title: 'Education & Career' },
    { id: 'family', title: 'Family Background' },
    { id: 'horoscope', title: 'Horoscope' },
    { id: 'preferences', title: 'Partner Preferences' },
    // Required for completion like every other section, so it is a step of
    // its own rather than something the person has to find elsewhere.
    { id: 'identity', title: 'Identity Verification' },
    { id: 'summary', title: 'Review Your Biodata' },
  ];

  const totalSteps = steps.length;
  // Make sure step doesn't exceed totalSteps if marital status changes back to never_married
  const currentStepIndex = Math.min(step - 1, totalSteps - 1);
  const currentStep = steps[currentStepIndex];
  const goTo = (id: string) => setStep(steps.findIndex((s) => s.id === id) + 1);

  const refresh = () => {
    for (const key of ['biodata-details', 'biodata-completion', 'biodata-photos']) {
      void qc.invalidateQueries({ queryKey: [key] });
    }
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      router.back();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  /**
   * Complete Biodata: the server's own reading of the saved data decides, so
   * the button and the percentage can never disagree. Missing sections keep
   * the person here, each with a way back to the step that fills it.
   */
  async function finish() {
    setFinishing(true);
    try {
      const { data: latest } = await refetchCompletion();
      if (latest?.complete) {
        setIncomplete(false);
        NativeAlert.alert('Biodata complete', 'Everything required is filled in and saved.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      } else {
        setIncomplete(true);
      }
    } catch (err) {
      NativeAlert.alert('Not checked', apiMessage(err, 'Completion could not be checked. Try again.'));
    } finally {
      setFinishing(false);
    }
  }

  if (step === 0) {
    return (
      <Screen scroll={false}>
        <UploadFlow
          profileId={profileId}
          onCustom={() => setStep(1)}
          onExtracted={(data) => {
            const draft = draftFromExtraction(data as Record<string, unknown>);
            setExtracted(draft);
            setAutofilledKeys(draft.keys);
            setStep(1);
          }}
        />
      </Screen>
    );
  }

  const father = (d.father ?? {}) as Record<string, unknown>;
  const mother = (d.mother ?? {}) as Record<string, unknown>;
  const chart = (d.horoscope ?? {}) as Record<string, unknown>;
  const employment = (d.employment ?? {}) as Record<string, unknown>;
  const identityDone = completion?.sections.find((s) => s.section === 'identity')?.complete ?? false;
  const missing = (completion?.sections ?? []).filter((s) => !s.complete);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: space(2) }}>
        <SectionTitle>{currentStep.title}</SectionTitle>
        <Caption tone="muted" style={{ fontWeight: '600' }}>
          Step {currentStepIndex + 1} of {totalSteps}
        </Caption>
      </View>
      {completion && step > 0 && currentStep.id !== 'summary' && (
        <View style={{ marginBottom: space(4) }}>
          <ProfileCompletionCard percent={completion.percent} hideAction />
        </View>
      )}

      {currentStep.id === 'personal' && (
        <PersonalForm
          key={`personal-${profileId}`}
          profileId={profileId}
          me={me as Record<string, unknown>}
          full={full}
          syncAccount={isOwnProfile}
          fixedGender={fixedGender}
          photos={photos?.photos ?? []}
          onPhotoAdded={(url) => {
            void api.post(`/profiles/${profileId}/details/photos`, { url }).then(refresh).catch((err) => {
              // The server's own words: an AI-generated photo is refused with
              // what to upload instead, which a generic "try again" would hide.
              NativeAlert.alert('Photo not added', apiMessage(err, 'Your photo could not be uploaded. Please try again.'));
            });
          }}
          onPhotoRemoved={(url) => {
            void api.delete(`/profiles/${profileId}/details/photos`, { data: { url } }).then(refresh).catch(() => {
              NativeAlert.alert('Remove Failed', 'Your photo could not be removed. Please try again.');
            });
          }}
          primaryPhotoUrl={photos?.primaryPhotoUrl ?? null}
          onMakePrimary={(url) => {
            void api.put(`/profiles/${profileId}/details/primary-photo`, { url }).then(refresh).catch(() => {
              NativeAlert.alert('Not Changed', 'That photo could not be set as your profile photo. Please try again.');
            });
          }}
          onSaved={nextStep}
          onBack={prevStep}
          autofilledKeys={autofilledKeys}
        />
      )}

      {currentStep.id === 'marital' && (
        <MaritalHistoryForm
          key={`marital-${profileId}`}
          profileId={profileId}
          details={d}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
          autofilledKeys={autofilledKeys}
        />
      )}

      {currentStep.id === 'education' && (
        <EducationCareerForm
          key={`education-${profileId}`}
          profileId={profileId}
          details={d}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
          autofilledKeys={autofilledKeys}
        />
      )}

      {currentStep.id === 'family' && (
        <FamilyBackgroundForm
          key={`family-${profileId}`}
          profileId={profileId}
          details={d}
          isGroom={isGroom}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
          autofilledKeys={autofilledKeys}
        />
      )}

      {currentStep.id === 'horoscope' && (
        <HoroscopeSection
          key={`horoscope-${profileId}`}
          profileId={profileId}
          details={d}
          onSaved={() => {
            refresh();
            nextStep();
          }}
          onBack={prevStep}
          onSkip={nextStep}
          isWizard
        />
      )}

      {currentStep.id === 'preferences' && (
        <PreferencesSection
          key={`preferences-${profileId}`}
          profileId={profileId}
          details={d}
          onSaved={() => {
            refresh();
            nextStep();
          }}
          onBack={prevStep}
          onSkip={nextStep}
          isWizard
        />
      )}

      {currentStep.id === 'identity' && (
        <View style={{ gap: space(4) }}>
          <Card style={{ gap: space(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
              {identityDone ? (
                <CheckCircle size={22} weight="fill" color={rgb(theme.positiveFg)} />
              ) : (
                <IdentificationCard size={22} color={rgb(theme.brandStrong)} />
              )}
              <Body style={{ fontWeight: '700' }}>
                Government ID<Caption tone="critical"> *</Caption>
              </Body>
            </View>
            <Caption tone="muted">
              {identityDone
                ? 'An identity document is on file for this profile.'
                : 'Add an identity document for this profile. It is required to complete the biodata, and it is never shown to other families.'}
            </Caption>
            <Button
              variant={identityDone ? 'outline' : 'primary'}
              label={identityDone ? 'View identity' : 'Verify identity'}
              onPress={() => router.push({ pathname: '/identity', params: { profileId } })}
            />
          </Card>
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <Button label="Back" variant="outline" onPress={prevStep} />
            <Button style={{ flex: 1 }} label="Continue →" onPress={nextStep} />
          </View>
        </View>
      )}

      {currentStep.id === 'summary' && (
        <View style={{ gap: space(4) }}>
          {completion && (
            <ProfileCompletionCard percent={completion.percent} hideAction />
          )}

          {incomplete && missing.length > 0 ? (
            <Card style={{ gap: space(2) }}>
              <Alert tone="critical">Complete these sections to finish the biodata.</Alert>
              {missing.map((s) => (
                <Pressable
                  key={s.section}
                  accessibilityRole="button"
                  onPress={() => goTo(STEP_FOR_SECTION[s.section] ?? 'personal')}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space(1) }}
                >
                  <Body>{s.label}</Body>
                  <Caption tone="brand">Complete</Caption>
                </Pressable>
              ))}
            </Card>
          ) : null}

          <SummaryCard title="Basic Information" onEdit={() => goTo('personal')}>
            <DetailRow label="Name">{shown(profile.displayName ?? [d.firstName, d.lastName].filter(Boolean).join(' '))}</DetailRow>
            <DetailRow label="Date of Birth">{shown(dateOfBirth ? String(dateOfBirth).slice(0, 10) : null)}</DetailRow>
            <DetailRow label="Age">{ageFrom(dateOfBirth) ?? '—'}</DetailRow>
            <DetailRow label="Gender">{GENDER_LABEL[targetGender] ?? '—'}</DetailRow>
            <DetailRow label="Height">{formatHeight(d.heightCm) || '—'}</DetailRow>
            <DetailRow label="Complexion">{labelOf(COMPLEXIONS, d.complexion)}</DetailRow>
            <DetailRow label="Marital Status">{labelOf(MARITAL, d.maritalStatus)}</DetailRow>
            <DetailRow label="Religion">{shown(d.religion)}</DetailRow>
            <DetailRow label="Caste">{shown(d.caste)}</DetailRow>
            {d.subCaste ? <DetailRow label="Sub-caste">{String(d.subCaste)}</DetailRow> : null}
            <DetailRow label="Mother Tongue">{shown(d.motherTongue)}</DetailRow>
            {profile.city ? <DetailRow label="City">{String(profile.city)}</DetailRow> : null}
            {profile.bio ? <DetailRow label="About Me">{String(profile.bio)}</DetailRow> : null}
          </SummaryCard>

          <SummaryCard title="Education & Career" onEdit={() => goTo('education')}>
            <DetailRow label="Qualification">{shown(d.highestQualification)}</DetailRow>
            <DetailRow label="Course">{shown(d.course)}</DetailRow>
            {d.institution ? <DetailRow label="Institution">{String(d.institution)}</DetailRow> : null}
            <DetailRow label="Occupation">{labelOf(OCCUPATION_STATUS, d.occupationStatus)}</DetailRow>
            {employment.company ? <DetailRow label="Company">{String(employment.company)}</DetailRow> : null}
            {employment.designation ? <DetailRow label="Designation">{String(employment.designation)}</DetailRow> : null}
          </SummaryCard>

          <SummaryCard title="Family Details" onEdit={() => goTo('family')}>
            <DetailRow label="Father">
              {father.name ? `${father.lifeStatus === 'deceased' ? 'Late' : 'Mr.'} ${father.name}` : '—'}
            </DetailRow>
            {father.profession ? <DetailRow label="Father's Occupation">{String(father.profession)}</DetailRow> : null}
            <DetailRow label="Mother">
              {mother.name ? `${mother.lifeStatus === 'deceased' ? 'Late' : 'Mrs.'} ${mother.name}` : '—'}
            </DetailRow>
            {mother.profession ? <DetailRow label="Mother's Occupation">{String(mother.profession)}</DetailRow> : null}
            <DetailRow label="Brothers">{shown(d.brothers)}</DetailRow>
            <DetailRow label="Sisters">{shown(d.sisters)}</DetailRow>
            <DetailRow label="Family Type">{labelOf(FAMILY_TYPES, d.familyType)}</DetailRow>
            <DetailRow label="Family Status">{labelOf(FAMILY_STATUSES, d.familyStatus)}</DetailRow>
          </SummaryCard>

          <SummaryCard title="Horoscope" onEdit={() => goTo('horoscope')}>
            {d.horoscopeAvailable === false ? (
              <DetailRow label="Horoscope">No horoscope</DetailRow>
            ) : (
              <>
                <DetailRow label="Rashi">{shown(chart.rashi)}</DetailRow>
                <DetailRow label="Star">{shown(chart.star)}</DetailRow>
                {chart.padam ? <DetailRow label="Padam">{String(chart.padam)}</DetailRow> : null}
                {chart.gothram ? <DetailRow label="Gothram">{String(chart.gothram)}</DetailRow> : null}
                {chart.timeOfBirth ? <DetailRow label="Time of Birth">{String(chart.timeOfBirth)}</DetailRow> : null}
              </>
            )}
          </SummaryCard>

          <SummaryCard title="Partner Preferences" onEdit={() => goTo('preferences')}>
            <DetailRow label="Age">
              {d.preferredAgeMin || d.preferredAgeMax ? `${shown(d.preferredAgeMin)} to ${shown(d.preferredAgeMax)}` : '—'}
            </DetailRow>
            <DetailRow label="Height">
              {d.preferredHeightMinCm || d.preferredHeightMaxCm
                ? `${formatHeight(d.preferredHeightMinCm) || '—'} to ${formatHeight(d.preferredHeightMaxCm) || '—'}`
                : '—'}
            </DetailRow>
          </SummaryCard>

          <SummaryCard title="Identity" onEdit={() => goTo('identity')}>
            <DetailRow label="Government ID">{identityDone ? 'On file' : 'Not added'}</DetailRow>
          </SummaryCard>

          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <Button label="Back" variant="outline" onPress={prevStep} />
            <Button style={{ flex: 1 }} label="Complete Biodata" busy={finishing} onPress={() => void finish()} />
          </View>
        </View>
      )}
    </Screen>
  );
}

function SummaryCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Card style={{ padding: space(3), gap: space(1) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SectionTitle>{title}</SectionTitle>
        <Pressable accessibilityRole="button" onPress={onEdit}>
          <Caption tone="brand">Edit</Caption>
        </Pressable>
      </View>
      <View style={{ marginTop: space(2) }}>
        <DetailGrid>{children}</DetailGrid>
      </View>
    </Card>
  );
}
