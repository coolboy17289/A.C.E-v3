import type { AppManifest } from './types.js';

/**
 * Slim, currently-shipped registry. Anything not listed here still has
 * working TypeScript types (`AppId` is unchanged) but the desktop shell
 * will not surface it. To re-enable an app, drop its `AppManifest` back in
 * here and follow the steps in `later/README.md`.
 *
 * Order notes:
 *   - `settings` (1) + `ai` (2) ship first; both were the original two.
 *   - `focus` (3) is the Pomodoro app, restored in v1.2.5.
 *   - The Dashboard nav item is pinned at the top of the sidebar by
 *     `Sidebar.tsx`, so it doesn't need a registry entry. Tasks /
 *     Subjects / Planner / Statistics remain in `later/apps/` and are
 *     intentionally NOT in the registry yet — re-enable them by moving
 *     the directory back and adding a manifest here.
 */
export const APP_REGISTRY: readonly AppManifest[] = [
  {
    id: 'home',
    name: 'Home',
    description: 'Today overview with quick actions and an app launcher',
    icon: '🏠',
    accent: '#3da8ff',
    order: 0,
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'Touch-driven to-do list with categories and priorities',
    icon: '✅',
    accent: '#8a5cff',
    order: 1,
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Profile, theme, wallpaper, network, device & system',
    icon: '⚙️',
    accent: '#94a3b8',
    order: 2,
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Pomodoro timer with break tracking and session history',
    icon: '⏱️',
    accent: '#34d399',
    order: 3,
  },
] as const;

// AI Tutor intentionally dropped from the v2 --beta shipped shell.
// The backend route at /api/ai/* stays alive for the legacy web-shell
// and dev usage, but the touch-first launcher doesn't include the AI
// tile — Ollama + Vision adds boot time + battery cost without a
// guaranteed classroom Wi-Fi connection. The shell's "Coming soon"
// stub swallows any AppId outside APP_REGISTRY should the registry
// letter accidentally re-include 'ai'.

export function getApp(id: string): AppManifest | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
