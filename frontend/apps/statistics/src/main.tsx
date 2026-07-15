// Statistics app entry — re-export the default export so the
// desktop shell can `import StatisticsApp from '@ace/app-statistics'`
// and mount it inside an AppHost window.
export { default, default as StatisticsApp } from './App.js';
export type { StatisticsAppProps } from './App.js';
