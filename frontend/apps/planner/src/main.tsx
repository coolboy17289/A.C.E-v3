// Default-export re-export so the desktop shell can `import PlannerApp
// from '@ace/app-planner'` exactly like the other apps. The actual
// implementation lives in `./App.tsx` (kept separate so it can grow).
export { PlannerApp as default } from './App.js';
export { PlannerApp } from './App.js';
export type { PlannerAppProps } from './App.js';
