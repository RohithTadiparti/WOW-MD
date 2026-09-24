import { describe, expect, it } from 'vitest';
import { parseHeight, formatHeight, migrateHeightDraft } from './height';

describe('decimal feet', () => {
  it.each(['5.6', '5.7', '6.1', '3', '8', '8.0'])('accepts %s feet', (value) => {
    expect(parseHeight(value)).toBe(Number(value));
    expect(formatHeight(Number(value))).toBe(`${Number(value)} feet`);
  });
  it.each(['', 'abc', '-5.6', '5..6', '5.', '.5', '5e0', '0', '50', '2.9', '8.1', '5.65', 'Infinity', ' 5.6 '])(
    'refuses invalid input %s', (value) => expect(parseHeight(value)).toBeNull(),
  );
  it('migrates old cm drafts once and preserves unrelated and existing feet values', () => {
    const old = { heightCm: 170, preferredHeightMinCm: 150, preferredHeightMaxCm: 190, firstName: 'Ada' };
    const migrated = migrateHeightDraft(old);
    expect(migrated).toEqual({ heightFeet: 5.6, preferredHeightMinFeet: 4.9, preferredHeightMaxFeet: 6.2, firstName: 'Ada' });
    expect(migrateHeightDraft(migrated)).toEqual(migrated);
    expect(migrateHeightDraft({ heightCm: 170, heightFeet: 6.1 })).toEqual({ heightFeet: 6.1 });
    expect(old.heightCm).toBe(170);
    expect(formatHeight(null)).toBe('');
  });
});
