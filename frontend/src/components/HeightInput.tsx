import { cmToFeetInches, feetInchesToCm } from '../lib/height';

export default function HeightInput({ value, onChange, required = false }: {
  value: unknown;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const height = cmToFeetInches(value);
  const feet = height ? String(height.feet) : '';
  const inches = height ? String(height.inches) : '';
  const update = (nextFeet: string, nextInches: string) => {
    if (!nextFeet || !nextInches) {
      onChange('');
      return;
    }
    const cm = feetInchesToCm(nextFeet, nextInches);
    if (cm !== null) onChange(String(cm));
  };
  return <>
    <div className="mt-1 flex gap-2">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <input className="input min-w-0" aria-label="Height in feet" type="number" inputMode="numeric"
          value={feet} required={required} min={3} max={8} step={1} placeholder="5"
          onChange={(event) => update(event.target.value, inches || '0')} />
        <span className="text-sm text-ink-600">ft</span>
      </label>
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <input className="input min-w-0" aria-label="Height in inches" type="number" inputMode="numeric"
          value={inches} required={required} min={0} max={11} step={1} placeholder="6"
          onChange={(event) => update(feet || '0', event.target.value)} />
        <span className="text-sm text-ink-600">in</span>
      </label>
    </div>
  </>;
}
