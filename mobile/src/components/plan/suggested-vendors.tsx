import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CheckCircle, Heart, MapPin, Star, Storefront } from 'phosphor-react-native';

import { api, apiMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { loadVendorShortlist, toggleVendorShortlist } from '@/lib/plan-shortlist';
import {
  lowestApplicablePrice,
  type ApplicablePrice,
  type SuggestedVendor,
  type VendorService,
} from '@/lib/budget-vendors';
import { useCatalogCategories } from '@/components/business/category-picker';
import { FilterChips } from '@/components/chrome';
import { CheckRow } from '@/components/form';
import { Alert, Body, Button, Caption, Card, Loading } from '@/components/ui';
import { radius, rgb, space, useTheme } from '@/theme';

export interface VendorFit {
  vendor: SuggestedVendor;
  price: ApplicablePrice | null;
  fits: boolean;
}

/**
 * Real vendors and the least each can cost, loaded once for the budget screen.
 *
 * Offerings are only fetched for vendors whose cheapest unit price is within
 * `maxBudget`: a vendor whose single unit already costs more cannot fit.
 */
export function useBudgetVendors(maxBudget: number) {
  const search = useQuery({
    queryKey: ['vendor-suggestions'],
    queryFn: async () =>
      (await api.get('/vendors/search', { params: { sort: 'price_asc', limit: 100 } })).data
        .data as SuggestedVendor[],
    retry: false,
  });
  const vendors = search.data ?? [];
  const candidates = vendors.filter((v) => v.startingPrice !== null && v.startingPrice <= maxBudget);
  const services = useQueries({
    queries: candidates.map((v) => ({
      queryKey: ['vendor-services', v.id],
      queryFn: async () => (await api.get(`/vendors/${v.id}/services`)).data as VendorService[],
      retry: false,
    })),
  });
  const offeringsOf = new Map(candidates.map((v, i) => [v.id, services[i]?.data]));

  const evaluate = (budget: number, guests: number | null): VendorFit[] =>
    vendors.map((vendor) => {
      const price = offeringsOf.has(vendor.id)
        ? lowestApplicablePrice(offeringsOf.get(vendor.id), guests)
        : null;
      return { vendor, price, fits: budget > 0 && price !== null && price.amount <= budget };
    });

  return {
    evaluate,
    loading: search.isPending || services.some((s) => s.isPending),
    error: search.error ?? services.find((s) => s.error)?.error ?? null,
  };
}

export function SuggestedVendors({
  fits,
  loading,
  error,
  blocked,
}: {
  fits: VendorFit[];
  loading: boolean;
  error: unknown;
  /** Why budget-based suggestions cannot be made, when they cannot. */
  blocked?: string | null;
}) {
  const theme = useTheme();
  const router = useRouter();
  const catalog = useCatalogCategories();
  const [showAbove, setShowAbove] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadVendorShortlist().then(setShortlist);
  }, []);

  const visible = fits.filter((f) => (blocked ? showAbove : f.fits || showAbove));
  const groups = (catalog.data ?? [])
    .map((c) => ({ ...c, rows: visible.filter((f) => f.vendor.categories?.includes(c.slug)) }))
    .filter((c) => c.rows.length > 0);
  const shown = groups.filter((g) => !selected || g.slug === selected);

  return (
    <View style={{ gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space(2) }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Body style={{ fontWeight: '700', color: rgb(theme.ink[900]), fontSize: 17 }}>Suggested Vendors</Body>
          <Caption tone="muted">Based on your overall wedding budget</Caption>
        </View>
      </View>

      {blocked ? (
        <Card>
          <Body style={{ fontWeight: '600' }}>{blocked}</Body>
          <Caption tone="muted">Update your overall budget to get budget-based suggestions.</Caption>
        </Card>
      ) : null}

      {error ? <Alert tone="critical">{apiMessage(error, 'Vendors could not be loaded.')}</Alert> : null}

      {loading || catalog.isPending ? (
        <Loading rows={3} />
      ) : (
        <>
          {groups.length > 0 ? (
            <FilterChips
              options={[
                { key: 'all', label: 'All' },
                ...groups.map((c) => ({ key: c.slug, label: c.name, count: c.rows.length })),
              ]}
              value={selected ?? 'all'}
              onChange={(key) => setSelected(key && key !== 'all' ? key : null)}
            />
          ) : !blocked ? (
            <Card>
              <Caption tone="muted">No vendor's pricing fits this budget yet.</Caption>
            </Card>
          ) : null}

          {shown.map((group) => (
            <View key={group.slug} style={{ gap: space(2) }}>
              <Body style={{ fontWeight: '700' }}>{group.name}</Body>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(3) }}>
                {group.rows.map(({ vendor, price, fits: inBudget }) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    price={price}
                    inBudget={inBudget}
                    shortlisted={shortlist.has(vendor.id)}
                    onShortlist={() => void toggleVendorShortlist(vendor.id).then(setShortlist)}
                  />
                ))}
              </ScrollView>
            </View>
          ))}

          <Button variant="outline" label="View All Vendors" onPress={() => router.push('/vendors')} />

          <CheckRow
            label="Show vendors above budget"
            hint="Listed separately and marked as above budget."
            checked={showAbove}
            onChange={setShowAbove}
          />
        </>
      )}
    </View>
  );
}

