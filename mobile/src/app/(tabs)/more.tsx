import type { ComponentType, ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import {
  Bell,
  BookOpenText,
  CalendarBlank,
  CaretRight,
  ChatCircleDots,
  CheckCircle,
  FileText,
  Heart,
  IdentificationCard,
  Image as ImageIcon,
  Info,
  Lifebuoy,
  Lock,
  MagnifyingGlass,
  Prohibit,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  UserCircle,
  Vault,
  type IconProps,
} from 'phosphor-react-native';

import { api, signOut } from '@/lib/api';
import { Permission, ROLE_LABEL, can } from '@/shared/permissions';
import { ProfileSilhouette } from '@/components/profile-silhouette';
import {
  Body,
  Caption,
  Card,
  Eyebrow,
  Loading,
  PageSubtitle,
  PageTitle,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { useAuth } from '@/store/auth';
import { radius, rgb, space, useTheme } from '@/theme';

interface MeResponse {
  id?: string | null;
  displayName?: string | null;
  gender?: string | null;
}

interface Completion {
  percent: number;
}

interface IdentityView {
  verifiedAt: string | null;
}

export default function More() {
  const theme = useTheme();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const permissions = user?.permissions ?? [];
  const canMatch = can(permissions, Permission.MATCH_BROWSE);
  const canChat = can(permissions, Permission.CHAT_INQUIRE) || can(permissions, Permission.CHAT_MATCH);
  const canPlanEvents = can(permissions, Permission.EVENT_MANAGE_OWN);
  const canEscrow = can(permissions, Permission.BOOKING_READ_OWN);

  const { data: me, isPending: loadingMe, isError: meFailed, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data as MeResponse,
    retry: false,
  });

  const profileId = me?.id ?? null;

  const { data: completion } = useQuery({
    queryKey: ['biodata-completion', profileId],
    enabled: Boolean(profileId) && canMatch,
    queryFn: async () =>
      (await api.get(`/profiles/${profileId}/details/completion`)).data as Completion,
    retry: false,
  });

  const { data: photos } = useQuery({
    queryKey: ['biodata-photos', profileId],
    enabled: Boolean(profileId),
    queryFn: async () =>
      (await api.get(`/profiles/${profileId}/details/photos`)).data as { photos: string[] },
    retry: false,
  });

  const { data: identity } = useQuery({
    queryKey: ['identity', profileId],
    enabled: Boolean(profileId) && canMatch,
    queryFn: async () =>
      (await api.get(`/users/profiles/${profileId}/identity`)).data as IdentityView,
    retry: false,
  });

  const primaryPhoto = photos?.photos?.[0] ?? null;
  const fullName = me?.displayName?.trim() || user?.email?.split('@')[0] || 'Your profile';
  const percent = completion?.percent ?? 0;
  const identityVerified = Boolean(identity?.verifiedAt);

  if (loadingMe) {
    return (
      <Screen>
        <Loading rows={4} />
      </Screen>
    );
  }

  if (meFailed) {
    return (
      <Screen>
        <PageTitle>More</PageTitle>
        <Card>
          <Body tone="muted">Your profile could not be loaded.</Body>
          <Pressable onPress={() => void refetch()} accessibilityRole="button">
            <Caption tone="brand">Retry</Caption>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <PageTitle>More</PageTitle>
        <PageSubtitle>Everything you need, in one place.</PageSubtitle>
      </View>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [
            { padding: space(4), gap: space(3) },
            pressed && { backgroundColor: rgb(theme.surfaceSunken) },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: 'hidden',
                backgroundColor: rgb(theme.surfaceSunken),
              }}
            >
              {primaryPhoto ? (
                <Image
                  source={{ uri: primaryPhoto }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <ProfileSilhouette gender={me?.gender} style={{ width: '100%', height: '100%' }} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <SectionTitle numberOfLines={1}>{fullName}</SectionTitle>
              <Caption tone="muted" numberOfLines={1}>
                {user ? (ROLE_LABEL[user.role] ?? user.role) : 'Member'}
              </Caption>
            </View>
            <CaretRight size={16} color={rgb(theme.ink[400])} />
          </View>

          <View style={{ gap: space(1.5) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Caption>Profile Completion</Caption>
              <Caption style={{ fontWeight: '700', color: rgb(theme.brand) }}>{percent}%</Caption>
            </View>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                overflow: 'hidden',
                backgroundColor: rgb(theme.surfaceSunken),
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, percent))}%`,
                  backgroundColor: rgb(theme.brand),
                }}
              />
            </View>
          </View>

          <View
            style={{
              backgroundColor: rgb(theme.brandSoft),
              borderRadius: radius.md,
              padding: space(3),
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(2),
            }}
          >
            <CheckCircle
              size={22}
              weight={percent >= 100 ? 'fill' : 'regular'}
              color={rgb(theme.brandStrong)}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Body style={{ fontWeight: '700', color: rgb(theme.brandStrong) }}>
                {percent >= 100 ? "You're all set" : 'Finish your profile'}
              </Body>
              <Caption style={{ color: rgb(theme.brandStrong) }}>
                {percent >= 100
                  ? 'Your profile is complete and visible to matches.'
                  : 'Add details so families can find you.'}
              </Caption>
            </View>
          </View>
        </Pressable>
      </Card>

      {canMatch || canChat || canPlanEvents ? (
        <View style={{ gap: space(2) }}>
          <Eyebrow>Explore</Eyebrow>
          <View style={styles.grid}>
            {canMatch ? (
              <GridCard
                icon={MagnifyingGlass}
                title="Find Matches"
                description="Discover profiles"
                onPress={() => router.push('/matches')}
              />
            ) : null}
            {canChat ? (
              <GridCard
                icon={ChatCircleDots}
                title="Messages"
                description="Chat with families"
                onPress={() => router.push('/chat')}
              />
            ) : null}
            {canPlanEvents ? (
              <GridCard
                icon={CalendarBlank}
                title="Wedding Planning"
                description="Plan your events"
                onPress={() => router.push('/events')}
              />
            ) : null}
            {canMatch ? (
              <GridCard
                icon={Heart}
                title="Shortlisted"
                description="Profiles you saved"
                onPress={() => router.push('/shortlisted')}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {canMatch ? (
        <Group title="My Profile">
          <Row icon={UserCircle} label="Edit Profile" to="/edit-profile" />
          <Row icon={IdentificationCard} label="Biodata" to="/biodata" />
          <Row icon={ImageIcon} label="Photos" to="/photos" />
          <Row icon={SlidersHorizontal} label="Partner Preferences" to="/preferences" />
          <Row
            icon={ShieldCheck}
            label="Verification"
            to="/identity"
            badge={identityVerified ? 'Verified' : undefined}
          />
          <Row icon={Heart} label="Interests" to="/interests" last />
        </Group>
      ) : null}

      <Group title="Account">
        {canEscrow ? <Row icon={Vault} label="Escrow" to="/escrow" /> : null}
        <Row icon={Lock} label="Account Information" to="/account" last />
      </Group>

      <Group title="Communication">
        <Row icon={Bell} label="Notifications" to="/notifications" />
        <Row icon={ShieldCheck} label="Privacy & Safety" to="/privacy" />
        <Row icon={Prohibit} label="Blocked Profiles" to="/blocked" last />
      </Group>

      <Group title="Help & Support">
        <Row icon={BookOpenText} label="Help Center" to="/support?type=help" />
        <Row icon={Lifebuoy} label="Contact Support" to="/support?type=contact" />
        <Row icon={ChatCircleDots} label="Share Feedback" to="/support?type=feedback" last />
      </Group>

      <Group title="About">
        <Row icon={Info} label="About WOW" to="/about?type=about" />
        <Row icon={FileText} label="Terms of Service" to="/about?type=terms" />
        <Row icon={ShieldCheck} label="Privacy Policy" to="/about?type=privacy" last />
      </Group>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Logout"
        onPress={() =>
          Alert.alert('Are you sure?', 'You will be logged out of this account.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: () => void signOut() },
          ])
        }
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space(2),
            paddingVertical: space(3.5),
            borderRadius: radius.md,
            backgroundColor: rgb(theme.surface),
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: rgb(theme.border),
          },
          pressed && { backgroundColor: rgb(theme.surfaceSunken) },
        ]}
      >
        <SignOut size={18} color={rgb(theme.criticalFg)} />
        <Body style={{ fontWeight: '600', color: rgb(theme.criticalFg) }}>Logout</Body>
      </Pressable>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space(2) }}>
      <Eyebrow>{title}</Eyebrow>
      <Card style={{ padding: 0, overflow: 'hidden' }}>{children}</Card>
    </View>
  );
}

function Row({
  icon: Glyph,
  label,
  to,
  badge,
  last = false,
}: {
  icon: ComponentType<IconProps>;
  label: string;
  to: string;
  badge?: string;
  last?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(to as never)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(3),
          paddingHorizontal: space(4),
          paddingVertical: space(3),
          minHeight: 56,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: rgb(theme.border),
        },
        pressed && { backgroundColor: rgb(theme.surfaceSunken) },
      ]}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: rgb(theme.brandSoft),
        }}
      >
        <Glyph size={17} color={rgb(theme.brandStrong)} />
      </View>
      <Body style={{ flex: 1, fontWeight: '500' }}>{label}</Body>
      {badge ? (
        <View
          style={{
            backgroundColor: rgb(theme.positiveBg),
            paddingHorizontal: space(2),
            paddingVertical: space(0.5),
            borderRadius: radius.sm,
          }}
        >
          <Caption style={{ color: rgb(theme.positiveFg), fontWeight: '600', fontSize: 11 }}>
            {badge}
          </Caption>
        </View>
      ) : null}
      <CaretRight size={16} color={rgb(theme.ink[400])} />
    </Pressable>
  );
}

function GridCard({
  icon: Icon,
  title,
  description,
  onPress,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: rgb(theme.surface), borderColor: rgb(theme.border) },
        pressed && { backgroundColor: rgb(theme.surfaceSunken) },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: rgb(theme.brandSoft),
        }}
      >
        <Icon size={18} color={rgb(theme.brandStrong)} />
      </View>
      <Body style={{ fontWeight: '600', fontSize: 14 }}>{title}</Body>
      <Caption tone="faint" numberOfLines={2}>
        {description}
      </Caption>
      <View style={{ position: 'absolute', top: space(3), right: space(3) }}>
        <CaretRight size={14} color={rgb(theme.ink[400])} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  card: {
    width: '48%',
    flexGrow: 1,
    padding: space(3),
    paddingRight: space(6),
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: space(1),
    position: 'relative',
  },
});
