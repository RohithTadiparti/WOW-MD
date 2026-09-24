import { ValidationPipe } from '@nestjs/common';
import { EducationDetailsDto } from './dto/profile-details.dto';
import { saveEmployment } from './other-income';

const primary = { company: 'Acme', designation: 'Engineer', workLocation: 'Hyderabad', salary: '1200000' };
const base = { highestQualification: 'Masters', course: 'Engineering', occupationStatus: 'employed' };
const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const validate = (employment: unknown) => pipe.transform({ ...base, employment }, { type: 'body', metatype: EducationDetailsDto });

describe('Other Income', () => {
  it('keeps the legacy employment contract, including additional legacy keys', async () => {
    const employment = { ...primary, office: 'Main', customLegacyField: 'kept' };
    expect((await validate(employment)).employment).toEqual(employment);
    expect(saveEmployment({}, employment)).toEqual(employment);
  });

  it('validates every source and normalizes zero and numeric amounts on save', async () => {
    const otherIncome = ['rental', 'business', 'agricultural', 'investment', 'other'].map((source) => ({ source, amount: 0 }));
    await expect(validate({ ...primary, otherIncome })).resolves.toBeDefined();
    const result = saveEmployment({}, { ...primary, otherIncome });
    expect(result).toMatchObject(primary);
    const entries = result.otherIncome as { id: string; amount: string }[];
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(5);
    expect(entries.every((entry) => entry.amount === '0')).toBe(true);
  });

  it.each([null, {}, [null], [[]], [{ source: 'unknown', amount: '1' }],
    [{ source: 'rental' }], [{ source: 'rental', amount: null }],
    [{ source: 'rental', amount: true }], [{ source: 'rental', amount: '-1' }],
    [{ source: 'rental', amount: '1.5' }], [{ source: 'rental', amount: '' }],
    [{ source: 'rental', amount: '1'.repeat(16) }],
    [{ source: 'rental', amount: '1', extra: 'forbidden' }],
    [{ source: 'rental', amount: '1', id: 'invalid' }],
  ].map((value) => [value]))('rejects invalid entries: %j', async (otherIncome) => {
    await expect(validate({ ...primary, otherIncome })).rejects.toThrow();
  });

  it('rejects duplicate IDs and validates payloads when switching occupation too', async () => {
    const entry = { id: '11111111-1111-4111-8111-111111111111', source: 'rental', amount: '1' };
    await expect(validate({ ...primary, otherIncome: [entry, entry] })).rejects.toThrow();
    await expect(pipe.transform({ ...base, occupationStatus: 'student', employment: { otherIncome: null } },
      { type: 'body', metatype: EducationDetailsDto })).rejects.toThrow();
  });

  it('preserves omitted sources, supports independent editing/removal, and clears with []', () => {
    const saved = saveEmployment({}, { ...primary, otherIncome: [{ source: 'rental', amount: '200' }, { source: 'other', amount: '300' }] });
    const entries = saved.otherIncome as Record<string, unknown>[];
    expect(saveEmployment(saved, primary).otherIncome).toEqual(entries);
    expect(saveEmployment(saved)).toEqual(saved);
    const edited = saveEmployment(saved, { ...primary, otherIncome: [{ ...entries[0], amount: '400' }, entries[1]] });
    expect(edited.otherIncome).toEqual([{ ...entries[0], amount: '400' }, entries[1]]);
    expect(saveEmployment(edited, { ...primary, otherIncome: [entries[1]] }).otherIncome).toEqual([entries[1]]);
    expect(saveEmployment(saved, { ...primary, otherIncome: [] })).toEqual({ ...primary, otherIncome: [] });
    expect(saveEmployment(saved, { otherIncome: [] })).toEqual({ ...primary, otherIncome: [] });
    expect(saveEmployment(saved, {})).toEqual({ otherIncome: entries });
    expect(saveEmployment(saved, { ...primary, salary: null })).toEqual({ ...saved, salary: null });
  });
});
