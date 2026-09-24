import { useEffect, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  MagnifyingGlass,
  SealCheck,
  SlidersHorizontal,
  Star,
} from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { useCatalogCategories } from '@/components/business/category-picker';
import { rupees } from '@/lib/format';
import { loadVendorShortlist, toggleVendorShortlist } from '@/lib/plan-shortlist';
import {
  Alert,
  Caption,
  Card,
  EmptyState,
  Loading,
  PageSubtitle,
  PageTitle,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { rgb, space, useTheme } from '@/theme';

type Vendor = {
  id: string;
  name: string;
  category: string | null;
  categories?: string[];
  city?: string;
  description?: string;
  ratingAvg: number;
  ratingCount: number;
  portfolio?: string[];
  startingPrice?: number | null;
  verifiedAt?: string | null;
};

const SORTS = [
  { value: 'recommended', label: 'Relevance' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'recent', label: 'Recently added' },
] as const;

export default function Vendors() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(params.category ?? '');
  const [filters, setFilters] = useState(false);
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('recommended');
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const catalog = useCatalogCategories();

  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);

  useEffect(() => {
    void loadVendorShortlist().then(setShortlist);
  }, []);

  const q = useQuery({
    queryKey: ['vendors', category, city, search, sort],
    queryFn: async () =>
      (
        await api.get('/vendors/search', {
          params: {
            category: category || undefined,
            city: city || undefined,
            search: search || undefined,
            sort,
            limit: 30,
          },
        })
      ).data,
    retry: false,
  });

  const vendors: Vendor[] = q.data?.data ?? [];

  return (
    <Screen>
      <View>
        <PageTitle>Vendors</PageTitle>
        <PageSubtitle>Find the best vendors for your special day</PageSubtitle>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: rgb(theme.surface),
          borderRadius: 22,
          paddingLeft: space(3),
          borderWidth: 1,
          borderColor: rgb(theme.border),
        }}
      >
        <MagnifyingGlass size={18} color={rgb(theme.brand)} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search vendors..."
          placeholderTextColor={rgb(theme.ink[400])}
          style={{ flex: 1, padding: space(3), color: rgb(theme.ink[900]) }}
        />
        <Pressable
          onPress={() => setFilters((open) => !open)}
          style={{
            marginRight: space(1),
            padding: space(2),
            borderRadius: 20,
            backgroundColor: rgb(theme.brand),
          }}
        >
          <SlidersHorizontal size={18} color={rgb(theme.brandFg)} />
        </Pressable>
      </View>

      {filters ? (
        <Card style={{ gap: space(2) }}>
          <Caption>Location</Caption>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Any city"
            placeholderTextColor={rgb(theme.ink[400])}
            style={{ paddingVertical: space(2), color: rgb(theme.ink[900]) }}
          />
          <Caption>Sort by</Caption>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
            {SORTS.map((option) => {
              const active = sort === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setSort(option.value)}
                  style={{
                    paddingHorizontal: space(3),
                    paddingVertical: space(1.5),
                    borderRadius: 999,
                    backgroundColor: active ? rgb(theme.brand) : rgb(theme.surfaceSunken),
                  }}
                >
                  <Caption
                    style={{
                      color: active ? rgb(theme.brandFg) : rgb(theme.ink[700]),
                      fontWeight: '600',
                    }}
                  >
                    {option.label}
                  </Caption>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : (
        <Pressable onPress={() => setFilters(true)}>
          <Caption tone="brand" style={{ fontWeight: '600' }}>
            Sort by {SORTS.find((s) => s.value === sort)?.label ?? 'Relevance'}
          </Caption>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
        <Pressable
          onPress={() => setCategory('')}
          style={{
            paddingHorizontal: space(3),
            paddingVertical: space(1.5),
            borderRadius: 999,
            backgroundColor: !category ? rgb(theme.brand) : rgb(theme.surfaceSunken),
          }}
        >
          <Caption
            style={{
              color: !category ? rgb(theme.brandFg) : rgb(theme.ink[700]),
              fontWeight: '600',
            }}
          >
            All
          </Caption>
        </Pressable>
        {catalog.isPending ? (
          <Loading rows={1} />
        ) : (
          catalog.data?.slice(0, 8).map((item) => {
            const active = category === item.slug;
            return (
              <Pressable
                key={item.slug}
                onPress={() => setCategory(active ? '' : item.slug)}
                style={{
                  paddingHorizontal: space(3),
                  paddingVertical: space(1.5),
                  borderRadius: 999,
                  backgroundColor: active ? rgb(theme.brand) : rgb(theme.surfaceSunken),
                }}
              >
                <Caption
                  style={{
                    color: active ? rgb(theme.brandFg) : rgb(theme.ink[700]),
                    fontWeight: '600',
                  }}
                >
                  {item.name}
                </Caption>
              </Pressable>
            );
          })
        )}
      </View>

      <SectionTitle>Vendors</SectionTitle>
      {q.isPending ? (
        <Loading rows={3} />
      ) : q.error ? (
        <Alert tone="critical">{apiMessage(q.error, 'Vendors could not be loaded.')}</Alert>
      ) : vendors.length ? (
        vendors.map((v) => {
          const saved = shortlist.has(v.id);
          const openVendor = () =>
            router.push({ pathname: '/vendors/[id]', params: { id: v.id } });
          return (
            <Card key={v.id} style={{ gap: space(2), padding: space(2), borderRadius: 14 }}>
              <Pressable onPress={openVendor}>
                {v.portfolio?.[0] ? (
                  <Image
                    source={{ uri: v.portfolio[0] }}
                    style={{ width: '100%', height: 150, borderRadius: 12 }}
                  />
                ) : (
                  <View
                    style={{
                      width: '100%',
                      height: 150,
                      borderRadius: 12,
                      backgroundColor: rgb(theme.surfaceSunken),
                    }}
                  />
                )}
              </Pressable>
              <View style={{ flexDirection: 'row', gap: space(2), paddingHorizontal: space(1) }}>
                <Pressable onPress={openVendor} style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Caption style={{ fontWeight: '700', color: rgb(theme.ink[800]) }}>
                      {v.name}
                    </Caption>
                    {v.verifiedAt ? (
                      <SealCheck size={14} color={rgb(theme.positiveFg)} weight="fill" />
                    ) : null}
                  </View>
                  <Caption>
                    <Star size={12} color={rgb(theme.brand)} weight="fill" />{' '}
                    {v.ratingAvg.toFixed(1)} ({v.ratingCount} reviews)
                  </Caption>
                  <Caption tone="faint">
                    {[v.city, v.category].filter(Boolean).join(' · ')}
                  </Caption>
                  {v.startingPrice ? (
                    <Caption tone="brand">From {rupees(v.startingPrice)}</Caption>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={saved ? 'Remove from shortlist' : 'Add to shortlist'}
                  hitSlop={8}
                  onPress={() => void toggleVendorShortlist(v.id).then(setShortlist)}
                >
                  <Heart
                    size={22}
                    weight={saved ? 'fill' : 'regular'}
                    color={rgb(theme.brand)}
                  />
                </Pressable>
              </View>
            </Card>
          );
        })
      ) : (
        <EmptyState title="No vendors found">
          Try another category, city, or search term.
        </EmptyState>
      )}
    </Screen>
  );
}
