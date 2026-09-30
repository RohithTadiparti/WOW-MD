export const MIN_HEIGHT_CM = 91;
export const MAX_HEIGHT_CM = 244;

export function feetInchesToCm(feet: unknown, inches: unknown): number | null {
  const feetValue = typeof feet === 'string' && /^\d+$/.test(feet) ? Number(feet) : feet;
  const inchesValue = typeof inches === 'string' && /^\d+$/.test(inches) ? Number(inches) : inches;
  if (!Number.isInteger(feetValue) || !Number.isInteger(inchesValue)) return null;
  if ((feetValue as number) < 3 || (feetValue as number) > 8) return null;
  if ((inchesValue as number) < 0 || (inchesValue as number) > 11) return null;
  const cm = Math.round(((feetValue as number) * 12 + (inchesValue as number)) * 2.54);
  return cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM ? cm : null;
}

export function decimalFeetToCm(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const feet = Number(text);
  if (!Number.isFinite(feet) || feet < 3 || feet > 8) return null;
  const cm = Math.round(feet * 30.48);
  return cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM ? cm : null;
}

export function cmToFeetInches(value: unknown): { feet: number; inches: number } | null {
  const cm = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(cm) || (cm as number) < MIN_HEIGHT_CM || (cm as number) > MAX_HEIGHT_CM) return null;
  const totalInches = Math.round((cm as number) / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function formatHeight(value: unknown): string {
  const height = cmToFeetInches(value);
  return height ? `${height.feet} ft ${height.inches} in` : '';
}

export function migrateHeightDraft(draft: Record<string, unknown>): Record<string, unknown> {
  const next = { ...draft };
  for (const [oldKey, key] of [
    ['heightFeet', 'heightCm'],
    ['preferredHeightMinFeet', 'preferredHeightMinCm'],
    ['preferredHeightMaxFeet', 'preferredHeightMaxCm'],
  ]) {
    if (!(oldKey in next)) continue;
    const old = next[oldKey];
    if (!(key in next)) {
      if (old === '' || old === null || old === undefined) next[key] = '';
      else next[key] = decimalFeetToCm(old) ?? '';
    }
    delete next[oldKey];
  }
  return next;
}