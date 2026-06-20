export type OriginGuardResult =
  | { ok: true }
  | { ok: false; error: 'Forbidden: Origin header required' | 'Forbidden' };

export function checkSameOriginHeaders(
  headers: Headers,
  options: { allowMissingOrigin?: boolean } = {},
): OriginGuardResult {
  const origin = headers.get('origin');
  const host = headers.get('host');

  if (!origin) {
    return options.allowMissingOrigin
      ? { ok: true }
      : { ok: false, error: 'Forbidden: Origin header required' };
  }

  if (!host) return { ok: true };

  try {
    return new URL(origin).host === host
      ? { ok: true }
      : { ok: false, error: 'Forbidden' };
  } catch {
    return { ok: false, error: 'Forbidden' };
  }
}
