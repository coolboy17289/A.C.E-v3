import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Vite config for the A.C.E OS desktop shell.
//
// Port alignment with backend: backend serves API on 4317. The shell
// must also serve on 4317 in production so the kiosk can point at
// http://localhost:4317/ and get both API + SPA from the same port.
// In dev mode, vite is on 4317 *too* — but the backend is *also* on
// 4317 (the kiosk runs only backend-or-shell in any given render),
// so dev runs the shell via vite and the backend by `npm run dev:backend`
// in a sibling terminal. (Vite proxies /api → 4317 in dev. The
// production binary serves both from the same Node process via
// `backend/src/server.ts`'s static-asset fallback.)
const alias = {
  '@ace/shared':        path.resolve('../shared/src/index.ts'),
  '@ace/shared/*':      path.resolve('../shared/src'),
  '@ace/design-system': path.resolve('../design-system/src/index.ts'),
  '@ace/design-system/*': path.resolve('../design-system/src'),
  '@ace/app-home':      path.resolve('../apps/home/src/index.tsx'),
  '@ace/app-tasks':     path.resolve('../apps/tasks/src/index.tsx'),
  '@ace/app-focus':     path.resolve('../apps/focus/src/index.tsx'),
  '@ace/app-settings':  path.resolve('../apps/settings/src/index.tsx'),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  server: {
    host: '0.0.0.0',
    port: 4317,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // The four apps are dynamically imported, so split them into
      // their own chunks. Keeps the initial launcher tile bundle small.
      output: {
        manualChunks: (id) => {
          if (id.includes('/apps/home/'))    return 'app-home';
          if (id.includes('/apps/tasks/'))   return 'app-tasks';
          if (id.includes('/apps/focus/'))   return 'app-focus';
          if (id.includes('/apps/settings/'))return 'app-settings';
          if (id.includes('/design-system/'))return 'ace-design-system';
          return undefined;
        },
      },
    },
  },
});
