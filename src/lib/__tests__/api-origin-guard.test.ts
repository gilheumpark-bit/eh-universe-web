import { checkSameOriginHeaders } from '@/lib/api-origin-guard';

function makeHeaders(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe('checkSameOriginHeaders', () => {
  it('blocks missing Origin by default', () => {
    expect(checkSameOriginHeaders(makeHeaders({ host: 'app.example' }))).toEqual({
      ok: false,
      error: 'Forbidden: Origin header required',
    });
  });

  it('allows missing Origin only when the caller explicitly permits it', () => {
    expect(checkSameOriginHeaders(
      makeHeaders({ host: 'app.example' }),
      { allowMissingOrigin: true },
    )).toEqual({ ok: true });
  });

  it('allows same host origins including port', () => {
    expect(checkSameOriginHeaders(makeHeaders({
      origin: 'https://app.example:8443/settings',
      host: 'app.example:8443',
    }))).toEqual({ ok: true });
  });

  it('blocks cross-origin requests', () => {
    expect(checkSameOriginHeaders(makeHeaders({
      origin: 'https://evil.example',
      host: 'app.example',
    }))).toEqual({ ok: false, error: 'Forbidden' });
  });

  it('blocks same host when the scheme differs from the forwarded request origin', () => {
    expect(checkSameOriginHeaders(makeHeaders({
      origin: 'http://app.example',
      host: 'app.example',
      'x-forwarded-proto': 'https',
    }))).toEqual({ ok: false, error: 'Forbidden' });
  });

  it('accepts localhost origins when forwarded proto is absent', () => {
    expect(checkSameOriginHeaders(makeHeaders({
      origin: 'http://localhost:3000/editor',
      host: 'localhost:3000',
    }))).toEqual({ ok: true });
  });

  it('blocks malformed Origin values instead of throwing', () => {
    expect(checkSameOriginHeaders(makeHeaders({
      origin: '::::',
      host: 'app.example',
    }))).toEqual({ ok: false, error: 'Forbidden' });
  });

  it('preserves the existing no-host fallback behavior', () => {
    expect(checkSameOriginHeaders(makeHeaders({
      origin: 'https://app.example',
    }))).toEqual({ ok: true });
  });
});
