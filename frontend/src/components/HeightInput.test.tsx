import { Children, ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import HeightInput from './HeightInput';

describe('HeightInput form validation', () => {
  it('renders required feet and inches number inputs from canonical centimeters', () => {
    const row = Children.toArray(HeightInput({ value: 168, onChange: vi.fn(), required: true }).props.children)[0] as ReactElement;
    const [feet, inches] = Children.toArray(row.props.children) as ReactElement[];
    const feetInput = Children.toArray(feet.props.children)[0] as ReactElement;
    const inchesInput = Children.toArray(inches.props.children)[0] as ReactElement;
    expect(feetInput.props['aria-label']).toBe('Height in feet');
    expect(feetInput.props.value).toBe('5');
    expect(feetInput.props.required).toBe(true);
    expect(inchesInput.props['aria-label']).toBe('Height in inches');
    expect(inchesInput.props.value).toBe('6');
    expect(inchesInput.props.max).toBe(11);
  });

  it('converts unit edits to canonical centimeters and clears both units', () => {
    const onChange = vi.fn();
    const row = Children.toArray(HeightInput({ value: 168, onChange }).props.children)[0] as ReactElement;
    const [feet, inches] = Children.toArray(row.props.children) as ReactElement[];
    const feetInput = Children.toArray(feet.props.children)[0] as ReactElement;
    const inchesInput = Children.toArray(inches.props.children)[0] as ReactElement;
    feetInput.props.onChange({ target: { value: '5' } });
    inchesInput.props.onChange({ target: { value: '7' } });
    expect(onChange).toHaveBeenLastCalledWith('170');
    feetInput.props.onChange({ target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
