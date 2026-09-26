import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import {
  PersonalForm,
  MaritalHistoryForm,
  EducationCareerForm,
  FamilyBackgroundForm,
  HoroscopeSection,
  PreferencesSection,
} from '@/components/biodata';
import { MediaStrip, PhotoPicker } from '@/components/uploader';
import { ProfileSilhouette } from '@/components/profile-silhouette';
import {
  Body,
  Button,
  Caption,
  Card,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { radius, rgb, space, useTheme } from '@/theme';

interface BiodataResponse {
  profileId: string;
  details: Record<string, unknown> | null;
  dateOfBirth: string | null;
}

export default function BiodataWizard() {
  const theme = useTheme();
  const qc = useQueryClient();
  const router = useRouter();

  const [step, setStep] = useState(1);

  const { data: me, isPending: loadingMe } = useQuery({
    queryKey: ['me'],
    queryFn: async () =>
      (await api.get('/users/me')).data as { id?: string | null; gender?: string | null; displayName?: string | null; dateOfBirth?: string | null; city?: string | null },
    retry: false,
  });
  const profileId = me?.id ?? null;

  const { data: full, isPending } = useQuery({
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
      (await api.get(`/profiles/${profileId}/details/photos`)).data as { photos: string[] },
    retry: false,
  });

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
  const showMarital = d.maritalStatus && d.maritalStatus !== 'never_married';

  const steps = [
    { id: 'personal', title: 'Basic Information' },
    ...(showMarital ? [{ id: 'marital', title: 'Marital History' }] : []),
    { id: 'education', title: 'Education & Career' },
    { id: 'family', title: 'Family Background' },
    { id: 'horoscope', title: 'Horoscope' },
    { id: 'preferences', title: 'Partner Preferences' },
    { id: 'photos', title: 'Photographs' }
  ];

  const totalSteps = steps.length;
  // Make sure step doesn't exceed totalSteps if marital status changes back to never_married
  const currentStepIndex = Math.min(step - 1, totalSteps - 1);
  const currentStep = steps[currentStepIndex];

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

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: space(2) }}>
        <SectionTitle>{currentStep.title}</SectionTitle>
        <Caption tone="muted" style={{ fontWeight: '600' }}>
          Step {currentStepIndex + 1} of {totalSteps}
        </Caption>
      </View>

      {currentStep.id === 'personal' && (
        <PersonalForm
          profileId={profileId}
          me={me as Record<string, unknown>}
          full={full}
          onSaved={nextStep}
        />
      )}

      {currentStep.id === 'marital' && (
        <MaritalHistoryForm
          profileId={profileId}
          details={d}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
        />
      )}

      {currentStep.id === 'education' && (
        <EducationCareerForm
          profileId={profileId}
          details={d}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
        />
      )}

      {currentStep.id === 'family' && (
        <FamilyBackgroundForm
          profileId={profileId}
          details={d}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
        />
      )}

      {currentStep.id === 'horoscope' && (
        <HoroscopeSection
          profileId={profileId}
          details={d}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
          isWizard
        />
      )}

      {currentStep.id === 'preferences' && (
        <PreferencesSection
          profileId={profileId}
          details={d}
          onSaved={nextStep}
          onBack={prevStep}
          onSkip={nextStep}
          isWizard
        />
      )}

      {currentStep.id === 'photos' && (
        <View style={{ gap: space(4) }}>
          <Card>
            <Body tone="muted">
              A profile with photographs is asked about several times more often than one without.
            </Body>
            {photos && (photos.photos ?? []).length === 0 ? (
              <ProfileSilhouette
                gender={me?.gender}
                style={{ width: 116, height: 84, borderRadius: radius.sm }}
              />
            ) : null}
            <MediaStrip
              urls={photos?.photos ?? []}
              onRemove={(url) => {
                void api
                  .delete(`/profiles/${profileId}/details/photos`, { data: { url } })
                  .then(refresh);
              }}
            />
            <PhotoPicker
              label="Add a photograph"
              onUploaded={(url) => {
                void api.post(`/profiles/${profileId}/details/photos`, { url }).then(refresh);
              }}
            />
          </Card>
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <Button
              label="Back"
              variant="outline"
              onPress={prevStep}
            />
            <Button style={{ flex: 1 }} label="Finish" onPress={nextStep} />
          </View>
        </View>
      )}
    </Screen>
  );
}
