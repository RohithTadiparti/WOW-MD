import { OTHER_INCOME_LABELS, OtherIncomeEntry } from '../lib/other-income';

export default function OtherIncomeFields({ entries, onChange }: {
  entries: OtherIncomeEntry[];
  onChange: (entries: OtherIncomeEntry[]) => void;
}) {
  const update = (id: string, value: Partial<OtherIncomeEntry>) =>
    onChange(entries.map((entry) => entry.id === id ? { ...entry, ...value } : entry));

  return (
    <section className="space-y-3" aria-label="Other Income">
      <h3 className="font-semibold text-gray-800">Other Income <span className="text-sm font-normal text-gray-500">(optional)</span></h3>
      <p className="text-sm text-gray-500">Additional annual income in rupees. Hidden unless you choose to show income on the biodata.</p>
      {entries.map((entry, index) => (
        <fieldset key={entry.id} className="rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium">Income source {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-gray-700">
              Income source
              <select className="input mt-1" value={entry.source} onChange={(event) => update(entry.id, { source: event.target.value as OtherIncomeEntry['source'] })}>
                {Object.entries(OTHER_INCOME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              Amount (annual rupees)
              <input className="input mt-1" inputMode="numeric" required pattern="[0-9]+" maxLength={15}
                value={entry.amount} onChange={(event) => update(entry.id, { amount: event.target.value.replace(/\D/g, '') })} />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="text-sm text-red-600" onClick={() => onChange(entries.filter((item) => item.id !== entry.id))}>
              Remove<span className="sr-only"> income source {index + 1}</span>
            </button>
          </div>
        </fieldset>
      ))}
      <button type="button" className="btn-outline" onClick={() => onChange([...entries, { id: crypto.randomUUID(), source: 'rental', amount: '' }])}>
        Add Income Source
      </button>
    </section>
  );
}
