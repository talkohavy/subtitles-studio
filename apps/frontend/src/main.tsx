import '@src/lib/fonts/registerFonts';
import './index.css';
import '@src/common/styles/toast.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { Tooltip } from 'radix-ui';
import { Toaster } from 'sonner';
import { App } from './App';
import { store } from './store';

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('The page has no #root element to render into.');

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
        <App />
        <Toaster theme='dark' position='bottom-center' closeButton />
      </Tooltip.Provider>
    </Provider>
  </StrictMode>,
);
