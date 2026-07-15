import React from 'react';
import { useAceStore, classNames } from '@ace/shared';

/**
 * Stack of ephemeral toasts shown in the bottom-right corner. Used by app
 * actions ("Saved", "Restarting" etc.) and by shell-emitted system events.
 */
export const ToastStack: React.FC = () => {
  const toasts = useAceStore((s) => s.toasts);
  const dismiss = useAceStore((s) => s.dismissToast);

  return (
    <div className="absolute bottom-20 right-3 z-50 flex flex-col gap-2 w-72">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={classNames(
            'rounded-xl border px-3 py-2 shadow-window backdrop-blur animate-fade-up',
            t.variant === 'success' && 'bg-emerald-500/20 border-emerald-400/30',
            t.variant === 'warning' && 'bg-amber-500/20 border-amber-400/30',
            t.variant === 'error' && 'bg-red-500/25 border-red-400/30',
            t.variant === 'info' && 'bg-white/10 border-white/15',
          )}
          onClick={() => dismiss(t.id)}
        >
          <div className="text-sm font-semibold">{t.title}</div>
          <div className="text-xs text-ace-muted">{t.body}</div>
        </div>
      ))}
    </div>
  );
};
