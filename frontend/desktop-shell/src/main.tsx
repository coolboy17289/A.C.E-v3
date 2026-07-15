import React from 'react';
import { createRoot } from 'react-dom/client';
import { TouchProvider, ThemeProvider } from '@ace/design-system';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');

// Trim the temp splash loader now that React is about to mount. The
// pre-mount HTML had a static `boot-splash` so the user sees brand glyphs
// in the few ms between Chromium's first paint and React's first commit.
container.innerHTML = '';

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ThemeProvider initialTheme="dark">
      <TouchProvider>
        <App />
      </TouchProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
