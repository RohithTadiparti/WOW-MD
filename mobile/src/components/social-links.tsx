import { Linking, Pressable, View } from 'react-native';
import { CaretRight, Globe, InstagramLogo, YoutubeLogo } from 'phosphor-react-native';

import { Body, Card, Field, SectionTitle } from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

/**
 * A listing's public social links. The server (SocialLinksDto) is the rule;
 * the patterns here only catch a mistake before the round trip.
 */
export const SOCIAL_LINKS = [
  {
    key: 'instagramUrl',
    label: 'Instagram',
    Icon: InstagramLogo,
    hosts: /^(www\.|m\.)?instagram\.com$/,
    placeholder: 'https://www.instagram.com/yourpage',
  },
  {
    key: 'youtubeUrl',
    label: 'YouTube',
    Icon: YoutubeLogo,
    hosts: /^((www\.|m\.)?youtube\.com|youtu\.be)$/,
    placeholder: 'https://www.youtube.com/@yourchannel',
  },
  {
    key: 'website',
    label: 'Website',
    Icon: Globe,
    hosts: null,
    placeholder: 'https://www.yourbusiness.in',
  },
] as const;

export type SocialKey = (typeof SOCIAL_LINKS)[number]['key'];
export type SocialLinks = Partial<Record<SocialKey, string | null>>;
export const SOCIAL_KEYS = SOCIAL_LINKS.map((l) => l.key);

export function socialLinkErrors(values: Record<SocialKey, string>) {
  const errors: Partial<Record<SocialKey, string>> = {};
  for (const { key, label, hosts } of SOCIAL_LINKS) {
    const value = values[key].trim();
    if (!value) continue;
    const host = /^https:\/\/([^/?#:\s]+)(:\d+)?([/?#]\S*)?$/i.exec(value)?.[1]?.toLowerCase();
    if (!host || !host.includes('.') || (hosts && !hosts.test(host))) {
      errors[key] = `Enter a full ${label} link starting with https://`;
    }
  }
  return errors;
}

export function SocialLinkFields({
  values,
  onChange,
  errors,
}: {
  values: Record<SocialKey, string>;
  onChange: (key: SocialKey, value: string) => void;
  errors?: Partial<Record<SocialKey, string>>;
}) {
  return (
    <Card>
      <SectionTitle>Social Media</SectionTitle>
      {SOCIAL_LINKS.map(({ key, label, placeholder }) => (
        <Field
          key={key}
          label={`${label} (optional)`}
          value={values[key]}
          onChangeText={(v) => onChange(key, v)}
          placeholder={placeholder}
          error={errors?.[key]}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
        />
      ))}
    </Card>
  );
}

/** The configured links only; nothing at all when there are none. */
export function SocialLinksList({ links }: { links: SocialLinks }) {
  const theme = useTheme();
  const shown = SOCIAL_LINKS.filter(({ key }) => links[key]);
  if (shown.length === 0) return null;
  return (
    <View style={{ gap: space(1), marginTop: space(2) }}>
      <Body style={{ fontWeight: '600' }}>Social Media</Body>
      {shown.map(({ key, label, Icon }) => (
        <Pressable
          key={key}
          accessibilityRole="link"
          accessibilityLabel={`Open ${label}`}
          onPress={() => void Linking.openURL(links[key] as string)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(3),
            paddingVertical: space(2),
            borderTopWidth: 1,
            borderTopColor: rgb(theme.border),
          }}
        >
          <Icon size={20} color={rgb(theme.brand)} />
          <Body style={{ flex: 1 }}>{label}</Body>
          <CaretRight size={16} color={rgb(theme.ink[500])} />
        </Pressable>
      ))}
    </View>
  );
}
