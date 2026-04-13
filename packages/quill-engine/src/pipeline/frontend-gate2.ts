// ============================================================
// Frontend Gate 2: Design Token Linter
// ============================================================
// AI가 raw CSS를 난사하는 것을 차단.
// 허용: Tailwind 클래스, CSS 변수(var(--))
// 금지: 인라인 style, 하드코딩 px/rem, 임의 hex 색상

export interface DesignTokenFinding {
  type: 'inline-style' | 'hardcoded-px' | 'hardcoded-color' | 'raw-css' | 'magic-number';
  line: number;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

// ── 허용된 패턴 ──
const ALLOWED_PX = new Set(['0px', '1px', '2px']); // 보더 등 예외
const ALLOWED_STYLE_PROPS = new Set(['viewTransitionName', 'backgroundImage', 'background']); // 동적 스타일 예외

/** 디자인 토큰 린트 */
export function scanDesignTokens(code: string, fileName: string = 'unknown'): DesignTokenFinding[] {
  const findings: DesignTokenFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // 주석/문자열 안은 스킵
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // 인라인 style 감지 (style={{ ... }})
    if (/style\s*=\s*\{\{/.test(line)) {
      // 허용된 동적 스타일인지 체크
      const isAllowed = [...ALLOWED_STYLE_PROPS].some(p => line.includes(p));
      if (!isAllowed) {
        findings.push({
          type: 'inline-style',
          line: lineNum,
          value: trimmed.slice(0, 80),
          message: `인라인 style 금지: Tailwind 클래스 또는 CSS 변수를 사용하세요.`,
          severity: 'error',
        });
      }
    }

    // 하드코딩 px 감지 (Tailwind 파일이 아닌 곳에서)
    if (!fileName.endsWith('.css') && !fileName.includes('globals')) {
      const pxMatches = line.match(/\b\d{2,}px\b/g);
      if (pxMatches) {
        for (const px of pxMatches) {
          if (ALLOWED_PX.has(px)) continue;
          // className 안에서는 Tailwind일 수 있으므로 스킵
          if (/className/.test(line)) continue;
          findings.push({
            type: 'hardcoded-px',
            line: lineNum,
            value: px,
            message: `하드코딩 픽셀(${px}): Tailwind spacing(p-4, m-8 등) 또는 CSS 변수를 사용하세요.`,
            severity: 'warning',
          });
        }
      }
    }

    // 하드코딩 hex 색상 감지 (#1a2b3c 등)
    if (!fileName.endsWith('.css') && !fileName.includes('globals')) {
      const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
      if (hexMatches) {
        for (const hex of hexMatches) {
          // CSS 변수 정의 안에서는 허용
          if (/--color|--accent|var\(/.test(line)) continue;
          // className 안에서는 Tailwind arbitrary 값일 수 있음
          if (/className.*\[/.test(line)) continue;
          findings.push({
            type: 'hardcoded-color',
            line: lineNum,
            value: hex,
            message: `하드코딩 색상(${hex}): 테마 색상(text-text-primary, bg-accent-amber 등) 또는 CSS 변수를 사용하세요.`,
            severity: 'warning',
          });
        }
      }
    }

    // CSS 속성을 JSX에 직접 쓰는 패턴 (margin:, padding: 등)
    if (/style\s*=.*\b(?:margin|padding|font-size|width|height|top|left|right|bottom)\s*:/.test(line)) {
      findings.push({
        type: 'raw-css',
        line: lineNum,
        value: trimmed.slice(0, 80),
        message: `Raw CSS 속성: Tailwind 유틸리티 클래스로 대체하세요.`,
        severity: 'warning',
      });
    }
  }

  return findings;
}

/** Gate 2 전체 실행 */
export function runFrontendGate2(code: string, fileName: string = 'unknown'): {
  findings: DesignTokenFinding[];
  passed: boolean;
  score: number;
} {
  const findings = scanDesignTokens(code, fileName);
  const errorCount = findings.filter(f => f.severity === 'error').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);
  return { findings, passed: errorCount === 0, score };
}
