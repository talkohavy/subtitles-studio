import { Provider } from 'react-redux';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { createAppStore } from '../../store';
import { sessionStarted } from '../../store/slices/session.slice';
import { ProcessingOverlay } from './ProcessingOverlay';

vi.mock('../new-video/useTranscriptionOptions', () => ({ useTranscriptionOptions: () => ({ options: null }) }));

describe('ProcessingOverlay', () => {
  it('should show a moving progress bar while the active step has no measurable progress', () => {
    const store = createAppStore();
    store.dispatch(sessionStarted({ fileName: 'clip.mp4', subtitlesFileName: null, translationLanguage: null }));

    render(
      <Provider store={store}>
        <ProcessingOverlay />
      </Provider>,
    );
    const progressBar = screen.getByRole('progressbar');
    const actualResult = progressBar.hasAttribute('aria-valuenow');

    expect(actualResult).toBe(false);
  });
});
