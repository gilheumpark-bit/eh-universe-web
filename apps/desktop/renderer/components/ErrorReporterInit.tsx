"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

const RING_KEY = "eh-error-ring";
const RING_MAX = 20;

function pushRing(entry: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(RING_KEY);
    const prev: Record<string, unknown>[] = raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
    prev.push({ t: Date.now(), ...entry });
    sessionStorage.setItem(RING_KEY, JSON.stringify(prev.slice(-RING_MAX)));
  } catch {
    /* storage full */
  }
  // Persist to main process crash log (survives app restart)
  try {
    const cs = (window as unknown as { cs?: { crash?: { report: (e: Record<string, unknown>) => Promise<unknown> } } }).cs;
    if (cs?.crash) {
      void cs.crash.report(entry).catch(() => {});
    }
  } catch {
    /* best effort */
  }
}

export default function ErrorReporterInit() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      logger.error("client-error", ev.message, ev.filename, ev.lineno, ev.colno, ev.error);
      pushRing({
        kind: "error",
        message: ev.message,
        file: ev.filename,
        line: ev.lineno,
      });
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason instanceof Error ? ev.reason.message : String(ev.reason);
      logger.error("unhandled-rejection", reason, ev.reason);
      pushRing({ kind: "rejection", message: reason });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
