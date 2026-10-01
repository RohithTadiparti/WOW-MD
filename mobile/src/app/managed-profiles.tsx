import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { UserCircle, Plus, CaretRight, Check } from 'phosphor-react-native';

import { api } from '@/lib/api';
import { useManagedProfileStore } from '@/store/managed-profile';
import { ProfileSilhouette } from '@/components/profile-silhouette';
import {
  Body,
  Button,
  Caption,
  Card,
  Eyebrow,
  Loading,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { radius, rgb, space, useTheme } from '@/theme';

interface ActableProfile {
  id: string;
  displayName: string;
  userId: string | null;
  claimStatus: string;
  city: string | null;
  gender?: string | null;
  photos?: string[];
  managedByUserId?: string | null;
}

/**
 * Managed Profiles — the screen a Family Member sees to select which person
 * they are managing.
 *
 * GET /agents/profiles/actable returns both:
 *   - The family member's own individual profile (claimStatus = 'self')
 *   - Profiles they created/manage (managedByUserId = actor.userId)
 *
 * Tapping "Manage Profile" stores the selected profile's ID in the Zustand
 * store. Every subsequent screen (Biodata, photos, preferences) reads that
 * ID rather than the authenticated user's ID.
 */
export default function ManagedProfiles() {
  const router = useRouter();
  const theme = useTheme();

  const activeManagedProfileId = useManagedProfileStore((s) => s.activeManagedProfileId);
  const setActiveManagedProfile = useManagedProfileStore((s) => s.setActiveManagedProfile);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['actable-profiles'],
    queryFn: async () =>
      (await api.get('/agents/profiles/actable')).data as ActableProfile[],
    retry: false,
  });

  // Per-profile completion percentages
  const { data: completions } = useQuery({
    queryKey: ['actable-completions', (data ?? []).map((p) => p.id).join(',')],
    enabled: Boolean(data && data.length > 0),
    queryFn: async () => {
      if (!data || data.length === 0) return {} as Record<string, number>;
      const results = await Promise.allSettled(
        data.map(async (p) => {
          const r = await api.get(`/profiles/${p.id}/details/completion`);
          return { id: p.id, percent: (r.data as { percent: number }).percent };
        }),
      );
      const map: Record<string, number> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') map[r.value.id] = r.value.percent;
      }
      return map;
    },
    retry: false,
  });

  function handleManage(profile: ActableProfile) {
    setActiveManagedProfile(profile.id, profile.displayName);
    router.push('/');
  }

  if (isPending) {
    return (
      <Screen>
        <View style={{ marginTop: space(8) }}>
          <Loading rows={3} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={{ marginTop: space(8), gap: space(3) }}>
          <SectionTitle>Could not load profiles</SectionTitle>
          <Body tone="muted">Something went wrong fetching your managed profiles.</Body>
          <Button label="Try again" onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const profiles = data ?? [];

  return (
    <Screen>
      <View style={{ marginTop: space(6), marginBottom: space(3), gap: space(1) }}>
        <Eyebrow>Family member</Eyebrow>
        <SectionTitle>Managed Profiles</SectionTitle>
        <Caption tone="muted">
          Select a profile to fill in their Biodata and manage their matrimony listing.
        </Caption>
      </View>

      {profiles.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: space(6), gap: space(3) }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: radius.md,
              backgroundColor: rgb(theme.brandSoft),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserCircle size={28} color={rgb(theme.brandStrong)} />
          </View>
          <View style={{ alignItems: 'center', gap: space(1) }}>
            <Body style={{ fontWeight: '600' }}>No managed profiles yet</Body>
            <Caption tone="muted" style={{ textAlign: 'center' }}>
              Add a profile for the person you are helping find a match.
            </Caption>
          </View>
          <Button
            label="Add Profile"
            onPress={() => router.push('/create-managed-profile')}
          />
        </Card>
      ) : (
        <View style={{ gap: space(3) }}>
          {profiles.map((profile) => {
            const isActive = profile.id === activeManagedProfileId;
            const percent = completions?.[profile.id] ?? null;
            const photo = Array.isArray(profile.photos) ? profile.photos[0] : null;

            return (
              <Pressable
                key={profile.id}
                onPress={() => handleManage(profile)}
                style={({ pressed }) => [
                  {
                    borderRadius: radius.md,
                    borderWidth: isActive ? 2 : StyleSheet.hairlineWidth,
                    borderColor: rgb(isActive ? theme.brand : theme.border),
                    backgroundColor: rgb(isActive ? theme.brandSoft : theme.surface),
                    overflow: 'hidden',
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space(3),
                    padding: space(3),
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      backgroundColor: rgb(theme.surfaceSunken),
                    }}
                  >
                    {photo ? (
                      <Image
                        source={{ uri: photo }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : (
                      <ProfileSilhouette
                        gender={profile.gender ?? undefined}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}
                  </View>

                  <View style={{ flex: 1, gap: space(0.5) }}>
                    <Body style={{ fontWeight: '600' }} numberOfLines={1}>
                      {profile.displayName}
                    </Body>
                    {profile.city ? (
                      <Caption tone="muted" numberOfLines={1}>
                        {profile.city}
                      </Caption>
                    ) : null}
                    {typeof percent === 'number' ? (
                      <Caption
                        tone="muted"
                        style={{
                          color: percent >= 80 ? rgb(theme.positiveFg) : undefined,
                        }}
                      >
                        Profile {percent}% complete
                      </Caption>
                    ) : null}
                  </View>

                  {isActive ? (
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: rgb(theme.brand),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={14} weight="bold" color={rgb(theme.brandFg)} />
                    </View>
                  ) : (
                    <CaretRight size={16} color={rgb(theme.ink[400])} />
                  )}
                </View>

                {isActive ? (
                  <View
                    style={{
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: rgb(theme.brand),
                      padding: space(3),
                      flexDirection: 'row',
                      gap: space(2),
                    }}
                  >
                    <Button
                      label="Biodata"
                      small
                      style={{ flex: 1 }}
                      onPress={() => router.push('/biodata')}
                    />
                    <Button
                      label="Profile"
                      small
                      variant="outline"
                      style={{ flex: 1 }}
                      onPress={() => router.push('/profile')}
                    />
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => router.push('/create-managed-profile')}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(3),
                borderRadius: radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: rgb(theme.border),
                backgroundColor: rgb(theme.surface),
                padding: space(3),
              },
              pressed && { opacity: 0.75 },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.md,
                backgroundColor: rgb(theme.brandSoft),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={20} color={rgb(theme.brandStrong)} />
            </View>
            <Body style={{ color: rgb(theme.brand), fontWeight: '600' }}>
              Add Another Profile
            </Body>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
