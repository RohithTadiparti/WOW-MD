// Matches the existing decimal-feet database contract: numeric(3,1), 3 to 8 feet.
export const MIN_HEIGHT_FEET = 3;
export const MAX_HEIGHT_FEET = 8;

export function parseHeight(value: string): number | null {
  if (!/^\d+(?:\.\d)?$/.test(value)) return null;
  const feet = Number(value);
  return feet >= MIN_HEIGHT_FEET && feet <= MAX_HEIGHT_FEET ? feet : null;
}

export function formatHeight(value: unknown): string {
  return value === null || value === undefined || value === '' ? '' : `${value} feet`;
}

/** Upgrade only explicitly cm-labelled drafts; never reinterpret a feet value. */
export function migrateHeightDraft(draft: Record<string, unknown>): Record<string, unknown> {
  const next = { ...draft };
  for (const [oldKey, key] of [
    ['heightCm', 'heightFeet'],
    ['preferredHeightMinCm', 'preferredHeightMinFeet'],
    ['preferredHeightMaxCm', 'preferredHeightMaxFeet'],
  ]) {
    if (oldKey in next) {
      const old = next[oldKey];
      if (!(key in next)) next[key] = old === '' || old === null || old === undefined
        ? '' : Number((Number(old) / 30.48).toFixed(1));
      delete next[oldKey];
    }
  }
  return next;
}
