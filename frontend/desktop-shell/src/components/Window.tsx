import React, { useCallback, useRef } from 'react';
import { APP_REGISTRY, AppTile, Icon, useAceStore, classNames } from '@ace/shared';
import type { OpenWindow } from '@ace/shared';
import { AppHost } from './AppHost';

interface Props {
  window: OpenWindow;
}

const TASKBAR_HEIGHT = 64;
const TOPBAR_HEIGHT = 48;

/**
 * Single draggable, resizable window frame. Drag works through pointer
 * events so it stays touch-friendly on the 7" touchscreen.
 *
 * Title bar icons are SVG glyphs from @ace/shared/icons so the chrome
 * matches the launcher tiles.
 */
export const Window: React.FC<Props> = ({ window: w }) => {
  const focus = useAceStore((s) => s.focusWindow);
  const close = useAceStore((s) => s.closeWindow);
  const minimize = useAceStore((s) => s.minimizeWindow);
  const maximize = useAceStore((s) => s.toggleMaximizeWindow);
  const move = useAceStore((s) => s.moveWindow);
  const resize = useAceStore((s) => s.resizeWindow);

  const meta = APP_REGISTRY.find((a) => a.id === w.appId);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; w: number; h: number; edge: ResizeEdge } | null>(null);

  const onPointerDownDrag = useCallback(
    (e: React.PointerEvent) => {
      if (w.maximized) return;
      focus(w.id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startY: e.clientY, origX: w.x, origY: w.y };
    },
    [focus, w.id, w.x, w.y, w.maximized],
  );
  const onPointerMoveDrag = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nx = Math.max(0, d.origX + (e.clientX - d.startX));
      const ny = Math.max(0, d.origY + (e.clientY - d.startY));
      move(w.id, nx, ny);
    },
    [move, w.id],
  );
  const onPointerUpDrag = useCallback((e: React.PointerEvent) => {
    if (dragRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  }, []);

  const beginResize = (edge: ResizeEdge) => (e: React.PointerEvent) => {
    e.stopPropagation();
    focus(w.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, w: w.width, h: w.height, edge };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    let nw = r.w;
    let nh = r.h;
    let nx = w.x;
    let ny = w.y;
    if (r.edge.includes('e')) nw = Math.max(360, r.w + dx);
    if (r.edge.includes('s')) nh = Math.max(260, r.h + dy);
    if (r.edge.includes('w')) {
      nw = Math.max(360, r.w - dx);
      nx = w.x + (r.w - nw);
    }
    if (r.edge.includes('n')) {
      nh = Math.max(260, r.h - dy);
      ny = w.y + (r.h - nh);
    }
    resize(w.id, nw, nh);
    if (r.edge.includes('w') || r.edge.includes('n')) move(w.id, nx, ny);
  };
  const endResize = (e: React.PointerEvent) => {
    if (resizeRef.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      resizeRef.current = null;
    }
  };

  return (
    <div
      data-testid={`window-${w.appId}`}
      onPointerDown={() => focus(w.id)}
      className={classNames(
        'absolute rounded-2xl overflow-hidden border backdrop-blur',
        w.minimized && 'opacity-0 pointer-events-none',
      )}
      style={{
        left: w.maximized ? 0 : w.x,
        top: w.maximized ? TOPBAR_HEIGHT : w.y,
        width: w.maximized ? '100%' : w.width,
        height: w.maximized ? `calc(100% - ${TOPBAR_HEIGHT + TASKBAR_HEIGHT}px)` : w.height,
        zIndex: w.zIndex,
        background: 'var(--ace-glass)',
        borderColor: 'var(--ace-border)',
        boxShadow: 'var(--ace-shadow)',
      }}
    >
      <div
        onPointerDown={onPointerDownDrag}
        onPointerMove={onPointerMoveDrag}
        onPointerUp={onPointerUpDrag}
        className="h-11 flex items-center gap-2 px-3 select-none cursor-grab active:cursor-grabbing border-b border-white/5"
        style={{
          touchAction: 'none',
          background: `linear-gradient(180deg, ${meta?.accent ?? 'var(--ace-accent)'}33, transparent)`,
        }}
      >
        <AppTile
          appId={(meta?.id ?? 'ai') as 'ai'}
          accent={meta?.accent ?? '#22d3ee'}
          size={22}
        />
        <span className="text-sm font-semibold truncate">{w.title}</span>
        <div className="flex-1" />
        <ControlButton ariaLabel="Minimise" onClick={(e) => { e.stopPropagation(); minimize(w.id); }}>
          <Icon name="minimize" size={14} />
        </ControlButton>
        <ControlButton ariaLabel={w.maximized ? 'Restore' : 'Maximise'} onClick={(e) => { e.stopPropagation(); maximize(w.id); }}>
          <Icon name={w.maximized ? 'chevron-right' : 'maximize'} size={14} />
        </ControlButton>
        <ControlButton ariaLabel="Close" danger onClick={(e) => { e.stopPropagation(); close(w.id); }}>
          <Icon name="close" size={14} />
        </ControlButton>
      </div>

      <div className="absolute inset-x-0 top-11 bottom-0 overflow-hidden">
        <AppHost appId={w.appId} />
      </div>

      {!w.maximized && (
        <>
          {(['n', 's'] as ResizeEdge[]).map((e) => (
            <div
              key={e}
              onPointerDown={beginResize(e)}
              onPointerMove={onResizeMove}
              onPointerUp={endResize}
              className={`absolute left-2 right-2 ${e === 'n' ? '-top-1' : '-bottom-1'} h-2 cursor-ns-resize`}
            />
          ))}
          {(['e', 'w'] as ResizeEdge[]).map((e) => (
            <div
              key={e}
              onPointerDown={beginResize(e)}
              onPointerMove={onResizeMove}
              onPointerUp={endResize}
              className={`absolute top-11 bottom-0 w-2 ${e === 'e' ? '-right-1' : '-left-1'} cursor-ew-resize`}
            />
          ))}
          {(['nw','ne','sw','se'] as ResizeEdge[]).map((e) => (
            <div
              key={e}
              onPointerDown={beginResize(e)}
              onPointerMove={onResizeMove}
              onPointerUp={endResize}
              style={{ touchAction: 'none' }}
              className={`absolute w-3 h-3 ${
                e === 'nw' ? '-top-1 -left-1 cursor-nwse-resize' :
                e === 'ne' ? '-top-1 -right-1 cursor-nesw-resize' :
                e === 'sw' ? '-bottom-1 -left-1 cursor-nesw-resize' :
                '-bottom-1 -right-1 cursor-nwse-resize'
              }`}
            />
          ))}
        </>
      )}
    </div>
  );
};

const ControlButton: React.FC<{
  ariaLabel: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ ariaLabel, onClick, danger, children }) => (
  <button
    aria-label={ariaLabel}
    className="w-8 h-8 rounded-md flex items-center justify-center transition"
    style={{ color: 'inherit' }}
    onClick={onClick}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.background = danger ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.10)';
    }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
  >
    {children}
  </button>
);

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
