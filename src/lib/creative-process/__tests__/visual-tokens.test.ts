/**
 * visual-tokens.test.ts (2026-05-10 — Visual Charter v1.0)
 */

import { VISUAL_TOKENS, buildCSSVarsString, buildCertificateBaseCSS } from '../visual-tokens';

describe('visual-tokens — VISUAL_TOKENS 정의', () => {
  it('color 핵심 5색 정의', () => {
    expect(VISUAL_TOKENS.color.deepCharcoal).toBe('#1A1A1A');
    expect(VISUAL_TOKENS.color.cleanWhite).toBe('#FFFFFF');
    expect(VISUAL_TOKENS.color.accentGold).toBe('#D4AF37');
    expect(VISUAL_TOKENS.color.royalBlue).toBe('#4169E1');
    expect(VISUAL_TOKENS.color.professionalNavy).toBe('#2C3E50');
  });

  it('shape Sharp 0px 강제', () => {
    expect(VISUAL_TOKENS.shape.radiusBase).toBe('0');
    expect(VISUAL_TOKENS.shape.radiusSeal).toBe('50%');
  });

  it('typography Newsreader 헤딩 + Public Sans 본문', () => {
    expect(VISUAL_TOKENS.typography.headlineMd.family).toContain('Newsreader');
    expect(VISUAL_TOKENS.typography.bodyMd.family).toContain('Public Sans');
    expect(VISUAL_TOKENS.typography.dataMono.family).toContain('Inter');
  });

  it('spacing 4px baseline + 8/24/48 multiples', () => {
    expect(VISUAL_TOKENS.spacing.unit).toBe(4);
    expect(VISUAL_TOKENS.spacing.stackSm).toBe(8);
    expect(VISUAL_TOKENS.spacing.stackMd).toBe(24);
    expect(VISUAL_TOKENS.spacing.stackLg).toBe(48);
  });
});

describe('visual-tokens — buildCSSVarsString', () => {
  it(':root 블록 + cert-color-* vars 포함', () => {
    const css = buildCSSVarsString();
    expect(css).toContain(':root {');
    expect(css).toContain('--cert-color-deep-charcoal: #1A1A1A;');
    expect(css).toContain('--cert-color-accent-gold: #D4AF37;');
    expect(css).toContain('--cert-radius-base: 0;');
    expect(css).toContain('}');
  });

  it('shadow / border / spacing 변수 포함', () => {
    const css = buildCSSVarsString();
    expect(css).toContain('--cert-shadow-document');
    expect(css).toContain('--cert-border-hairline');
    expect(css).toContain('--cert-spacing-margin-page');
    expect(css).toContain('--cert-container-max');
  });
});

describe('visual-tokens — buildCertificateBaseCSS', () => {
  it('reset + html/body 정의', () => {
    const css = buildCertificateBaseCSS();
    expect(css).toContain('* { box-sizing: border-box');
    expect(css).toContain('html, body {');
  });

  it('.cert-container 정의', () => {
    const css = buildCertificateBaseCSS();
    expect(css).toContain('.cert-container {');
    expect(css).toContain('var(--cert-shadow-document)');
  });

  it('@media print 인쇄 친화', () => {
    const css = buildCertificateBaseCSS();
    expect(css).toContain('@media print');
  });

  it('외부 link 0건 (link/import 없음)', () => {
    const css = buildCertificateBaseCSS();
    expect(css).not.toMatch(/<link/i);
    expect(css).not.toMatch(/@import/);
  });

  it('hci-value / witness-seal-svg / donut-svg 클래스 정의', () => {
    const css = buildCertificateBaseCSS();
    expect(css).toContain('.hci-value');
    expect(css).toContain('.witness-seal-svg');
    expect(css).toContain('.donut-svg');
    expect(css).toContain('.qr-img');
  });
});
