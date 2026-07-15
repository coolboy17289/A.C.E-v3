import React from 'react';
import { createRoot } from 'react-dom/client';
import { configureClient } from '@ace/shared';
import { App } from './App';
import './styles.css';

// In a deployed A.C.E image the desktop shell is served by the ace-core
// service on port 4317. In dev the backend runs on 4317 too, so this is the
// only sensible default. On the Pi the bundled files are static and Chromium
// simply hits /api/* on the same origin served by the backend.
configureClient('/api');

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
