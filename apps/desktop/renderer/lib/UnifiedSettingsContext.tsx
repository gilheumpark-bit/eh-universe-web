"use client";

import type { ReactNode } from "react";

/**
 * Reserved for future unified settings (shortcuts, density, etc.).
 * Theme is handled by `ThemeProvider` + `@/lib/theme-controller` (`cs:theme`).
 */
export function UnifiedSettingsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
