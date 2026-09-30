/** The heights the API accepts, in whole centimetres: 3 ft 0 in to 8 ft 0 in. */
export const MIN_HEIGHT_CM = 91;
export const MAX_HEIGHT_CM = 244;

export function feetInchesToCm(feet: string, inches: string): number | null {
  if (!/^\d+$/.test(feet) || !/^\d+$/.test(inches)) return null;
  const feetValue = Number(feet);
  const inchesValue = Number(inches);
  if (feetValue < 3 || feetValue > 8 || inchesValue < 0 || inchesValue > 11) return null;
  const cm = Math.round((feetValue * 12 + inchesValue) * 2.54);
  return cm >= MIN_HEIGHT_CM && cm <= MAX_HEIGHT_CM ? cm : null;
}

export function cmToFeetInches(value: unknown): { feet: number; inches: number } | null {
  const cm = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof cm !== 'number' || !Number.isInteger(cm) || cm < MIN_HEIGHT_CM || cm > MAX_HEIGHT_CM) {
    return null;
  }
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function formatHeight(value: unknown): string {
  const height = cmToFeetInches(value);
  return height ? `${height.feet} ft ${height.inches} in` : '—';
}
