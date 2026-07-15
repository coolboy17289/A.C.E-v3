import React from 'react';
import { createRoot } from 'react-dom/client';
import { configureClient } from '@ace/shared';
import { App } from './App';
import './styles.css';

// Side-effect-only import: scans `public/backgrounds/*.{png,...}` at
// build/dev time via `import.meta.glob` and pushes the resulting preset list
// into the aceStore. Must run before `<App />` so Settings renders with
// the merged preset list already populated.
import './backgrounds-bridge';

// Wire the shared HTTP client. The desktop shell always talks to its
// own origin (the ace-core service in production, the Vite dev server
// in development) and resource paths in `api` are already prefixed
// with `/api/...`, so the base URL is empty in the same-origin case.
// Override with `window.__ACE_API_URL__` or `VITE_API_URL` for setups
// where the API lives on a different origin.
configureClient((import.meta as any)?.env?.VITE_API_URL || '');

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
