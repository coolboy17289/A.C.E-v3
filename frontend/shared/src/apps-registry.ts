import type { AppManifest } from './types.js';

/**
 * Slim, currently-shipped registry. Anything not listed here still has
 * working TypeScript types (`AppId` is unchanged) but the desktop shell
 * will not surface it. To re-enable an app, drop its `AppManifest` back in
 * here and follow the steps in `later/README.md`.
 */
export const APP_REGISTRY: readonly AppManifest[] = [
  {
    id: 'settings',
    name: 'Settings',
    description: 'Profile, theme, wallpaper, network, device & system',
    icon: '⚙️',
    accent: '#94a3b8',
    order: 1,
  },
  {
    id: 'ai',
    name: 'AI Tutor',
    description: 'Conversational study helper (Ollama + graceful fallback)',
    icon: '🧠',
    accent: '#22d3ee',
    order: 2,
  },
] as const;

export function getApp(id: string): AppManifest | undefined {
  return APP_REGISTRY.find((a) => a.id === id);
}
