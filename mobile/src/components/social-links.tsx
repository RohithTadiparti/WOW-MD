import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import {
  CaretRight,
  FacebookLogo,
  Globe,
  InstagramLogo,
  Link as LinkIcon,
  LinkedinLogo,
  PinterestLogo,
  XLogo,
  YoutubeLogo,
} from 'phosphor-react-native';

import { SelectField } from '@/components/form';
import { Body, Button, Caption, Card, Field, SectionTitle } from '@/components/ui';
import {
  MAX_SOCIAL_LABEL,
  MAX_SOCIAL_LINKS,
  MAX_SOCIAL_URL,
  SOCIAL_PLATFORMS,
  httpsHost,
  listingSocialLinks,
  socialLinkError,
  socialLinkName,
  socialPlatformRule,
  type SocialLink,
  type SocialPlatform,
} from '@/shared/social-links';
import { rgb, space, useTheme } from '@/theme';

/**
 * A listing's public social links. The rules are the web client's
 * (shared/social-links), which are the server's (SocialLinksDto); checking them
 * here only catches a mistake before the round trip.
 */

const ICONS: Record<SocialPlatform, typeof Globe> = {
  instagram: InstagramLogo,
  youtube: YoutubeLogo,
  facebook: FacebookLogo,
  pinterest: PinterestLogo,
  x: XLogo,
  linkedin: LinkedinLogo,
  website: Globe,
  other: LinkIcon,
};

const PLATFORM_OPTIONS = SOCIAL_PLATFORMS.map((p) => ({ value: p.value, label: p.label }));

/**
 * As many links as the business has, each naming its platform.
 *
 * Three fixed boxes left a florist whose work is on Pinterest, or a caterer on
 * Facebook, nowhere to put it. A row's problem shows once the form has been
 * saved (`showErrors`) or the address has been left, not while it is typed.
 */
export function SocialLinksEditor({
  value,
  onChange,
  showErrors = false,
  error,
}: {
  value: SocialLink[];
  onChange: (next: SocialLink[]) => void;
  showErrors?: boolean;
  error?: string;
}) {
  const [touched, setTouched] = useState<boolean[]>([]);
  const full = value.length >= MAX_SOCIAL_LINKS;

  const update = (i: number, patch: Partial<SocialLink>) =>
    onChange(value.map((link, j) => (j === i ? { ...link, ...patch } : link)));
  const remove = (i: number) => {
    onChange(value.filter((_, j) => j !== i));
    setTouched((t) => t.filter((_, j) => j !== i));
  };
  const add = () => {
    if (full) return;
    // A business's own site is the most common first link, Instagram the next.
    const used = new Set(value.map((l) => l.platform));
    const platform: SocialPlatform = !used.has('website')
      ? 'website'
      : !used.has('instagram')
        ? 'instagram'
        : 'other';
    onChange([...value, { platform, url: '' }]);
  };

  return (
    <Card>
      <SectionTitle>Social media and website</SectionTitle>
      <Body tone="muted">
        Optional. Where couples can see more of your work. Each link must start with https://.
      </Body>
      {value.length === 0 ? <Caption tone="faint">No links yet.</Caption> : null}
      {value.map((link, i) => {
        const rule = socialPlatformRule(link.platform);
        // An empty row is dropped on save, not refused (see socialLinkErrors).
        const rowError =
          (showErrors || touched[i]) && link.url.trim() ? socialLinkError(link) : null;
        return (
          <View key={i} style={{ gap: space(2) }}>
            <SelectField
              label={`Link ${i + 1} platform`}
              value={link.platform}
              options={PLATFORM_OPTIONS}
              onChange={(platform) => update(i, { platform: platform as SocialPlatform })}
            />
            <Field
              label={`${rule?.label ?? 'Link'} address`}
              value={link.url}
              onChangeText={(url) => update(i, { url })}
              onBlur={() =>
                setTouched((t) => {
                  const next = [...t];
                  next[i] = true;
                  return next;
                })
              }
              placeholder={rule?.placeholder ?? 'https://'}
              error={rowError ?? undefined}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={MAX_SOCIAL_URL}
            />
            {link.platform === 'other' ? (
              <Field
                label="Name for this link"
                value={link.label ?? ''}
                onChangeText={(label) => update(i, { label })}
                placeholder="e.g. Behance"
                maxLength={MAX_SOCIAL_LABEL}
              />
            ) : null}
            <Button label={`Remove link ${i + 1}`} variant="ghost" small onPress={() => remove(i)} />
          </View>
        );
      })}
      <Button label="Add a link" variant="outline" small disabled={full} onPress={add} />
      <Caption tone={full ? 'brand' : 'faint'}>
        {value.length} of {MAX_SOCIAL_LINKS}
      </Caption>
      {error ? <Caption tone="critical">{error}</Caption> : null}
    </Card>
  );
}

export interface SocialLinks {
  socialLinks?: SocialLink[] | null;
  website?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
}

/** Whether a listing has any link worth showing. */
export function hasSocialLinks(listing: SocialLinks | null | undefined): boolean {
  return listingSocialLinks(listing).length > 0;
}

/** The configured https links only; nothing at all when there are none. */
export function SocialLinksList({ links }: { links: SocialLinks }) {
  const theme = useTheme();
  const shown = listingSocialLinks(links);
  if (shown.length === 0) return null;
  return (
    <View style={{ gap: space(1), marginTop: space(2) }}>
      <Body style={{ fontWeight: '600' }}>Social media and website</Body>
      {shown.map((link) => {
        const Icon = ICONS[link.platform] ?? LinkIcon;
        const name = socialLinkName(link);
        const host = httpsHost(link.url)?.replace(/^www\./, '');
        return (
          <Pressable
            key={link.url}
            accessibilityRole="link"
            accessibilityLabel={`Open ${name}${host ? `, ${host}` : ''}`}
            onPress={() => void Linking.openURL(link.url)}
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
            <View style={{ flex: 1 }}>
              <Body>{name}</Body>
              {host ? <Caption tone="faint">{host}</Caption> : null}
            </View>
            <CaretRight size={16} color={rgb(theme.ink[500])} />
          </Pressable>
        );
      })}
    </View>
  );
}
