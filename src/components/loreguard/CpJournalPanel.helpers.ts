import type { AppLanguage } from "@/lib/studio-types";
import type { CertificateLanguage } from "@/lib/creative-process/types";

/** AppLanguage('KO'|'EN'|'JP'|'CN') -> CertificateLanguage('ko'|'en'|'ja'|'zh') */
export function toCertLang(lang: AppLanguage): CertificateLanguage {
  switch (lang) {
    case "KO": return "ko";
    case "EN": return "en";
    case "JP": return "ja";
    case "CN": return "zh";
    default: return "ko";
  }
}

/** Blob download helper. Failures surface through the caller. */
export function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const EVENTS_REFRESH_THROTTLE_MS = 5000;

export type CpView = "inspector" | "provenance" | "submission";
export type IssueStatus = "idle" | "working" | "success" | "error";
export type RegisterStatus = "idle" | "success" | "already" | "error";
