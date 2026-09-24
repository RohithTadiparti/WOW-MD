import { Children, isValidElement, ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import OtherIncomeFields from './OtherIncomeFields';
import SavedBiodata from './SavedBiodata';
import { OTHER_INCOME_LABELS, OtherIncomeEntry, readOtherIncome } from '../lib/other-income';

function elements(node: ReactNode): ReactElement[] {
  return Children.toArray(node).flatMap((child) => isValidElement(child)
    ? [child, ...elements(child.props.children)] : []);
}

describe('Other Income shared by Individual and Agent Biodata', () => {
  const entries: OtherIncomeEntry[] = [
    { id: 'first', source: 'rental', amount: '0' },
    { id: 'second', source: 'business', amount: '200000' },
    { id: 'third', source: 'investment', amount: '300000' },
  ];

  it('provides all five sources and adds a separate empty amount', () => {
    const onChange = vi.fn();
    const nodes = elements(OtherIncomeFields({ entries, onChange }));
    expect(nodes.filter((node) => node.type === 'option').slice(0, 5).map((node) => node.props.children))
      .toEqual(Object.values(OTHER_INCOME_LABELS));
    nodes.find((node) => node.type === 'button' && node.props.children === 'Add Income Source')!.props.onClick();
    const added = onChange.mock.calls[0][0];
    expect(added.slice(0, 3)).toEqual(entries);
    expect(added[3]).toEqual({ id: expect.any(String), source: 'rental', amount: '' });
  });

  it('edits and removes the selected entry without changing its siblings', () => {
    const onChange = vi.fn();
    const nodes = elements(OtherIncomeFields({ entries, onChange }));
    nodes.filter((node) => node.type === 'input')[1].props.onChange({ target: { value: '123' } });
    expect(onChange).toHaveBeenLastCalledWith([entries[0], { ...entries[1], amount: '123' }, entries[2]]);
    nodes.filter((node) => node.type === 'select')[1].props.onChange({ target: { value: 'agricultural' } });
    expect(onChange).toHaveBeenLastCalledWith([entries[0], { ...entries[1], source: 'agricultural' }, entries[2]]);
    nodes.filter((node) => node.type === 'button' && Array.isArray(node.props.children))[1].props.onClick();
    expect(onChange).toHaveBeenLastCalledWith([entries[0], entries[2]]);
  });

  it('supports no entries, legacy employment, and reloaded persisted amounts', () => {
    expect(readOtherIncome({ salary: '1200000' })).toEqual([]);
    expect(readOtherIncome(JSON.parse(JSON.stringify({ otherIncome: entries })))).toEqual(entries);
    const onChange = vi.fn();
    const nodes = elements(OtherIncomeFields({ entries: [entries[0]], onChange }));
    nodes.find((node) => node.type === 'button' && Array.isArray(node.props.children))!.props.onClick();
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('renders saved sources separately from salary and respects visibility', () => {
    const details = { occupationStatus: 'employed', employment: { salary: '1200000', otherIncome: entries }, incomeVisible: true };
    const visible = renderToStaticMarkup(<SavedBiodata details={details} siblings={[]} assets={[]} />);
    expect(visible).toContain('Rental Income');
    expect(visible).toContain('1200000');
    expect(visible).toContain('200000');
    const hidden = renderToStaticMarkup(<SavedBiodata details={{ ...details, incomeVisible: false }} siblings={[]} assets={[]} />);
    expect(hidden).not.toContain('200000');
    expect(hidden).not.toContain('1200000');
    expect(hidden).toContain('Kept private');
  });
});
