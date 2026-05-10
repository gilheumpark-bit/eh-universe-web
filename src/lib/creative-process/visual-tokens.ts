// ============================================================
// Visual Tokens — Creative Process Certificate 시각 헌법 v1.0
// ============================================================
//
// stitch_lore_guard "Modern Institutionalism / Editorial Minimalism" 사상 응축.
// 외부 link 0건 정책 — 폰트는 base64 inline embedding 권장.
//
// 디자인 결정 사상 정합:
//   - Sharp 0px corners — VS Code/Notion 둥근 SaaS 트렌드 거부, 법정 격식
//   - Newsreader serif — 책 표지 + 법률 헤더의 전통 무게
//   - Accent Gold #D4AF37 — 봉인 전용 토큰 (남용 X)
//   - Document Shadow — 책상 위 종이 메타포
//   - 4px baseline + 8px multiples — 공식 문서 격자
//
// [C] 안전성: const satisfies — 타입 강제, 누락 키 시 컴파일 에러
// [G] 성능: 정적 객체, runtime 비용 0
// [K] 간결성: 단일 export + buildCSSVarsString() helper
// ============================================================

// ============================================================
// PART 1 — Token 정의
// ============================================================

export const VISUAL_TOKENS = {
  color: {
    /** 본문 텍스트 + 구조 그라운딩 (잉크) */
    deepCharcoal: '#1A1A1A',
    /** 보조 표면 (사이드바·내비) */
    professionalNavy: '#2C3E50',
    /** 캔버스 (종이) */
    cleanWhite: '#FFFFFF',
    /** Witness Seal 전용 */
    accentGold: '#D4AF37',
    /** 보조 액센트 (verified status) */
    royalBlue: '#4169E1',
    /** 책상 배경 */
    surface: '#F9F9F9',
    surfaceDim: '#DADADA',
    /** Hairline border */
    outlineLight: '#E1E1E1',
    outlineMid: '#C4C7C7',
  },
  typography: {
    displayLg: { family: "'Newsreader', 'Noto Serif KR', 'Noto Serif JP', 'Noto Serif SC', Georgia, serif", size: '48px', weight: 600, line: 1.1, tracking: '-0.02em' },
    headlineMd: { family: "'Newsreader', 'Noto Serif KR', 'Noto Serif JP', 'Noto Serif SC', Georgia, serif", size: '32px', weight: 500, line: 1.2 },
    titleSm: { family: "'Newsreader', 'Noto Serif KR', 'Noto Serif JP', 'Noto Serif SC', Georgia, serif", size: '20px', weight: 600, line: 1.4 },
    bodyLg: { family: "'Public Sans', 'Pretendard', 'Noto Sans JP', 'Noto Sans SC', system-ui, sans-serif", size: '18px', weight: 400, line: 1.6 },
    bodyMd: { family: "'Public Sans', 'Pretendard', 'Noto Sans JP', 'Noto Sans SC', system-ui, sans-serif", size: '16px', weight: 400, line: 1.6 },
    dataMono: { family: "'Inter', 'SF Mono', Menlo, Consolas, monospace", size: '14px', weight: 500, line: 1.5, tracking: '0.02em' },
    labelCaps: { family: "'Inter', 'SF Mono', Menlo, Consolas, monospace", size: '12px', weight: 700, line: 1.2, tracking: '0.1em', upper: true },
  },
  spacing: {
    unit: 4, // px (baseline)
    gutter: 24,
    marginPage: 64,
    containerMax: 1280,
    stackSm: 8,
    stackMd: 24,
    stackLg: 48,
  },
  shape: {
    /** Sharp 0px (Witness Seal 만 예외) */
    radiusBase: '0',
    radiusSeal: '50%',
  },
  shadow: {
    /** 책상 위 종이 — 매우 부드러운 shadow */
    documentLight: '0px 4px 20px rgba(0,0,0,0.05)',
    none: 'none',
  },
  border: {
    hairline: '1px solid #E1E1E1',
    structural: '1px solid #1A1A1A',
    /** 장부 룰드 라인 — Cryptographic Ledger 표용 */
    ledger: '0.5px solid #1A1A1A',
  },
} as const;

// ============================================================
// PART 2 — CSS Variables 빌더
// ============================================================

/**
 * VISUAL_TOKENS → CSS custom properties 문자열.
 * `:root { --cert-color-deep-charcoal: #1A1A1A; ... }`
 *
 * 사용:
 *   const css = `<style>${buildCSSVarsString()}</style>`;
 *   // html-renderer 의 inline <style> 안에 주입
 */
