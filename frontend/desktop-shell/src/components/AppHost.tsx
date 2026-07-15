import React from 'react';
import type { AppId } from '@ace/shared';

import HomeApp from '@ace/app-home';
import PlannerApp from '@ace/app-planner';
import TasksApp from '@ace/app-tasks';
import FocusApp from '@ace/app-focus';
import SubjectsApp from '@ace/app-subjects';
import AiApp from '@ace/app-ai';
import StatisticsApp from '@ace/app-statistics';
import SettingsApp from '@ace/app-settings';

/**
 * Renders the React module for the given appId inside the window frame.
 *
 * The apps are plain React components - the shell doesn't impose a router -
 * because every app is self-contained and has its own internal navigation.
 * This keeps the per-app bundle small and the touch latency low on the Pi.
 */
const REGISTRY: Record<AppId, React.ComponentType> = {
  home: HomeApp,
  planner: PlannerApp,
  tasks: TasksApp,
  focus: FocusApp,
  subjects: SubjectsApp,
  ai: AiApp,
  statistics: StatisticsApp,
  settings: SettingsApp,
};

export const AppHost: React.FC<{ appId: AppId }> = ({ appId }) => {
  const Component = REGISTRY[appId];
  if (!Component) {
    return (
      <div className="h-full w-full flex items-center justify-center text-ace-muted">
        Unknown app: {appId}
      </div>
    );
  }
  return (
    <div className="h-full w-full overflow-auto">
      <Component />
    </div>
  );
};
