/**
 * workspace-trust.test — whitelist-based trust store with localStorage.
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  normalizeOrigin,
  getTrustLevel,
  trustSource,
  restrictSource,
  revokeTrust,
  listTrustedSources,
  clearAllTrust,
} from '@/lib/workspace-trust';

// jsdom provides a working localStorage — reset before each test.
beforeEach(() => {
  window.localStorage.clear();
});

describe('workspace-trust / normalizeOrigin', () => {
  it('strips path and query', () => {
    expect(normalizeOrigin('https://example.com/foo/bar?x=1#h')).toBe('https://example.com');
  });

  it('accepts bare host (defaults to https)', () => {
    expect(normalizeOrigin('example.com')).toBe('https://example.com');
  });

  it('accepts protocol-relative form', () => {
    expect(normalizeOrigin('//example.com')).toBe('https://example.com');
  });

  it('preserves non-default port', () => {
    expect(normalizeOrigin('http://localhost:3000/x')).toBe('http://localhost:3000');
  });

  it('returns empty string on garbage input', () => {
    expect(normalizeOrigin('')).toBe('');
    expect(normalizeOrigin('   ')).toBe('');
    expect(normalizeOrigin('not a url!!!!')).toBe('');
  });

  it('rejects non-http(s) schemes', () => {
    expect(normalizeOrigin('javascript:alert(1)')).toBe('');
    expect(normalizeOrigin('data:text/html,x')).toBe('');
    expect(normalizeOrigin('file:///tmp/x')).toBe('');
  });
});

describe('workspace-trust / trust lifecycle', () => {
  it('unknown url → level "unknown" (default deny)', () => {
    expect(getTrustLevel('https://new.example')).toBe('unknown');
  });

  it('SYSTEM_TRUSTED origins are trusted without setup', () => {
    expect(getTrustLevel('https://api.ehuniverse.com/anything')).toBe('trusted');
  });

  it('trustSource persists and elevates level', () => {
    trustSource('https://plugins.example/foo/bar');
    expect(getTrustLevel('https://plugins.example')).toBe('trusted');
    // and path variants resolve the same
    expect(getTrustLevel('https://plugins.example/another/path')).toBe('trusted');
  });

  it('trustSource stores note when provided', () => {
    trustSource('https://world.example', 'my favorite world pack');
    const list = listTrustedSources();
    const match = list.find(e => e.url === 'https://world.example');
    expect(match?.note).toBe('my favorite world pack');
    expect(match?.level).toBe('trusted');
    expect(match?.addedBy).toBe('user');
  });

  it('trustSource: upsert overwrites existing entry', () => {
    trustSource('https://x.example', 'first');
    trustSource('https://x.example', 'second');
    const list = listTrustedSources().filter(e => e.url === 'https://x.example');
    expect(list).toHaveLength(1);
    expect(list[0].note).toBe('second');
  });

  it('restrictSource persists as "restricted"', () => {
    restrictSource('https://bad.example');
    expect(getTrustLevel('https://bad.example')).toBe('restricted');
  });

  it('revokeTrust removes entry and reverts to unknown', () => {
    trustSource('https://x.example');
    expect(getTrustLevel('https://x.example')).toBe('trusted');
    revokeTrust('https://x.example');
    expect(getTrustLevel('https://x.example')).toBe('unknown');
  });

  it('listTrustedSources returns newest-first', async () => {
    trustSource('https://a.example');
    // deliberate small delay to ensure timestamp ordering
    await new Promise(r => setTimeout(r, 4));
    trustSource('https://b.example');
    const list = listTrustedSources();
    expect(list[0].url).toBe('https://b.example');
    expect(list[1].url).toBe('https://a.example');
  });

  it('clearAllTrust wipes every entry', () => {
    trustSource('https://a.example');
    trustSource('https://b.example');
    clearAllTrust();
    expect(listTrustedSources()).toEqual([]);
    expect(getTrustLevel('https://a.example')).toBe('unknown');
  });

  it('rejects invalid url in trustSource (no crash, no write)', () => {
    trustSource('javascript:alert(1)');
    expect(listTrustedSources()).toEqual([]);
  });

  it('survives corrupted localStorage payload', () => {
    window.localStorage.setItem('noa_workspace_trust', '{not json');
    expect(getTrustLevel('https://x.example')).toBe('unknown');
    // and trustSource still works after corruption
    trustSource('https://x.example');
    expect(getTrustLevel('https://x.example')).toBe('trusted');
  });

  it('filters malformed entries from storage', () => {
    window.localStorage.setItem(
      'noa_workspace_trust',
      JSON.stringify([
        { url: 'https://ok.example', level: 'trusted', addedAt: 1, addedBy: 'user' },
        { url: 'https://bad.example', level: 'invalid-level', addedAt: 2, addedBy: 'user' },
        'not-an-object',
        null,
      ]),
    );
    const list = listTrustedSources();
    expect(list).toHaveLength(1);
    expect(list[0].url).toBe('https://ok.example');
  });
});
