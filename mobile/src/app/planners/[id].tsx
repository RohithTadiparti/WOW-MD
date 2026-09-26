import { useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Image,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, MapPin, SealCheck, Star } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { loadPlannerShortlist, togglePlannerShortlist } from '@/lib/plan-shortlist';
import { DateField } from '@/components/form';
import {
  Alert,
  Body,
  Button,
  Caption,
  Card,
  EmptyState,
  Field,
  Loading,
  SectionTitle,
} from '@/components/ui';
import { rgb, space, useTheme, radius } from '@/theme';

type Tab = 'about' | 'services' | 'reviews' | 'gallery';

type Planner = {
  id: string;
  agencyName: string;
  city?: string;
  bio?: string;
  yearsExperience: number;
  ratingAvg: number;
  ratingCount: number;
  portfolio?: string[];
  packages?: { name: string; price: number; includes?: string[] }[];
  contactPerson?: string | null;
  website?: string | null;
  ownerUserId: string;
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt?: string;
};

export default function PlannerDetail() {
  const qc = useQueryClient();
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('about');
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [requesting, setRequesting] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState('');
  const [requirements, setRequirements] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void loadPlannerShortlist().then(setShortlist);
  }, []);

  const query = useQuery({
    queryKey: ['planner', id],
    queryFn: async () => (await api.get(`/wedding-planners/${id}`)).data as Planner,
    enabled: Boolean(id),
    retry: false,
  });

  const reviews = useQuery({
    queryKey: ['planner-reviews', id],
    queryFn: async () =>
      (await api.get(`/wedding-planners/${id}/reviews`)).data as
        | { data?: Review[] }
        | Review[],
    enabled: Boolean(id) && tab === 'reviews',
    retry: false,
  });

  const request = useMutation({
    mutationFn: async () => {
      const response = await api.post('/bookings', {
        providerType: 'planner',
        providerId: id,
        ...(eventDate ? { eventDate } : {}),
        ...(budget ? { expectedBudget: Number(budget) } : {}),
        ...(requirements.trim() ? { requirements: requirements.trim() } : {}),
      });
      return response.data as { id: string };
    },
    onSuccess: async (data) => {
      setRequesting(false);
      setNotice('');
      setError('');
      await qc.invalidateQueries({ queryKey: ['my-bookings'] });
      await qc.invalidateQueries({ queryKey: ['wedding-dashboard'] });
      router.push({ pathname: '/plan/bookings', params: { highlight: data.id } });
    },
    onError: (err) => setError(apiMessage(err, 'That request could not be sent.')),
  });

  if (query.isPending) {
    return (
      <View style={{ flex: 1, padding: space(4), backgroundColor: rgb(theme.canvas) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={{ marginBottom: space(3), alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={22} color={rgb(theme.ink[800])} />
        </Pressable>
        <Loading rows={4} />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <View style={{ flex: 1, padding: space(4), backgroundColor: rgb(theme.canvas) }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={{ marginBottom: space(3), alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={22} color={rgb(theme.ink[800])} />
        </Pressable>
        <EmptyState title="Planner unavailable">
          {apiMessage(query.error, 'This listing may no longer be available.')}
        </EmptyState>
      </View>
    );
  }

  const planner = query.data;
  const photos = planner.portfolio ?? [];
  const saved = shortlist.has(planner.id);
  const reviewRows: Review[] = Array.isArray(reviews.data)
    ? reviews.data
    : (reviews.data?.data ?? []);

  return (
    <View style={{ flex: 1, backgroundColor: rgb(theme.canvas) }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ height: width * 0.68, backgroundColor: rgb(theme.surfaceSunken) }}>
          {photos[0] ? (
            <Image source={{ uri: photos[0] }} style={{ width, height: '100%' }} resizeMode="cover" />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: space(5),
              left: space(3),
              padding: space(2),
              borderRadius: radius.md,
              backgroundColor: rgb(theme.surface),
            }}
          >
            <ArrowLeft size={20} color={rgb(theme.ink[800])} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Shortlist planner"
            onPress={() => void togglePlannerShortlist(planner.id).then(setShortlist)}
            style={{
              position: 'absolute',
              top: space(5),
              right: space(3),
              padding: space(2),
              borderRadius: radius.md,
              backgroundColor: rgb(theme.surface),
            }}
          >
            <Heart
              size={20}
              weight={saved ? 'fill' : 'regular'}
              color={rgb(theme.brand)}
            />
          </Pressable>
          {photos.length > 0 ? (
            <View
              style={{
                position: 'absolute',
                bottom: space(3),
                right: space(3),
                paddingHorizontal: space(2),
                paddingVertical: space(1),
                borderRadius: radius.md,
                backgroundColor: 'rgba(0,0,0,0.55)',
              }}
            >
              <Caption style={{ color: '#fff' }}>1/{photos.length}</Caption>
            </View>
          ) : null}
        </View>

        <View style={{ padding: space(4), gap: space(4) }}>
          <View style={{ gap: space(1) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}>
              <SectionTitle>{planner.agencyName}</SectionTitle>
              <SealCheck size={18} color={rgb(theme.positiveFg)} weight="fill" />
            </View>
            <Caption>
              <Star size={13} color={rgb(theme.brand)} weight="fill" />{' '}
              {planner.ratingAvg.toFixed(1)} · {planner.ratingCount} reviews
            </Caption>
            <Caption>
              <MapPin size={13} color={rgb(theme.ink[400])} />{' '}
              {planner.city || 'Location on request'}
            </Caption>
          </View>

          {notice ? <Alert tone="positive">{notice}</Alert> : null}
          {error ? <Alert tone="critical">{error}</Alert> : null}

          <View style={{ flexDirection: 'row', gap: space(2) }}>
            {(
              [
                ['about', 'About'],
                ['services', 'Services'],
                ['reviews', 'Reviews'],
                ['gallery', 'Gallery'],
              ] as const
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setTab(key)}
                  style={{
                    paddingHorizontal: space(3),
                    paddingVertical: space(1.5),
                    borderRadius: radius.md,
                    backgroundColor: active ? rgb(theme.brand) : rgb(theme.surfaceSunken),
                  }}
                >
                  <Caption
                    style={{
                      color: active ? rgb(theme.brandFg) : rgb(theme.ink[700]),
                      fontWeight: '600',
                    }}
                  >
                    {label}
                  </Caption>
                </Pressable>
              );
            })}
          </View>

          {tab === 'about' ? (
            <Card>
              <SectionTitle>About</SectionTitle>
              <Caption>
                {planner.bio ||
                  `${planner.agencyName} is a wedding planner${
                    planner.yearsExperience ? ` with ${planner.yearsExperience} years of experience` : ''
                  }.`}
              </Caption>
              {planner.contactPerson ? (
                <Caption tone="muted">Contact: {planner.contactPerson}</Caption>
              ) : null}
            </Card>
          ) : null}

          {tab === 'services' ? (
            <Card style={{ gap: space(2) }}>
              <SectionTitle>Services</SectionTitle>
              {(planner.packages ?? []).length === 0 ? (
                <Caption tone="muted">Packages are quoted on request.</Caption>
              ) : (
                planner.packages?.map((pkg) => (
                  <View
                    key={pkg.name}
                    style={{
                      gap: space(1),
                      paddingVertical: space(2),
                      borderBottomWidth: 1,
                      borderBottomColor: rgb(theme.border),
                    }}
                  >
                    <Body style={{ fontWeight: '600' }}>{pkg.name}</Body>
                    <Caption tone="brand">₹{Number(pkg.price).toLocaleString('en-IN')}</Caption>
                    {pkg.includes?.length ? (
                      <Caption tone="faint">{pkg.includes.join(' · ')}</Caption>
                    ) : null}
                  </View>
                ))
              )}
            </Card>
          ) : null}

          {tab === 'reviews' ? (
            reviews.isPending ? (
              <Loading rows={2} />
            ) : reviewRows.length === 0 ? (
              <EmptyState title="No reviews yet">Be the first couple to leave feedback.</EmptyState>
            ) : (
              reviewRows.map((review) => (
                <Card key={review.id} style={{ gap: space(1) }}>
                  <Caption>
                    <Star size={12} color={rgb(theme.brand)} weight="fill" /> {review.rating}/5
                  </Caption>
                  <Caption>{review.comment || 'No written comment.'}</Caption>
                </Card>
              ))
            )
          ) : null}

          {tab === 'gallery' ? (
            photos.length === 0 ? (
              <EmptyState title="No photos yet">This planner has not added a gallery.</EmptyState>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
                {photos.map((photo) => (
                  <Image
                    key={photo}
                    source={{ uri: photo }}
                    style={{ width: (width - space(10)) / 3, height: 92, borderRadius: radius.md }}
                  />
                ))}
              </View>
            )
          ) : null}

          {requesting ? (
            <Card style={{ gap: space(3) }}>
              <SectionTitle>Request Planner</SectionTitle>
              <DateField
                label="Wedding / event date"
                value={eventDate}
                onChange={setEventDate}
                from={new Date().toISOString().slice(0, 10)}
              />
              <Field
                label="Budget (optional)"
                value={budget}
                onChangeText={setBudget}
                keyboardType="number-pad"
                placeholder="Leave blank to ask for a quote"
              />
              <Field
                label="Notes"
                value={requirements}
                onChangeText={setRequirements}
                placeholder="Tell them briefly what you need"
              />
              <Button
                label="Send request"
                busy={request.isPending}
                onPress={() => request.mutate()}
              />
              <Button label="Cancel" variant="outline" onPress={() => setRequesting(false)} />
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {!requesting ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: space(3),
            flexDirection: 'row',
            gap: space(2),
            backgroundColor: rgb(theme.surface),
          }}
        >
          <Button
            label="Request Planner"
            onPress={() => {
              setRequesting(true);
              setNotice('');
              setError('');
            }}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </View>
  );
}
