const API_VERIFY_SEGMENT = '/api/cp/verify/';

function extractApiVerifyId(pathname: string): string | null {
  const start = pathname.indexOf(API_VERIFY_SEGMENT);
  if (start < 0) return null;
  const rest = pathname.slice(start + API_VERIFY_SEGMENT.length);
  const id = rest.split('/')[0]?.trim();
  return id || null;
}

function stripQueryAndHash(value: string): string {
  return value.split(/[?#]/)[0];
}

export function normalizePublicVerificationUrl(value?: string | null): string | null {
  const cleaned = value?.trim();
  if (!cleaned) return null;

  try {
    const url = new URL(cleaned);
    const id = extractApiVerifyId(url.pathname);
    if (!id) return cleaned;
    url.pathname = `/verify/${id}`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    const withoutQuery = stripQueryAndHash(cleaned);
    const id = extractApiVerifyId(withoutQuery);
    return id ? `/verify/${id}` : cleaned;
  }
}
