const configuredSupportEmail = process.env.NEXT_PUBLIC_LOREGUARD_SUPPORT_EMAIL?.trim();

export const SUPPORT_EMAIL = configuredSupportEmail || "support@loreguard.app";

export const SUPPORT_EMAIL_DISPLAY = SUPPORT_EMAIL
  .replace("@", " [at] ")
  .replace(/\./g, " [dot] ");

export function supportMailtoHref(subject?: string): string {
  const base = `mailto:${SUPPORT_EMAIL}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}
