import React from 'react';
import { useAceStore } from '@ace/shared';
import { Window } from './Window';

/**
 * Renders every open window. The desktop background itself swallows the
 * initial click so a user can quickly dismiss focus and then click a new
 * target window.
 */
export const WindowManager: React.FC = () => {
  const windows = useAceStore((s) => s.windows);
  return (
    <div
      className="absolute inset-0 z-10"
      // Clicking outside any window blurs currently focused windows.
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          // No-op: the store doesn't need explicit unfocus, the OS pattern
          // is to allow re-clicking on any window to re-focus it.
        }
      }}
    >
      {windows
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((w) => (
          <Window key={w.id} window={w} />
        ))}
    </div>
  );
};
