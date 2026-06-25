import type { ConsoleMessage, Page } from "@playwright/test";

type PageErrorCollector = {
  errors: string[];
  detach: () => void;
};

export function attachPageErrorCollector(page: Page): PageErrorCollector {
  const errors: string[] = [];
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  };
  const onPageError = (error: Error) => {
    errors.push(error.message);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  return {
    errors,
    detach: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}
