export type OriginGuardResult =
  | { ok: true }
  | { ok: false; error: 'Forbidden: Origin header required' | 'Forbidden' };

type HeaderLookup = Pick<Headers, 'get'>;

function getRequestHost(headers: HeaderLookup): string | null {
  const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || headers.get('host')?.trim();
  return host || null;
}

function inferRequestProto(host: string): 'http' | 'https' {
  const hostname = host.startsWith('[')
    ? host.slice(1).split(']')[0]
    : host.split(':')[0];

  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    ? 'http'
    : 'https';
}

function getRequestProto(headers: HeaderLookup, host: string): 'http' | 'https' {
  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (forwardedProto === 'http' || forwardedProto === 'https') return forwardedProto;
  return inferRequestProto(host);
}

export function getExpectedRequestOrigin(headers: HeaderLookup): string | null {
  const host = getRequestHost(headers);
  if (!host) return null;
  return `${getRequestProto(headers, host)}://${host}`;
}

export function isAllowedOriginValue(headers: HeaderLookup, originValue: string | null): boolean {
  if (!originValue) return false;

  const expectedOrigin = getExpectedRequestOrigin(headers);
  if (!expectedOrigin) return true;

  try {
    return new URL(originValue).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function checkSameOriginHeaders(
  headers: Headers,
  options: { allowMissingOrigin?: boolean } = {},
): OriginGuardResult {
  const origin = headers.get('origin');

  if (!origin) {
    return options.allowMissingOrigin
      ? { ok: true }
      : { ok: false, error: 'Forbidden: Origin header required' };
  }

  return isAllowedOriginValue(headers, origin)
    ? { ok: true }
    : { ok: false, error: 'Forbidden' };
}
