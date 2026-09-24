import { Children, ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import HeightInput from './HeightInput';

describe('HeightInput form validation', () => {
  it('uses a feet label and browser validation that agrees with valid and invalid decimals', () => {
    const input = Children.toArray(HeightInput({ value: '5.6', onChange: vi.fn(), required: true }).props.children)[0] as ReactElement;
    expect(input.props['aria-label']).toBe('Height in feet');
    expect(input.props.required).toBe(true);
    const pattern = new RegExp(`^(?:${input.props.pattern})$`);
    for (const value of ['5.6', '5.7', '6.1', '3', '8']) expect(pattern.test(value)).toBe(true);
    for (const value of ['', 'abc', '-5.6', '5..6', '5.', '2.9', '8.1', '5e0', '5.65']) expect(pattern.test(value)).toBe(false);
  });

  it('retains partial input for editing and lets optional filters be cleared', () => {
    const onChange = vi.fn();
    const input = Children.toArray(HeightInput({ value: '', onChange }).props.children)[0] as ReactElement;
    expect(input.props.required).toBe(false);
    input.props.onChange({ target: { value: '5.' } });
    expect(onChange).toHaveBeenLastCalledWith('5.');
    input.props.onChange({ target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
