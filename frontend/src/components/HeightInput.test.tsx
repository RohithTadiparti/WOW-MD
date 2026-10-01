import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import HeightInput from './HeightInput';

describe('HeightInput form validation', () => {
  it('renders required feet and inches inputs from canonical centimeters', () => {
    const html = renderToStaticMarkup(createElement(HeightInput, { value: 168, onChange: vi.fn(), required: true }));
    expect(html).toContain('aria-label="Height in feet"');
    expect(html).toContain('value="5"');
    expect(html).toContain('aria-label="Height in inches"');
    expect(html).toContain('value="6"');
    expect(html).toContain('max="11"');
  });
});
