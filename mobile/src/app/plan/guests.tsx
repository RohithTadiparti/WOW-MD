import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Alert as NativeAlert, Image, Linking, Platform, Pressable, Share, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import {
  Copy,
  DotsThreeVertical,
  ImageSquare,
  Link as LinkIcon,
  MagnifyingGlass,
  Minus,
  PaperPlaneTilt,
  Phone,
  Plus,
  ShareNetwork,
  WhatsappLogo,
} from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { rsvpBadge, rsvpLink, whatsappUrl, type RsvpStatus } from '@/lib/rsvp';
import { Badge, FilterChips } from '@/components/chrome';
import { PhotoPicker, reachable } from '@/components/uploader';
import { Alert, Body, Button, Caption, Card, EmptyState, Field, Loading, Screen } from '@/components/ui';
import { rgb, space, useTheme, radius } from '@/theme';

type RelationFilter = 'all' | 'family' | 'friends' | 'work' | 'others';

/** A row of `GET /events/guests`, carrying the guest's one wedding invitation. */
interface Guest {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  partySize?: number | null;
  relation?: string | null;
  notes?: string | null;
  /** Null until the wedding invitation is sent. */
  rsvpStatus?: RsvpStatus | null;
  respondedAt?: string | null;
  attendingCount?: number | null;
  declineReason?: string | null;
  invitedEventIds?: string[];
}

/** A row of `GET /events`, as much as a wedding invitation needs. */
interface WeddingEventRow {
  id: string;
  name: string;
  eventDate?: string | null;
  status?: string | null;
}

/** `GET /events/wedding-invitation`: the card and the Direct Link, both the wedding's. */
interface WeddingInvitation {
  cardUrl: string | null;
  directLink: string | null;
}

type Mode =
  | { kind: 'list' }
  | { kind: 'form'; guest?: Guest }
  | { kind: 'sent'; guest: Guest; link: string };

const RELATION_CHIPS: { key: RelationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'family', label: 'Family' },
  { key: 'friends', label: 'Friends' },
  { key: 'work', label: 'Work' },
  { key: 'others', label: 'Others' },
];

/** The categories a guest is filed under; the same four the list filters on. */
const CATEGORIES = ['Family', 'Friends', 'Work', 'Others'];

