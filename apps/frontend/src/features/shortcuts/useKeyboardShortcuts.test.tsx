import { type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { player } from '@src/lib/player/playerController';
import { createAppStore } from '../../store';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function pressSpaceOn(element: HTMLElement) {
  document.body.append(element);
  element.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  element.remove();
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should leave Space to native controls, but play from a focused timeline caption', () => {
    const togglePlay = vi.spyOn(player, 'togglePlay').mockResolvedValue();
    const store = createAppStore();
    renderHook(() => useKeyboardShortcuts(), {
      wrapper: (wrapperProps: { children: ReactNode }) => <Provider store={store}>{wrapperProps.children}</Provider>,
    });

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    pressSpaceOn(colorInput);
    const callsAfterColorInput = togglePlay.mock.calls.length;

    const timelineCaption = document.createElement('div');
    timelineCaption.setAttribute('role', 'button');
    pressSpaceOn(timelineCaption);
    const actualResult = { callsAfterColorInput, callsAfterTimelineCaption: togglePlay.mock.calls.length };

    const expectedResult = { callsAfterColorInput: 0, callsAfterTimelineCaption: 1 };
    expect(actualResult).toEqual(expectedResult);
  });
});
