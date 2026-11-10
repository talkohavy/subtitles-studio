import { describe, expect, it } from 'vite-plus/test';
import { cueFocusHandled, cueFocusRequested, uiReducer } from './ui.slice';
import type { UnknownAction } from '@reduxjs/toolkit';

function applyActions(actions: ReadonlyArray<UnknownAction>) {
  const initialState = uiReducer(undefined, { type: '@@init' });
  const finalState = actions.reduce((state, action) => uiReducer(state, action), initialState);

  return finalState;
}

describe('uiReducer', () => {
  it('should end a focus request once it is handled', () => {
    const state = applyActions([cueFocusRequested('a'), cueFocusHandled(1)]);
    const actualResult = state.focusRequest;

    expect(actualResult).toBeNull();
  });

  it('should keep a newer focus request when an older one is handled', () => {
    const state = applyActions([cueFocusRequested('a'), cueFocusRequested('b'), cueFocusHandled(1)]);
    const actualResult = state.focusRequest;

    const expectedResult = { cueId: 'b', nonce: 2 };
    expect(actualResult).toEqual(expectedResult);
  });
});
