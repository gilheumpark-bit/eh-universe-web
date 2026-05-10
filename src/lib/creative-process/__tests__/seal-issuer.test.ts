/**
 * seal-issuer.test.ts (2026-05-10 — Visual Charter v1.0)
 *
 * issueWitnessSeal 형식 검증 + SVG 빌더.
 * IDB 환경 의존이라 일부 case 는 fake-indexeddb 또는 typeof indexedDB 분기 활용.
 */

import { issueWitnessSeal, buildWitnessSealSVG, buildOriginDonutSVG } from '../seal-issuer';

describe('seal-issuer — issueWitnessSeal 형식', () => {
  it('LG-{YY}{MM}-{serial}-{hash4} 패턴', async () => {
    const seal = await issueWitnessSeal({
      generatedAt: '2026-05-10T12:00:00.000Z',
      manuscriptHash: 'abcdef1234567890',
    });
    // LG-2605-NNNN-ABCD
    expect(seal).toMatch(/^LG-\d{4}-\d{4}-[A-Z0-9]{4}$/);
    expect(seal.startsWith('LG-2605-')).toBe(true);
    expect(seal.endsWith('-ABCD')).toBe(true);
  });

  it('hash4 대문자 강제', async () => {
    const seal = await issueWitnessSeal({
      generatedAt: '2026-01-15T00:00:00.000Z',
      manuscriptHash: 'ff9e2c4a',
    });
    expect(seal).toContain('FF9E');
  });

  it('짧은 hash → 0 padding', async () => {
    const seal = await issueWitnessSeal({
      generatedAt: '2026-12-31T00:00:00.000Z',
      manuscriptHash: 'a',
    });
    expect(seal).toMatch(/^LG-2612-\d{4}-A000$/);
  });

  it('연도 끝 2자리 + 월 2자리 정확', async () => {
    const seal = await issueWitnessSeal({
      generatedAt: '2026-03-05T00:00:00.000Z',
      manuscriptHash: 'deadbeef',
    });
    expect(seal).toContain('LG-2603-');
  });

  it('invalid generatedAt → throw', async () => {
    await expect(
      issueWitnessSeal({ generatedAt: 'not-a-date', manuscriptHash: 'abcd' }),
    ).rejects.toThrow();
  });
});

describe('seal-issuer — buildWitnessSealSVG', () => {
  it('SVG 1개 반환 + viewBox 120×120', () => {
    const svg = buildWitnessSealSVG();
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 120 120"');
    expect(svg).toContain('</svg>');
  });

  it('Gold #D4AF37 stroke 포함', () => {
    const svg = buildWitnessSealSVG();
    expect(svg).toContain('#D4AF37');
  });

  it('VERIFIED BY LORE GUARD SYSTEMS 텍스트', () => {
    const svg = buildWitnessSealSVG();
    expect(svg).toContain('VERIFIED BY LORE GUARD SYSTEMS');
  });

  it('class="witness-seal-svg"', () => {
    const svg = buildWitnessSealSVG();
    expect(svg).toContain('witness-seal-svg');
  });
});

describe('seal-issuer — buildOriginDonutSVG', () => {
  it('SVG 1개 + 3 segment', () => {
    const svg = buildOriginDonutSVG(75, 20, 5);
    expect(svg).toContain('<svg');
    // 3 circle segments
    expect((svg.match(/<circle/g) || []).length).toBe(3);
  });

  it('색상 — Charcoal / Gold / Outline', () => {
    const svg = buildOriginDonutSVG(75, 20, 5);
    expect(svg).toContain('#1A1A1A');
    expect(svg).toContain('#D4AF37');
    expect(svg).toContain('#C4C7C7');
  });

  it('class="donut-svg"', () => {
    const svg = buildOriginDonutSVG(33, 33, 34);
    expect(svg).toContain('donut-svg');
  });

  it('100/0/0 입력 — 단일 색만 보임 (segment 모두 렌더, 빈 것은 dasharray 0)', () => {
    const svg = buildOriginDonutSVG(100, 0, 0);
    // 여전히 3 circle 모두 렌더 (dasharray 만 0)
    expect((svg.match(/<circle/g) || []).length).toBe(3);
  });
});
