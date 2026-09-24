export const OTHER_INCOME_LABELS = {
  rental: 'Rental Income',
  business: 'Business Income',
  agricultural: 'Agricultural Income',
  investment: 'Investment Income',
  other: 'Other Income',
} as const;

export interface OtherIncomeEntry {
  id: string;
  source: keyof typeof OTHER_INCOME_LABELS;
  amount: string;
}

export function readOtherIncome(employment: Record<string, unknown>): OtherIncomeEntry[] {
  return Array.isArray(employment.otherIncome) ? employment.otherIncome : [];
}
