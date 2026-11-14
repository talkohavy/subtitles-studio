import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vite-plus/test';
import { ChoiceGrid, type Choice } from './ChoiceGrid';

const CHOICES: ReadonlyArray<Choice<string>> = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
];

function PositionPicker() {
  const [value, setValue] = useState('top');

  return (
    <>
      <ChoiceGrid label='Position' value={value} choices={CHOICES} onChange={setValue} columns={3} />
      <button type='button'>After</button>
    </>
  );
}

describe('ChoiceGrid', () => {
  it('should be a single Tab stop, named by its label', async () => {
    const user = userEvent.setup();
    render(<PositionPicker />);

    await user.tab();
    const firstFocused = document.activeElement?.textContent;
    await user.tab();
    const actualResult = {
      groupName: screen.getByRole('radiogroup').getAttribute('aria-label'),
      firstFocused,
      secondFocused: document.activeElement?.textContent,
    };

    const expectedResult = { groupName: 'Position', firstFocused: 'Top', secondFocused: 'After' };
    expect(actualResult).toEqual(expectedResult);
  });

  it('should select the next choice with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<PositionPicker />);

    await user.tab();
    // Held down: Radix selects the option focused while an arrow key is down, and moves focus a moment after keydown.
    await user.keyboard('{ArrowRight>}');
    const actualResult = screen
      .getAllByRole('radio')
      .map((radio) => [radio.textContent, radio.getAttribute('aria-checked')]);

    const expectedResult = [
      ['Top', 'false'],
      ['Middle', 'true'],
      ['Bottom', 'false'],
    ];
    expect(actualResult).toEqual(expectedResult);
  });
});
