// App entry for @ace/app-subjects. The actual UI lives in App.tsx
// and is re-exported here so the desktop shell can pick it up
// via the package.json `main` / `exports` field.

export { SubjectsApp, type SubjectsAppProps, default } from './App.js';