function bucketRelation(relation: string | null | undefined): Exclude<RelationFilter, 'all'> {
  const value = (relation ?? '').toLowerCase();
  if (!value) return 'others';
  if (/(family|uncle|aunt|cousin|parent|mother|father|brother|sister|in-law|relative)/.test(value)) {
    return 'family';
  }
  if (/(friend|college|school)/.test(value)) return 'friends';
  if (/(work|office|colleague|boss|client)/.test(value)) return 'work';
  return 'others';
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** What the invitation itself has done, from the fields the server keeps. */
function invitationLine(guest: Guest): string {
  if (!guest.rsvpStatus) return 'Invitation not sent';
  if (guest.rsvpStatus === 'attending') {
    return `Accepted ${shortDate(guest.respondedAt)}${guest.attendingCount ? ` · ${guest.attendingCount} attending` : ''}`;
  }
  if (guest.rsvpStatus === 'declined') {
    return `Declined ${shortDate(guest.respondedAt)}${guest.declineReason ? ` · "${guest.declineReason}"` : ''}`;
  }
  if (guest.rsvpStatus === 'maybe') return `Replied maybe ${shortDate(guest.respondedAt)}`;
  return 'Invitation sent · not yet answered';
}

export default function PlanGuests() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RelationFilter>('all');
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const guests = useQuery({
    queryKey: ['guests'],
    queryFn: async () => (await api.get('/events/guests')).data as Guest[],
    // Replies arrive from guests' own links, not from this screen.
    refetchInterval: 20_000,
    retry: false,
  });
  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await api.get('/events')).data,
    retry: false,
  });
  const invitation = useQuery({
    queryKey: ['wedding-invitation'],
    queryFn: async () => (await api.get('/events/wedding-invitation')).data as WeddingInvitation,
    retry: false,
  });
  const eventRows = useMemo(
    () =>
      ((Array.isArray(events.data) ? events.data : (events.data?.data ?? [])) as WeddingEventRow[]).filter(
        (e) => e.status !== 'cancelled',
      ),
    [events.data],
  );
  const hasEvents = eventRows.length > 0;

  const refreshGuests = useCallback(
    () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['guests'] }),
        qc.invalidateQueries({ queryKey: ['guest-list'] }),
        qc.invalidateQueries({ queryKey: ['rsvp-guests'] }),
        qc.invalidateQueries({ queryKey: ['wedding-dashboard'] }),
      ]),
    [qc],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshGuests();
    }, [refreshGuests]),
  );

  // One invitation for the whole wedding: every event still going ahead,
  // rather than a choice of events per guest.
  const invite = useMutation({
    mutationFn: async (guest: Guest) =>
      (await api.post(`/events/guests/${guest.id}/invite`, { eventIds: eventRows.map((e) => e.id) }))
        .data as { rsvpUrl: string },
    onSuccess: async (data, guest) => {
      setError('');
      setMode({ kind: 'sent', guest, link: rsvpLink(data.rsvpUrl) });
      await refreshGuests();
    },
    onError: (err) => setError(apiMessage(err, 'The invitation could not be created.')),
  });

  const override = useMutation({
    mutationFn: async ({ guestId, status }: { guestId: string; status: RsvpStatus }) =>
      api.put(`/events/guests/${guestId}/rsvp`, { status }),
    onSuccess: async () => {
      setError('');
      await refreshGuests();
    },
    onError: (err) => setError(apiMessage(err, 'That reply could not be recorded.')),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (guests.data ?? []).filter((guest) => {
      if (filter !== 'all' && bucketRelation(guest.relation) !== filter) return false;
      if (!q) return true;
      return (
        guest.name.toLowerCase().includes(q) ||
        (guest.relation ?? '').toLowerCase().includes(q) ||
        (guest.phone ?? '').includes(q)
      );
    });
  }, [guests.data, search, filter]);

  if (mode.kind === 'form') {
    return (
      <GuestForm
        guest={mode.guest}
        onCancel={() => setMode({ kind: 'list' })}
        onSaved={async () => {
          await refreshGuests();
          setNotice(mode.guest ? 'Guest updated.' : 'Guest added.');
          setMode({ kind: 'list' });
        }}
      />
    );
  }

  if (mode.kind === 'sent') {
    return (
      <InvitationSent
        {...mode}
        cardUrl={invitation.data?.cardUrl ?? null}
        onDone={() => setMode({ kind: 'list' })}
      />
    );
  }

  const all = guests.data ?? [];
  const onList = all.length;
  const count = (status: RsvpStatus | null) => all.filter((g) => (g.rsvpStatus ?? null) === status).length;
  const notInvited = count(null);
  const maybe = count('maybe');

  return (
    <Screen onRefresh={() => void refreshGuests()} refreshing={guests.isRefetching}>
      <Caption tone="muted">
        Manage your wedding guests. One invitation covers your whole wedding.
      </Caption>
      {notice ? <Alert tone="positive">{notice}</Alert> : null}
      {error ? <Alert tone="critical">{error}</Alert> : null}

      <InvitationCardSection invitation={invitation.data} loading={invitation.isPending} />
      <DirectLinkSection invitation={invitation.data} />

      {!events.isPending && !hasEvents ? (
        <Card style={{ gap: space(2) }}>
          <Body style={{ fontWeight: '600' }}>Add your wedding events to send invitations</Body>
          <Caption tone="muted">
            A guest&apos;s invitation covers every event of your wedding, with its date, time and venue.
          </Caption>
          <Button small variant="outline" label="Go to Events" onPress={() => router.push('/events')} />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <StatBox label="Total" value={onList} tone="brand" />
        <StatBox label="Confirmed" value={count('attending')} tone="positive" />
        <StatBox label="Pending" value={count('invited')} tone="caution" />
        <StatBox label="Declined" value={count('declined')} tone="critical" />
      </View>
      {notInvited > 0 || maybe > 0 ? (
        <Caption tone="muted">
          {[notInvited > 0 ? `${notInvited} not invited yet` : null, maybe ? `${maybe} maybe` : null]
            .filter(Boolean)
            .join(' · ')}
        </Caption>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: rgb(theme.surface),
          borderRadius: radius.md,
          paddingLeft: space(3),
          borderWidth: 1,
          borderColor: rgb(theme.border),
        }}
      >
        <MagnifyingGlass size={18} color={rgb(theme.brand)} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search guests by name or phone"
          placeholderTextColor={rgb(theme.ink[400])}
          style={{ flex: 1, padding: space(3), color: rgb(theme.ink[900]) }}
        />
      </View>

      <FilterChips
        options={RELATION_CHIPS.map((chip) => ({
          key: chip.key,
          label: chip.label,
          count:
            chip.key === 'all'
              ? onList
              : (guests.data ?? []).filter((g) => bucketRelation(g.relation) === chip.key).length,
        }))}
        value={filter}
        onChange={(key) => setFilter((key as RelationFilter | null) ?? 'all')}
      />

      {guests.isPending ? (
        <Loading rows={3} />
      ) : guests.error ? (
        <Alert tone="critical">{apiMessage(guests.error, 'Guests could not be loaded.')}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title={onList ? 'No guests match' : 'No guests yet'}>
          {onList ? 'Try another search or filter.' : 'Add family and friends, or share your Direct Link.'}
        </EmptyState>
      ) : (
        rows.map((guest) => {
          const status = rsvpBadge(guest.rsvpStatus ?? undefined);
          const sending = invite.isPending && invite.variables?.id === guest.id;
          return (
            <Card key={guest.id} style={{ gap: space(3) }}>
              <View style={{ flexDirection: 'row', gap: space(3) }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: rgb(theme.brandSoft),
                  }}
                >
                  <Body style={{ fontWeight: '700', color: rgb(theme.brandStrong) }}>{initials(guest.name)}</Body>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Body style={{ fontWeight: '600' }}>{guest.name}</Body>
                  <Caption tone="muted">
                    {[guest.relation || 'Guest', guest.partySize ? `${guest.partySize} ${guest.partySize === 1 ? 'guest' : 'guests'}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Caption>
                  {guest.phone ? <Contact text={guest.phone} /> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: space(1) }}>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {guest.rsvpStatus ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`More actions for ${guest.name}`}
                      hitSlop={8}
                      onPress={() =>
                        NativeAlert.alert(guest.name, 'Record a reply they gave you in person or by phone.', [
                          { text: 'Mark as Confirmed', onPress: () => override.mutate({ guestId: guest.id, status: 'attending' }) },
                          { text: 'Mark as Declined', onPress: () => override.mutate({ guestId: guest.id, status: 'declined' }) },
                          { text: 'Cancel', style: 'cancel' },
                        ])
                      }
                    >
                      <DotsThreeVertical size={20} weight="bold" color={rgb(theme.ink[500])} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Caption tone="faint">{hasEvents ? invitationLine(guest) : 'Add an event to invite'}</Caption>
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                <Button
                  style={{ flex: 1 }}
                  small
                  variant="outline"
                  label="Edit"
                  onPress={() => {
                    setNotice('');
                    setMode({ kind: 'form', guest });
                  }}
                />
                {hasEvents ? (
                  <Button
                    style={{ flex: 2 }}
                    small
                    label={
                      !guest.rsvpStatus
                        ? 'Send Invitation'
                        : guest.rsvpStatus === 'invited'
                          ? 'Resend Invitation'
                          : 'Send New Link'
                    }
                    busy={sending}
                    disabled={invite.isPending && !sending}
                    onPress={() => {
                      setNotice('');
                      invite.mutate(guest);
                    }}
                  />
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      <Button
        label="Add Guest"
        onPress={() => {
          setNotice('');
          setMode({ kind: 'form' });
        }}
      />
    </Screen>
  );
}

/**
 * The wedding's invitation card: upload, preview, replace, remove.
 *
 * It belongs to the wedding, not to any guest (`/events/wedding-invitation`),
 * so changing or removing it leaves every guest and reply exactly as it was.
 */
function InvitationCardSection({
  invitation,
  loading,
}: {
  invitation?: WeddingInvitation;
  loading: boolean;
}) {
  const theme = useTheme();
  const qc = useQueryClient();
  const [error, setError] = useState('');
  const cardUrl = invitation?.cardUrl ?? null;

  const save = useMutation({
    mutationFn: async (url: string) => api.put('/events/wedding-invitation/card', { cardUrl: url }),
    onSuccess: async () => {
      setError('');
      await qc.invalidateQueries({ queryKey: ['wedding-invitation'] });
    },
    onError: (err) => setError(apiMessage(err, 'The invitation card could not be saved.')),
  });
  const remove = useMutation({
    mutationFn: async () => api.delete('/events/wedding-invitation/card'),
    onSuccess: async () => {
      setError('');
      await qc.invalidateQueries({ queryKey: ['wedding-invitation'] });
    },
    onError: (err) => setError(apiMessage(err, 'The invitation card could not be removed.')),
  });

  return (
    <Card style={{ gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
        <ImageSquare size={20} color={rgb(theme.brand)} />
        <Body style={{ fontWeight: '700' }}>Invitation Card</Body>
      </View>
      <Caption tone="muted">
        One card for your whole wedding. Guests see it on their invitation. Replacing it never changes your guests or their replies.
      </Caption>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      {loading ? (
        <Loading rows={1} />
      ) : cardUrl ? (
        <>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Preview invitation card"
            onPress={() => void WebBrowser.openBrowserAsync(reachable(cardUrl))}
          >
            <Image
              source={{ uri: reachable(cardUrl) }}
              resizeMode="contain"
              style={{ width: '100%', height: 260, backgroundColor: rgb(theme.surfaceSunken) }}
            />
          </Pressable>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            <Button
              small
              variant="outline"
              label="Preview"
              onPress={() => void WebBrowser.openBrowserAsync(reachable(cardUrl))}
            />
            <PhotoPicker label="Replace" onUploaded={(url) => save.mutate(url)} />
            <Button
              small
              variant="outline"
              label="Remove"
              busy={remove.isPending}
              onPress={() =>
                NativeAlert.alert('Remove the invitation card?', 'Your guests and their replies stay as they are.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => remove.mutate() },
                ])
              }
            />
          </View>
        </>
      ) : (
        <PhotoPicker label="Upload Invitation Card" onUploaded={(url) => save.mutate(url)} />
      )}
    </Card>
  );
}

/**
 * The wedding's Direct Link: one link to copy or share anywhere. Whoever opens
 * it sees the card and gives their name, mobile and head count, and is added
 * to this list for the whole wedding.
 */
function DirectLinkSection({ invitation }: { invitation?: WeddingInvitation }) {
  const theme = useTheme();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const link = invitation?.directLink ?? null;

  const issue = useMutation({
    mutationFn: async (rotate: boolean) =>
      (await api.post('/events/wedding-invitation/direct-link', { rotate })).data as { url: string },
    onSuccess: async () => {
      setError('');
      setCopied(false);
      await qc.invalidateQueries({ queryKey: ['wedding-invitation'] });
    },
    onError: (err) => setError(apiMessage(err, 'The link could not be created.')),
  });

  const message = (url: string) => `You are warmly invited to our wedding. Please add your details here: ${url}`;

  return (
    <Card style={{ gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
        <LinkIcon size={20} color={rgb(theme.brand)} />
        <Body style={{ fontWeight: '700' }}>Direct Link</Body>
      </View>
      <Caption tone="muted">
        Share one link with everyone. Guests see your invitation card and add their name, phone number and number of guests.
      </Caption>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      {link ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy Direct Link"
            onPress={async () => {
              await Clipboard.setStringAsync(link);
              setCopied(true);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space(2),
              padding: space(3),
              borderWidth: 1,
              borderColor: rgb(theme.border),
              backgroundColor: rgb(theme.surfaceSunken),
            }}
          >
            <Caption numberOfLines={1} style={{ flex: 1 }}>
              {link}
            </Caption>
            <Copy size={18} color={rgb(theme.brand)} />
          </Pressable>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            <Button
              small
              label={copied ? 'Copied' : 'Copy Link'}
              onPress={async () => {
                await Clipboard.setStringAsync(link);
                setCopied(true);
              }}
            />
            <Button small variant="outline" label="Share" onPress={() => void Share.share({ message: message(link) })} />
            <Button
              small
              variant="outline"
              label="WhatsApp"
              onPress={() => void Linking.openURL(whatsappUrl(message(link)))}
            />
            <Button
              small
              variant="outline"
              label="New Link"
              busy={issue.isPending}
              onPress={() =>
                NativeAlert.alert(
                  'Replace the Direct Link?',
                  'The current link stops working. Guests who already used it stay on your list.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Replace', style: 'destructive', onPress: () => issue.mutate(true) },
                  ],
                )
              }
            />
          </View>
        </>
      ) : (
        <Button label="Create Direct Link" busy={issue.isPending} onPress={() => issue.mutate(false)} />
      )}
    </Card>
  );
}

function Contact({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}>
      <Phone size={12} color={rgb(theme.ink[500])} />
      <Caption tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        {text}
      </Caption>
    </View>
  );
}

/**
 * Adding or editing a guest: name, phone, category and, optionally, how many.
 *
 * Nothing else. No email (invitations go by phone), and no reply question: a
 * guest's answer comes from their invitation, or is recorded from the list.
 * Notes already on a guest are kept, because this form never sends them.
 */
function GuestForm({
  guest,
  onCancel,
  onSaved,
}: {
  guest?: Guest;
  onCancel: () => void;
  onSaved: (guest: Guest) => void | Promise<void>;
}) {
  const theme = useTheme();
  const [name, setName] = useState(guest?.name ?? '');
  const [phone, setPhone] = useState((guest?.phone ?? '').replace(/^\+91/, ''));
  const [category, setCategory] = useState(guest?.relation ?? '');
  const [partySize, setPartySize] = useState<number | null>(guest?.partySize ?? null);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const phoneError = digits && !/^[6-9]\d{9}$/.test(digits) ? 'Enter a 10-digit Indian mobile number' : undefined;
  const nameError = tried && !name.trim() ? 'This field is required.' : undefined;
  // A category typed on an older version stays selectable as it was.
  const categories = category && !CATEGORIES.includes(category) ? [...CATEGORIES, category] : CATEGORIES;

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: name.trim(),
        phone: digits || null,
        relation: category || null,
        partySize,
      };
      return (guest ? await api.put(`/events/guests/${guest.id}`, body) : await api.post('/events/guests', body))
        .data as Guest;
    },
    onSuccess: (saved) => onSaved(saved),
    onError: (err) => setError(apiMessage(err, 'That guest could not be saved.')),
  });

  return (
    <Screen>
      <Body style={{ fontSize: 20, fontWeight: '700', color: rgb(theme.brandStrong) }}>
        {guest ? 'Edit Guest' : 'Add Guest'}
      </Body>
      {error ? <Alert tone="critical">{error}</Alert> : null}
      <Field
        label="Guest Name"
        required
        value={name}
        onChangeText={setName}
        placeholder="Guest name"
        maxLength={120}
        autoCapitalize="words"
        error={nameError}
      />
      <Field
        label="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="10-digit mobile number"
        error={phoneError}
      />
      <View style={{ gap: space(2) }}>
        <Caption style={{ fontWeight: '600', color: rgb(theme.ink[800]) }}>Guest Category</Caption>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {categories.map((pick) => (
            <Button
              key={pick}
              small
              variant={category === pick ? 'primary' : 'outline'}
              label={pick}
              onPress={() => setCategory(category === pick ? '' : pick)}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: space(1) }}>
        <Caption style={{ fontWeight: '600', color: rgb(theme.ink[800]) }}>Number of Guests (optional)</Caption>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
          <Stepper
            icon="minus"
            disabled={partySize === null}
            onPress={() => setPartySize((n) => (n === null || n <= 1 ? null : n - 1))}
          />
          <Body style={{ minWidth: 48, textAlign: 'center', fontWeight: '700' }}>{partySize ?? 'Not set'}</Body>
          <Stepper
            icon="plus"
            disabled={(partySize ?? 0) >= 100}
            onPress={() => setPartySize((n) => (n ?? 0) + 1)}
          />
        </View>
      </View>
      <Button
        label={guest ? 'Save Changes' : 'Save Guest'}
        busy={save.isPending}
        disabled={Boolean(phoneError)}
        onPress={() => {
          setTried(true);
          if (!name.trim()) return;
          save.mutate();
        }}
      />
      <Button label="Cancel" variant="outline" disabled={save.isPending} onPress={onCancel} />
    </Screen>
  );
}

function Stepper({ icon, disabled, onPress }: { icon: 'minus' | 'plus'; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const Glyph = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'minus' ? 'Fewer guests' : 'More guests'}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: rgb(theme.border),
        backgroundColor: rgb(theme.surface),
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Glyph size={18} color={rgb(theme.brand)} />
    </Pressable>
  );
}

/**
 * Sends the wedding's invitation card as an image, with the guest's own link
 * as its message.
 *
 * iOS shares the two together. Android's share sheet takes a file or a text,
 * not both, so the message is put on the clipboard first and the card goes
 * out as the image; the person pastes the message as its caption.
 */
async function shareCard(cardUrl: string, message: string): Promise<'shared' | 'caption-copied'> {
  const source = reachable(cardUrl);
  const extension = /\.(png|webp|jpe?g)(\?|$)/i.exec(source)?.[1] ?? 'jpg';
  const target = `${FileSystem.cacheDirectory}wedding-invitation.${extension}`;
  const { uri } = await FileSystem.downloadAsync(source, target);
  if (Platform.OS === 'ios') {
    await Share.share({ url: uri, message });
    return 'shared';
  }
  await Clipboard.setStringAsync(message);
  await Sharing.shareAsync(uri, { mimeType: extension === 'png' ? 'image/png' : 'image/jpeg', dialogTitle: 'Send invitation' });
  return 'caption-copied';
}

function InvitationSent({
  guest,
  link,
  cardUrl,
  onDone,
}: {
  guest: Guest;
  link: string;
  cardUrl: string | null;
  onDone: () => void;
}) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [sharing, setSharing] = useState(false);
  const message = `Dear ${guest.name}, you are warmly invited to our wedding. Your invitation: ${link}`;

  return (
    <Screen>
      <Card style={{ alignItems: 'center', gap: space(3), paddingVertical: space(6) }}>
        <View
          style={{
            width: 72,
            height: 72,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: rgb(theme.brandSoft),
          }}
        >
          <PaperPlaneTilt size={34} color={rgb(theme.brand)} />
        </View>
        <Body style={{ fontSize: 20, fontWeight: '700' }}>Invitation ready</Body>
        <Caption tone="muted" style={{ textAlign: 'center' }}>
          {`A personal invitation link for ${guest.name}, covering your whole wedding.`}
        </Caption>
      </Card>

      {cardUrl ? (
        <Image
          source={{ uri: reachable(cardUrl) }}
          resizeMode="contain"
          style={{ width: '100%', height: 240, backgroundColor: rgb(theme.surfaceSunken) }}
        />
      ) : (
        <Alert tone="caution">Upload an invitation card on the Guest List to send it with the invitation.</Alert>
      )}
      {note ? <Alert tone="positive">{note}</Alert> : null}

      {cardUrl ? (
        <ShareRow
          icon={<ImageSquare size={22} color={rgb(theme.brand)} />}
          label={sharing ? 'Preparing card…' : 'Send Invitation Card'}
          onPress={async () => {
            if (sharing) return;
            setSharing(true);
            setNote('');
            try {
              const outcome = await shareCard(cardUrl, message);
              if (outcome === 'caption-copied') {
                setNote('The invitation message is copied. Paste it as the caption with the card.');
              }
            } catch {
              setNote('');
              NativeAlert.alert('The card could not be shared', 'Try again, or send the link below.');
            } finally {
              setSharing(false);
            }
          }}
        />
      ) : null}
      <ShareRow
        icon={<WhatsappLogo size={22} color={rgb(theme.positiveFg)} />}
        label="Send via WhatsApp"
        onPress={() => void Linking.openURL(whatsappUrl(message, guest.phone))}
      />
      <ShareRow
        icon={<ShareNetwork size={22} color={rgb(theme.brand)} />}
        label="Share via Other Apps"
        onPress={() => void Share.share({ message })}
      />
      <ShareRow
        icon={<Copy size={22} color={rgb(theme.brand)} />}
        label={copied ? 'Link Copied' : 'Copy Link'}
        onPress={async () => {
          await Clipboard.setStringAsync(link);
          setCopied(true);
        }}
      />

      <Caption tone="muted">
        {`This link is only for ${guest.name}. Sending a new link replaces it.`}
      </Caption>

      <Button label="Done" onPress={onDone} />
    </Screen>
  );
}

function ShareRow({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), opacity: pressed ? 0.7 : 1 }}>
          {icon}
          <Body style={{ fontWeight: '600' }}>{label}</Body>
        </Card>
      )}
    </Pressable>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'positive' | 'caution' | 'critical';
}) {
  const theme = useTheme();
  const bg =
    tone === 'positive'
      ? theme.positiveBg
      : tone === 'caution'
        ? theme.cautionBg
        : tone === 'critical'
          ? theme.criticalBg
          : theme.brandSoft;
  const fg =
    tone === 'positive'
      ? theme.positiveFg
      : tone === 'caution'
        ? theme.cautionFg
        : tone === 'critical'
          ? theme.criticalFg
          : theme.brandStrong;
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: space(3),
        paddingHorizontal: space(2),
        borderRadius: radius.md,
        backgroundColor: rgb(bg),
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Caption style={{ color: rgb(fg) }} numberOfLines={1}>
        {label}
      </Caption>
      <Body style={{ fontWeight: '700', fontSize: 22, color: rgb(fg) }}>{value}</Body>
    </View>
  );
}