function VendorCard({
  vendor,
  price,
  inBudget,
  shortlisted,
  onShortlist,
}: {
  vendor: SuggestedVendor;
  price: ApplicablePrice | null;
  inBudget: boolean;
  shortlisted: boolean;
  onShortlist: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const open = () => router.push({ pathname: '/vendors/[id]', params: { id: vendor.id } });

  return (
    <Card style={{ width: 240, padding: 0, gap: 0, overflow: 'hidden' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${vendor.name}`} onPress={open}>
        {vendor.portfolio?.[0] ? (
          <Image source={{ uri: vendor.portfolio[0] }} style={{ width: '100%', height: 120 }} />
        ) : (
          <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: rgb(theme.brandSoft) }}>
            <Storefront size={32} color={rgb(theme.brand)} />
          </View>
        )}
      </Pressable>
      <View style={{ padding: space(3), gap: 2 }}>
        <Body style={{ fontWeight: '700' }} numberOfLines={1}>
          {vendor.name}
        </Body>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(1) }}>
          {vendor.ratingCount ? (
            <>
              <Star size={12} weight="fill" color={rgb(theme.cautionFg)} />
              <Caption>{`${vendor.ratingAvg.toFixed(1)} (${vendor.ratingCount})`}</Caption>
            </>
          ) : null}
          {vendor.city ? (
            <>
              <MapPin size={12} color={rgb(theme.ink[500])} style={{ marginLeft: vendor.ratingCount ? space(1) : 0 }} />
              <Caption tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {vendor.city}
              </Caption>
            </>
          ) : null}
        </View>
        <Body numberOfLines={1} style={{ marginTop: space(1), fontSize: 16, fontWeight: '700', color: rgb(theme.ink[900]) }}>
          {price ? price.label : vendor.startingPrice !== null ? `From ${money(vendor.startingPrice)}` : 'Quote on request'}
        </Body>
        <Caption tone="muted" numberOfLines={1}>
          {price?.detail ?? ' '}
        </Caption>
        {inBudget ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={14} weight="fill" color={rgb(theme.positiveFg)} />
            <Caption style={{ color: rgb(theme.positiveFg), fontWeight: '600' }}>Within overall budget</Caption>
          </View>
        ) : (
          <Caption tone="critical" style={{ fontWeight: '600' }}>
            {vendor.startingPrice === null ? 'Needs a quotation' : 'Above budget'}
          </Caption>
        )}
        <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
          <Button style={{ flex: 1, paddingHorizontal: space(2) }} small label="View Details" onPress={open} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: shortlisted }}
            onPress={onShortlist}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 36,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderWidth: 1,
              borderColor: rgb(theme.brand),
              borderRadius: radius.md,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Heart size={14} weight={shortlisted ? 'fill' : 'regular'} color={rgb(theme.brand)} />
            <Caption
              tone="brand"
              style={{ fontSize: 11, fontWeight: '500', letterSpacing: 1.4, textTransform: 'uppercase' }}
            >
              {shortlisted ? 'Shortlisted' : 'Shortlist'}
            </Caption>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
