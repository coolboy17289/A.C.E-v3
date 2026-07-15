import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ThemeMode } from './theme.js';

interface ThemeCtx {
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

/**
 * ThemeProvider — single source of truth for the current theme mode.
 *
 * Each app wraps itself with <ThemeProvider initialTheme=...> based on
 * the user's saved preference. The hook `useResolvedTheme()` returns
 * the current mode so consumers can call `palette(theme)` themselves.
 *
 * NOTE: this is intentionally separate from TouchProvider. TouchProvider
 * tracks the *focused input ID* (for the VirtualKeyboard portal). Theme
 * tracking is a per-app concern and is never cross-tree — the Settings
 * app is the only place that flips it, and the rest of the tree inherits
 * the change on re-render.
 */
export function ThemeProvider({
  initialTheme = 'dark',
  children,
}: {
  initialTheme?: ThemeMode;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Resolve the current theme. Falls back to `dark` if used outside a
 * provider (which is fine — palette('dark') is the safe default). */
export function useResolvedTheme(): ThemeMode {
  const ctx = useContext(ThemeContext);
  if (!ctx) return 'dark';
  return ctx.theme;
}

export function useThemeControl(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { theme: 'dark', setTheme: () => {} };
  return ctx;
}
