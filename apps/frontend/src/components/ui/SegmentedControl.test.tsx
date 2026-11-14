import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'box', label: 'Box' },
];

describe('SegmentedControl', () => {
  it('should be named by its visible label, or by `ariaLabel` without one', () => {
    render(
      <>
        <SegmentedControl label='Case' value='none' options={OPTIONS} onChange={() => {}} />
        <SegmentedControl ariaLabel='Background box' value='none' options={OPTIONS} onChange={() => {}} />
      </>,
    );

    const actualResult = screen.getAllByRole('radiogroup').map((group) => group.getAttribute('aria-label'));

    expect(actualResult).toEqual(['Case', 'Background box']);
  });
});
