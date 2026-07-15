// Mount point for the Notes app. The desktop shell imports
// `@ace/app-notes` and renders the default export inside an
// AppHost slot at 800x480 (or 1024x600 wide).
//
// This file is the analogue of `frontend/apps/tasks/src/index.tsx` —
// kept as a tiny shim so the app can be served standalone for
// development and embedded by the shell without modification.

import NotesApp from './App.js';

export { NotesApp };
export { NotesApp as default };
