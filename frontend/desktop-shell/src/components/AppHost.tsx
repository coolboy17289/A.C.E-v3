import React from 'react';
import type { AppId } from '@ace/shared';

import AiApp from '@ace/app-ai';
import SettingsApp from '@ace/app-settings';

/**
 * Renders the React module for the given appId inside the window frame.
 *
 * Only the apps we currently ship are wired here. Other AppIds still
 * exist in the union type but resolve to the "Unknown app" fallback so
 * the build stays small — anything in `later/apps/*` can be plugged
 * back in without expanding the type.
 */
const REGISTRY: Partial<Record<AppId, React.ComponentType>> = {
  ai: AiApp,
  settings: SettingsApp,
};

const ComingSoon: React.FC<{ appId: AppId }> = ({ appId }) => (
  <div className="h-full w-full flex flex-col items-center justify-center gap-3 px-8 text-center text-ace-muted">
    <div className="text-3xl">✨</div>
    <div className="text-lg font-semibold text-ace-ink">{appId} is on the way</div>
    <p className="text-sm">
      This app is parked in <code>later/apps/</code> for now.
      Move it back into the workspace and add it to{' '}
      <code>@ace/shared/apps-registry.ts</code> to ship it.
    </p>
  </div>
);

export const AppHost: React.FC<{ appId: AppId }> = ({ appId }) => {
  const Component = REGISTRY[appId];
  if (!Component) return <ComingSoon appId={appId} />;
  return (
    <div className="h-full w-full overflow-auto">
      <Component />
    </div>
  );
};
