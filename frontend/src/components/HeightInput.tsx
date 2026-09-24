import { parseHeight } from '../lib/height';

export default function HeightInput({ value, onChange, required = false }: {
  value: unknown;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const text = value === null || value === undefined ? '' : String(value);
  const invalid = text !== '' && parseHeight(text) === null;
  return <>
    <input className="input mt-1" aria-label="Height in feet" type="text" inputMode="decimal"
      value={text} required={required} placeholder="5.6" pattern="[3-7]([.][0-9])?|8([.]0)?"
      aria-invalid={invalid} title="Enter 3 to 8 feet with at most one decimal place."
      onChange={(event) => onChange(event.target.value)} />
    {invalid && <span className="block text-xs text-red-600">Enter 3 to 8 feet with at most one decimal place.</span>}
  </>;
}
