import type { Page } from "@playwright/test";

/** Uncaught exceptions only (console.error from libs is not collected). */
export function attachPageErrorCollector(page: Page): { errors: string[]; detach: () => void } {
  const errors: string[] = [];
  const handler = (err: Error) => {
    errors.push(err.message);
  };
  page.on("pageerror", handler);
  return {
    errors,
    detach: () => {
      page.off("pageerror", handler);
    },
  };
}