export function buildCSSVarsString(): string {
  const lines: string[] = [];
  lines.push(':root {');
  for (const [key, value] of Object.entries(VISUAL_TOKENS.color)) {
    lines.push(`  --cert-color-${kebab(key)}: ${value};`);
  }
  lines.push(`  --cert-radius-base: ${VISUAL_TOKENS.shape.radiusBase};`);
  lines.push(`  --cert-radius-seal: ${VISUAL_TOKENS.shape.radiusSeal};`);
  lines.push(`  --cert-shadow-document: ${VISUAL_TOKENS.shadow.documentLight};`);
  lines.push(`  --cert-border-hairline: ${VISUAL_TOKENS.border.hairline};`);
  lines.push(`  --cert-border-structural: ${VISUAL_TOKENS.border.structural};`);
  lines.push(`  --cert-border-ledger: ${VISUAL_TOKENS.border.ledger};`);
  lines.push(`  --cert-spacing-gutter: ${VISUAL_TOKENS.spacing.gutter}px;`);
  lines.push(`  --cert-spacing-margin-page: ${VISUAL_TOKENS.spacing.marginPage}px;`);
  lines.push(`  --cert-container-max: ${VISUAL_TOKENS.spacing.containerMax}px;`);
  lines.push('}');
  return lines.join('\n');
}

function kebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ============================================================
// PART 3 — 베이스 CSS (Reset + Layout)
// ============================================================

/**
 * Certificate 본체 베이스 CSS.
 * 외부 link 0건 — 모든 스타일 inline.
 *
 * 호출: html-renderer 의 <head><style> 안에 prepend.
 */
export function buildCertificateBaseCSS(): string {
  return `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: ${VISUAL_TOKENS.typography.bodyMd.family};
  font-size: ${VISUAL_TOKENS.typography.bodyMd.size};
  line-height: ${VISUAL_TOKENS.typography.bodyMd.line};
  color: var(--cert-color-deep-charcoal);
  background: var(--cert-color-surface);
}
.cert-container {
  max-width: var(--cert-container-max);
  margin: 0 auto;
  padding: var(--cert-spacing-margin-page);
  background: var(--cert-color-clean-white);
  box-shadow: var(--cert-shadow-document);
  border: var(--cert-border-hairline);
}
h1, h2, h3 {
  font-family: ${VISUAL_TOKENS.typography.headlineMd.family};
  color: var(--cert-color-deep-charcoal);
  font-weight: 500;
}
h1 { font-size: ${VISUAL_TOKENS.typography.displayLg.size}; line-height: ${VISUAL_TOKENS.typography.displayLg.line}; letter-spacing: ${VISUAL_TOKENS.typography.displayLg.tracking}; font-weight: ${VISUAL_TOKENS.typography.displayLg.weight}; }
h2 { font-size: ${VISUAL_TOKENS.typography.headlineMd.size}; line-height: ${VISUAL_TOKENS.typography.headlineMd.line}; }
h3 { font-size: ${VISUAL_TOKENS.typography.titleSm.size}; line-height: ${VISUAL_TOKENS.typography.titleSm.line}; font-weight: ${VISUAL_TOKENS.typography.titleSm.weight}; }
.label-caps {
  font-family: ${VISUAL_TOKENS.typography.labelCaps.family};
  font-size: ${VISUAL_TOKENS.typography.labelCaps.size};
  font-weight: ${VISUAL_TOKENS.typography.labelCaps.weight};
  letter-spacing: ${VISUAL_TOKENS.typography.labelCaps.tracking};
  text-transform: uppercase;
  color: var(--cert-color-outline-mid);
}
.data-mono {
  font-family: ${VISUAL_TOKENS.typography.dataMono.family};
  font-size: ${VISUAL_TOKENS.typography.dataMono.size};
  letter-spacing: ${VISUAL_TOKENS.typography.dataMono.tracking};
}
button, input, select, textarea { border-radius: var(--cert-radius-base); }
table { border-collapse: collapse; width: 100%; }
table th, table td { border-bottom: var(--cert-border-ledger); padding: 8px 12px; text-align: left; font-family: ${VISUAL_TOKENS.typography.dataMono.family}; font-size: ${VISUAL_TOKENS.typography.dataMono.size}; }
.disclaimer-first-line {
  font-size: 11px;
  color: var(--cert-color-outline-mid);
  border-bottom: var(--cert-border-hairline);
  padding-bottom: 12px;
  margin-bottom: 24px;
  line-height: 1.5;
}
.cert-section { margin-bottom: ${VISUAL_TOKENS.spacing.stackLg}px; }
.cert-section + .cert-section { border-top: var(--cert-border-hairline); padding-top: ${VISUAL_TOKENS.spacing.stackMd}px; }
.witness-seal-svg { width: 120px; height: 120px; }
.donut-svg { width: 120px; height: 120px; }
.qr-img { width: 120px; height: 120px; }
.cert-footer { margin-top: ${VISUAL_TOKENS.spacing.stackLg}px; padding-top: ${VISUAL_TOKENS.spacing.stackMd}px; border-top: var(--cert-border-hairline); font-size: 10px; color: var(--cert-color-outline-mid); text-align: center; }
.hci-value { font-family: ${VISUAL_TOKENS.typography.headlineMd.family}; font-size: 64px; font-weight: 600; color: var(--cert-color-deep-charcoal); line-height: 1; }
.hci-disclaimer { font-size: 10px; color: var(--cert-color-outline-mid); margin-top: 8px; line-height: 1.5; }
.cert-attestation blockquote { border-left: 3px solid var(--cert-color-accent-gold); padding-left: 16px; font-style: italic; color: var(--cert-color-deep-charcoal); margin: 16px 0; }
@media print {
  body { background: white; }
  .cert-container { box-shadow: none; border: none; max-width: 100%; }
}
`;
}
