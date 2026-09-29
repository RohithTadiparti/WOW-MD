import { useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Image,
  Pressable,
  ScrollView,
  Share,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, MapPin, SealCheck, ShareNetwork, Star } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { rupees } from '@/lib/format';
import { loadVendorShortlist, toggleVendorShortlist } from '@/lib/plan-shortlist';
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

type Tab = 'overview' | 'photos' | 'reviews' | 'packages';

type Vendor = {
  id: string;
  name: string;
  category: string | null;
  categories: string[];
  city: string;
  description: string;
  ratingAvg: number;
  ratingCount: number;
  portfolio: string[];
  startingPrice: number | null;
  verifiedAt: string | null;
};

type Service = {
  id: string;
  name: string;
  description?: string | null;
  offerings?: { id: string; name: string; price: string | null }[];
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
};

export default function VendorDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [requesting, setRequesting] = useState(false);
  const [eventDate, setEventDate] = useState('');
  const [budget, setBudget] = useState('');
  const [requirements, setRequirements] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void loadVendorShortlist().then(setShortlist);
  }, []);

  const query = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => (await api.get(`/vendors/${id}`)).data as Vendor,
    enabled: Boolean(id),
    retry: false,
  });

  const services = useQuery({
    queryKey: ['vendor-services', id],
    queryFn: async () => (await api.get(`/vendors/${id}/services`)).data as Service[],
    enabled: Boolean(id) && (tab === 'packages' || requesting),
    retry: false,
  });

  const reviews = useQuery({
    queryKey: ['vendor-reviews', id],
    queryFn: async () =>
      (await api.get(`/vendors/${id}/reviews`)).data as { data?: Review[] } | Review[],
    enabled: Boolean(id) && tab === 'reviews',
    retry: false,
  });

  const request = useMutation({
    mutationFn: async () => {
      await api.post('/bookings', {
        providerType: 'vendor',
        providerId: id,
        ...(eventDate ? { eventDate } : {}),
        ...(budget ? { expectedBudget: Number(budget) } : {}),
        ...(requirements.trim() ? { requirements: requirements.trim() } : {}),
      });
    },
    onSuccess: () => {
      setRequesting(false);
      setNotice('Booking request sent.');
      setError('');
    },
    onError: (err) => setError(apiMessage(err, 'That request could not be sent.')),
  });

  if (query.isPending) {
    return (
      <View style={{ flex: 1, padding: space(4) }}>
        <Loading rows={4} />
      </View>
    );
  }

  if (query.error || !query.data) {
    return (
      <View style={{ flex: 1, padding: space(4) }}>
        <EmptyState title="Vendor unavailable">
          {apiMessage(query.error, 'This listing may no longer be available.')}
        </EmptyState>
      </View>
    );
  }

  const vendor = query.data;
  const photos = vendor.portfolio ?? [];
  const saved = shortlist.has(vendor.id);
  const reviewRows: Review[] = Array.isArray(reviews.data)
    ? reviews.data
    : (reviews.data?.data ?? []);
  const serviceRows = Array.isArray(services.data) ? services.data : [];

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
          <View
            style={{
              position: 'absolute',
              top: space(5),
              right: space(3),
              flexDirection: 'row',
              gap: space(2),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Shortlist vendor"
              onPress={() => void toggleVendorShortlist(vendor.id).then(setShortlist)}
              style={{ padding: space(2), borderRadius: radius.md, backgroundColor: rgb(theme.surface) }}
            >
              <Heart
                size={20}
                weight={saved ? 'fill' : 'regular'}
                color={rgb(theme.brand)}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share vendor"
              onPress={() => void Share.share({ message: vendor.name })}
              style={{ padding: space(2), borderRadius: radius.md, backgroundColor: rgb(theme.surface) }}
            >
              <ShareNetwork size={20} color={rgb(theme.brand)} />
            </Pressable>
          </View>
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
              <SectionTitle>{vendor.name}</SectionTitle>
              {vendor.verifiedAt ? (
                <SealCheck size={18} color={rgb(theme.positiveFg)} weight="fill" />
              ) : null}
            </View>
            <Caption>
              <Star size={13} color={rgb(theme.brand)} weight="fill" />{' '}
              {vendor.ratingAvg.toFixed(1)} · {vendor.ratingCount} reviews
            </Caption>
            <Caption>
              <MapPin size={13} color={rgb(theme.ink[400])} />{' '}
              {vendor.city || 'Location on request'}
            </Caption>
          </View>

          {notice ? <Alert tone="positive">{notice}</Alert> : null}
          {error ? <Alert tone="critical">{error}</Alert> : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {(
              [
                ['overview', 'Overview'],
                ['photos', 'Photos'],
                ['reviews', 'Reviews'],
                ['packages', 'Packages'],
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

          {tab === 'overview' ? (
            <>
              {vendor.description ? (
                <Card>
                  <SectionTitle>About</SectionTitle>
                  <Caption>{vendor.description}</Caption>
                </Card>
              ) : null}
              {vendor.startingPrice !== null ? (
                <Card>
                  <Caption>Starting Price</Caption>
                  <SectionTitle>{rupees(vendor.startingPrice)}</SectionTitle>
                  <Pressable onPress={() => setTab('packages')}>
                    <Caption tone="brand" style={{ fontWeight: '600', marginTop: space(1) }}>
                      View Packages
                    </Caption>
                  </Pressable>
                </Card>
              ) : null}
            </>
          ) : null}

          {tab === 'photos' ? (
            photos.length <= 1 ? (
              <EmptyState title="No more photos">This vendor has not added a full gallery yet.</EmptyState>
            ) : (
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/vendors/[id]/gallery', params: { id: vendor.id } })
                }
              >
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
                  {photos.map((photo) => (
                    <Image
                      key={photo}
                      source={{ uri: photo }}
                      style={{ width: (width - space(10)) / 3, height: 92, borderRadius: radius.md }}
                    />
                  ))}
                </View>
              </Pressable>
            )
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

          {tab === 'packages' ? (
            services.isPending ? (
              <Loading rows={2} />
            ) : serviceRows.length === 0 ? (
              <EmptyState title="No packages listed">Ask the vendor when you request a booking.</EmptyState>
            ) : (
              serviceRows.map((service) => (
                <Card key={service.id} style={{ gap: space(2) }}>
                  <Body style={{ fontWeight: '700' }}>{service.name}</Body>
                  {service.description ? <Caption>{service.description}</Caption> : null}
                  {(service.offerings ?? []).map((offering) => (
                    <View
                      key={offering.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: space(2),
                      }}
                    >
                      <Caption style={{ flex: 1 }}>{offering.name}</Caption>
                      <Caption tone="brand">
                        {offering.price ? rupees(offering.price) : 'On request'}
                      </Caption>
                    </View>
                  ))}
                </Card>
              ))
            )
          ) : null}

          {requesting ? (
            <Card style={{ gap: space(3) }}>
              <SectionTitle>Request Booking</SectionTitle>
              <DateField
                label="Event date"
                value={eventDate}
                onChange={setEventDate}
                from={new Date().toISOString().slice(0, 10)}
              />
              <Field
                label="Budget (optional)"
                value={budget}
                onChangeText={setBudget}
                keyboardType="number-pad"
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
            label="Chat"
            variant="outline"
            onPress={() =>
              NativeAlert.alert(
                'Chat with this vendor',
                'Vendor inquiries open from Chat once a conversation exists. Browse your conversations from the Chat tab.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Chat', onPress: () => router.push('/chat') },
                ],
              )
            }
            style={{ flex: 1 }}
          />
          <Button
            label="Request Booking"
            onPress={() => {
              setRequesting(true);
              setNotice('');
              setError('');
            }}
            style={{ flex: 1.5 }}
          />
        </View>
      ) : null}
    </View>
  );
}
