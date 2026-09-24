import { randomUUID } from 'crypto';
import { OtherIncomeEntryDto } from './dto/other-income.dto';

/** Omission keeps saved sources for older clients; [] explicitly removes all. */
export function saveEmployment(existing: Record<string, unknown>, incoming?: Record<string, unknown>): Record<string, unknown> {
  if (incoming === undefined) return existing;
  const otherIncome = incoming.otherIncome === undefined
    ? existing.otherIncome
    : (incoming.otherIncome as OtherIncomeEntryDto[]).map((entry) => ({
      id: entry.id ?? randomUUID(), source: entry.source, amount: String(entry.amount),
    }));
  // Income-only updates leave primary employment intact. Keep the legacy
  // replacement contract for employment submissions (including {} clearing salary).
  const incomeOnly = incoming.otherIncome !== undefined && Object.keys(incoming).length === 1;
  return { ...(incomeOnly ? existing : {}), ...incoming, ...(otherIncome === undefined ? {} : { otherIncome }) };
}
