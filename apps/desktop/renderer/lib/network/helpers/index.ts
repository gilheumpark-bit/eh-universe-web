// @ts-nocheck
/**
 * HTML stripping and string sanitization for network-facing content.
 */

/** Remove HTML tags; keep text nodes (incl. inside script). */
export function stripHtml(html: string): string {
  if (html == null || html === "") return "";
  let s = String(html);
  s = s.replace(/<[^>]*>/g, "");
  return s;
}

export function sanitizeTitle(input: string | null | undefined): string {
  if (input == null) return "";
  const t = stripHtml(String(input)).trim();
  return t.length > 200 ? t.slice(0, 200) : t;
}

export function sanitizeContent(
  input: string | null | undefined,
  maxLength = 50_000,
): string {
  if (input == null) return "";
  const t = stripHtml(String(input)).trim();
  return t.length > maxLength ? t.slice(0, maxLength) : t;
}

export function sanitizeComment(input: string | null | undefined): string {
  if (input == null) return "";
  const t = stripHtml(String(input)).trim();
  return t.length > 5000 ? t.slice(0, 5000) : t;
}
