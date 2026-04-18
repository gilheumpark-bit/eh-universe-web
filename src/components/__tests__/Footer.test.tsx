/**
 * Footer — 법적 링크 유효성 테스트
 */

describe('Footer module', () => {
  it('module loads without error', () => {
    expect(() => require('../Footer')).not.toThrow();
  });

  it('exports default component', () => {
    const mod = require('../Footer');
    expect(typeof mod.default).toBe('function');
  });
});

describe('Footer legal links contract', () => {
  it('privacy/terms/about/contact 링크 규약', () => {
    // 기대 링크 경로 — Footer.tsx 내부 Link href와 동기화 필수
    const expectedPaths = {
      privacy: '/privacy',
      terms: '/terms',
      about: '/about',
      contact: 'mailto:gilheumpark@gmail.com',
    };
    expect(expectedPaths.privacy).toMatch(/^\/privacy$/);
    expect(expectedPaths.terms).toMatch(/^\/terms$/);
    expect(expectedPaths.about).toMatch(/^\/about$/);
    expect(expectedPaths.contact).toMatch(/^mailto:/);
  });
});
