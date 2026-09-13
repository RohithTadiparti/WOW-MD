import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { Category } from '@/components/business/service-types';
import { Body, Caption } from '@/components/ui';
import { radius, rgb, space, useTheme } from '@/theme';

/** A business lists under one to five catalogue categories (EZ1-I263). */
export const MAX_CATEGORIES = 5;

/** The catalogue's active categories, under the key the services step already uses. */
export function useCatalogCategories() {
  return useQuery<Category[]>({
    queryKey: ['catalog-categories'],
    queryFn: async () => (await api.get('/catalog/categories')).data,
    staleTime: 5 * 60_000,
  });
}

/**
 * Category names for slugs, in the order given.
 *
 * Until the catalogue has loaded, or for a slug it no longer lists, the slug is
 * shown as words rather than left blank.
 */
export function useCategoryNames() {
  const { data = [] } = useCatalogCategories();
  const bySlug = new Map(data.map((c) => [c.slug, c.name]));
  return (slugs: (string | null | undefined)[] | null | undefined): string[] =>
    (slugs ?? [])
      .filter((s): s is string => Boolean(s))
      .map((s) => bySlug.get(s) ?? s.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));
}

/**
 * Choosing the categories a business lists under.
 *
 * Every catalogue category as a chip, up to five selected. Once five are chosen
 * the rest are disabled rather than silently ignored, and the count says why.
 * The first one chosen is the one the listing is shown under first.
 */
export function CategoryPicker({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const theme = useTheme();
  const { data: categories = [], isPending, isError } = useCatalogCategories();
  const full = value.length >= MAX_CATEGORIES;

  return (
    <View style={{ gap: space(2) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Body>Categories</Body>
        <Caption tone={full ? 'brand' : 'faint'}>
          {value.length} of {MAX_CATEGORIES} selected
        </Caption>
      </View>
      <Caption tone="faint">
        Pick every kind of work this business does, up to {MAX_CATEGORIES}. The first one you pick is
        the one your listing is shown under first.
      </Caption>

      {isPending ? (
        <Caption>Loading categories…</Caption>
      ) : isError ? (
        <Caption tone="critical">The categories could not be loaded. Go back and try again.</Caption>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2) }}>
          {categories.map((c) => {
            const on = value.includes(c.slug);
            const disabled = !on && full;
            return (
              <Pressable
                key={c.slug}
                accessibilityRole="checkbox"
                accessibilityLabel={c.name}
                accessibilityState={{ checked: on, disabled }}
                disabled={disabled}
                onPress={() => onChange(on ? value.filter((s) => s !== c.slug) : [...value, c.slug])}
                style={({ pressed }) => ({
                  paddingHorizontal: space(3),
                  paddingVertical: space(1.5),
                  minHeight: 36,
                  justifyContent: 'center',
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: rgb(on ? theme.brand : theme.border),
                  backgroundColor: on
                    ? rgb(theme.brand)
                    : pressed
                      ? rgb(theme.surfaceSunken)
                      : 'transparent',
                  opacity: disabled ? 0.45 : 1,
                })}
              >
                <Caption tone={on ? 'onBrand' : 'default'}>{c.name}</Caption>
              </Pressable>
            );
          })}
        </View>
      )}

      {error ? <Caption tone="critical">{error}</Caption> : null}
    </View>
  );
}

/** A business's categories as names, joined, for inline use in any text. */
export function CategoryNames({
  slugs,
  fallback = '',
}: {
  slugs: (string | null | undefined)[] | null | undefined;
  fallback?: string;
}) {
  const names = useCategoryNames();
  return <>{names(slugs).join(', ') || fallback}</>;
}
