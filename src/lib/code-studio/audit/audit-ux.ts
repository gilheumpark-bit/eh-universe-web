// ============================================================
// Code Studio — Audit Engine: C. User Experience (4 areas)
// ============================================================
// 9. Design System  10. Accessibility  11. UX Quality  12. i18n

import type {
  AuditContext, AuditAreaResult, AuditFinding, AuditGrade,
} from './audit-types';

let findingCounter = 0;
function fid(area: string): string { return `${area}-${++findingCounter}`; }
function gradeFromScore(s: number): AuditGrade {
  if (s >= 95) return 'S'; if (s >= 85) return 'A'; if (s >= 70) return 'B';
  if (s >= 55) return 'C'; if (s >= 40) return 'D'; return 'F';
}

// ============================================================
// PART 1 — Area 9: Design System (디자인 시스템)
// ============================================================

export function auditDesignSystem(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  // Check 1: Hardcoded hex colors in components
  checks++;
  let hardcodedColors = 0;
  for (const f of ctx.files) {
    if (!f.path.includes('/components/') && !f.path.includes('/app/')) continue;
    if (f.path.endsWith('.css')) continue;
    const matches = f.content.match(/#[0-9a-fA-F]{6}\b/g);
    if (matches) hardcodedColors += matches.length;
  }
  if (hardcodedColors <= 10) {
    passed++;
  } else {
    findings.push({
      id: fid('ds'), area: 'design-system', severity: hardcodedColors > 50 ? 'high' : 'medium',
      message: `하드코딩 hex 색상 ${hardcodedColors}건 — CSS 변수 전환 권장`, rule: 'HARDCODED_COLORS',
    });
  }

  // Check 2: Inline style usage
  checks++;
  let inlineStyles = 0;
  for (const f of ctx.files) {
    if (f.language !== 'tsx') continue;
    inlineStyles += (f.content.match(/style\s*=\s*\{\{/g) ?? []).length;
  }
  if (inlineStyles <= 20) {
    passed++;
  } else {
    findings.push({
      id: fid('ds'), area: 'design-system', severity: 'medium',
      message: `인라인 스타일 ${inlineStyles}건 — 클래스 기반 전환 권장`, rule: 'INLINE_STYLES',
    });
  }

  // Check 3: Inconsistent border-radius values
  checks++;
  const radiusValues = new Set<string>();
  for (const f of ctx.files) {
    const matches = f.content.matchAll(/(?:border-?radius|rounded)\s*[:=]\s*['"]?([0-9.]+(?:px|rem))/gi);
    for (const m of matches) radiusValues.add(m[1]);
    // Tailwind rounded classes
    const twMatches = f.content.matchAll(/rounded-(\w+)/g);
    for (const m of twMatches) radiusValues.add(`tw:${m[1]}`);
  }
  if (radiusValues.size <= 6) {
    passed++;
  } else {
    findings.push({
      id: fid('ds'), area: 'design-system', severity: 'medium',
      message: `border-radius 변형 ${radiusValues.size}종 — 스케일 표준화 권장`, rule: 'INCONSISTENT_RADIUS',
    });
  }

  // Check 4: CSS variables defined
  checks++;
  const cssFiles = ctx.files.filter(f => f.path.endsWith('.css'));
  let cssVarCount = 0;
  for (const f of cssFiles) {
    cssVarCount += (f.content.match(/--[\w-]+\s*:/g) ?? []).length;
  }
  if (cssVarCount >= 10) {
    passed++;
  } else {
    findings.push({
      id: fid('ds'), area: 'design-system', severity: 'high',
      message: `CSS 변수 ${cssVarCount}건 — 디자인 토큰 시스템 부재`, rule: 'LOW_CSS_VARS',
    });
  }

  // Check 5: Theme support (data-theme or class-based)
  checks++;
  const hasThemeSupport = cssFiles.some(f => /\[data-theme|\.dark|\.light|prefers-color-scheme/.test(f.content));
  if (hasThemeSupport) {
    passed++;
  } else {
    findings.push({
      id: fid('ds'), area: 'design-system', severity: 'medium',
      message: '테마 시스템 미감지 (data-theme / prefers-color-scheme)', rule: 'NO_THEME_SUPPORT',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'design-system', category: 'user-experience', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { hardcodedColors, inlineStyles, radiusVariants: radiusValues.size, cssVarCount },
  };
}

// IDENTITY_SEAL: PART-1 | role=design-system-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 2 — Area 10: Accessibility (접근성)
// ============================================================

export function auditAccessibility(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  const tsxFiles = ctx.files.filter(f => f.language === 'tsx');

  // Check 1: Images without alt
  checks++;
  let imgWithoutAlt = 0;
  for (const f of tsxFiles) {
    const imgTags = f.content.match(/<img\b[^>]*>/g) ?? [];
    for (const tag of imgTags) {
      if (!/alt\s*=/.test(tag)) imgWithoutAlt++;
    }
  }
  if (imgWithoutAlt === 0) { passed++; } else {
    findings.push({
      id: fid('a11y'), area: 'accessibility', severity: 'high',
      message: `<img> alt 속성 누락 ${imgWithoutAlt}건`, rule: 'IMG_NO_ALT',
    });
  }

  // Check 2: Buttons without accessible text
  checks++;
  let buttonNoLabel = 0;
  for (const f of tsxFiles) {
    const lines = f.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/<button\b/.test(lines[i]) && !/aria-label/.test(lines[i])) {
        // Check if button has text content (next lines)
        const block = lines.slice(i, Math.min(i + 3, lines.length)).join('');
        if (/<button[^>]*>\s*<(?:svg|img|span\s)/.test(block) && !/aria-label/.test(block)) {
          buttonNoLabel++;
        }
      }
    }
  }
  if (buttonNoLabel <= 3) { passed++; } else {
    findings.push({
      id: fid('a11y'), area: 'accessibility', severity: 'high',
      message: `아이콘 전용 버튼에 aria-label 누락 ${buttonNoLabel}건`, rule: 'BUTTON_NO_LABEL',
    });
  }

  // Check 3: Focus-visible styles
  checks++;
  const cssFiles = ctx.files.filter(f => f.path.endsWith('.css'));
  const hasFocusVisible = cssFiles.some(f => /focus-visible/.test(f.content));
  if (hasFocusVisible) { passed++; } else {
    findings.push({
      id: fid('a11y'), area: 'accessibility', severity: 'high',
      message: 'focus-visible 스타일 미정의 — 키보드 네비게이션 불가', rule: 'NO_FOCUS_VISIBLE',
    });
  }

  // Check 4: Color-only indicators
  checks++;
  let colorOnlyIndicators = 0;
  for (const f of tsxFiles) {
    // Pattern: severity/status displayed only by color class, no icon or text
    if (/text-red-\d|text-green-\d|text-yellow-\d/.test(f.content) &&
      !/role=.*status|aria-label.*severity|aria-label.*error/i.test(f.content)) {
      colorOnlyIndicators++;
    }
  }
  if (colorOnlyIndicators <= 5) { passed++; } else {
    findings.push({
      id: fid('a11y'), area: 'accessibility', severity: 'medium',
      message: `색상만으로 상태 표시 ${colorOnlyIndicators}건 — WCAG 위반 가능`, rule: 'COLOR_ONLY_INDICATOR',
    });
  }

  // Check 5: Semantic HTML (role attributes used)
  checks++;
  let roleUsage = 0;
  for (const f of tsxFiles) {
    roleUsage += (f.content.match(/role\s*=\s*["']/g) ?? []).length;
  }
  if (roleUsage >= 10) { passed++; } else {
    findings.push({
      id: fid('a11y'), area: 'accessibility', severity: 'medium',
      message: `ARIA role 사용 ${roleUsage}건 — 시맨틱 마크업 보강 필요`, rule: 'LOW_ARIA_ROLES',
    });
  }

  // Check 6: prefers-reduced-motion respect
  checks++;
  const respectsMotion = cssFiles.some(f => /prefers-reduced-motion/.test(f.content)) ||
    tsxFiles.some(f => /prefers-reduced-motion/.test(f.content));
  if (respectsMotion) { passed++; } else {
    findings.push({
      id: fid('a11y'), area: 'accessibility', severity: 'medium',
      message: 'prefers-reduced-motion 미대응 — 모션 감소 사용자 배려 필요', rule: 'NO_REDUCED_MOTION',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'accessibility', category: 'user-experience', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { imgWithoutAlt, buttonNoLabel, roleUsage, colorOnlyIndicators },
  };
}

// IDENTITY_SEAL: PART-2 | role=accessibility-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 3 — Area 11: UX Quality (UX 품질)
// ============================================================

export function auditUXQuality(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  const tsxFiles = ctx.files.filter(f => f.language === 'tsx');

  // Check 1: Loading states (Suspense, skeleton, spinner)
  checks++;
  let loadingPatterns = 0;
  for (const f of tsxFiles) {
    if (/Suspense|skeleton|Skeleton|Loader|spinner|loading/i.test(f.content)) loadingPatterns++;
  }
  if (loadingPatterns >= 5) { passed++; } else {
    findings.push({
      id: fid('ux'), area: 'ux-quality', severity: 'medium',
      message: `로딩 상태 패턴 ${loadingPatterns}건 — 사용자 피드백 부족`, rule: 'LOW_LOADING_STATES',
    });
  }

  // Check 2: Error states visible to user
  checks++;
  let errorDisplays = 0;
  for (const f of tsxFiles) {
    if (/error.*message|Error.*display|alert.*error|toast.*error/i.test(f.content)) errorDisplays++;
  }
  if (errorDisplays >= 3) { passed++; } else {
    findings.push({
      id: fid('ux'), area: 'ux-quality', severity: 'high',
      message: `에러 표시 패턴 ${errorDisplays}건 — 사용자 에러 피드백 부족`, rule: 'LOW_ERROR_DISPLAY',
    });
  }

  // Check 3: Confirmation before destructive actions
  checks++;
  let deleteWithoutConfirm = 0;
  for (const f of tsxFiles) {
    if (/\bdelete\b|\bremove\b/i.test(f.content) && !/confirm|Confirm|modal.*delete|dialog.*delete/i.test(f.content)) {
      deleteWithoutConfirm++;
    }
  }
  if (deleteWithoutConfirm <= 2) { passed++; } else {
    findings.push({
      id: fid('ux'), area: 'ux-quality', severity: 'high',
      message: `삭제 동작에 확인 없음 ${deleteWithoutConfirm}건 — 데이터 유실 위험`, rule: 'DELETE_NO_CONFIRM',
    });
  }

  // Check 4: Empty states
  checks++;
  let emptyStates = 0;
  for (const f of tsxFiles) {
    if (/empty.*state|no.*items|no.*data|없습니다|비어\s*있/i.test(f.content)) emptyStates++;
  }
  if (emptyStates >= 5) { passed++; } else {
    findings.push({
      id: fid('ux'), area: 'ux-quality', severity: 'medium',
      message: `빈 상태 처리 ${emptyStates}건 — 비어있을 때 안내 부족`, rule: 'LOW_EMPTY_STATES',
    });
  }

  // Check 5: Toast/notification system
  checks++;
  const hasToast = ctx.files.some(f => /toast|Toast|notification|Notification/i.test(f.content) && f.path.includes('/components/'));
  if (hasToast) { passed++; } else {
    findings.push({
      id: fid('ux'), area: 'ux-quality', severity: 'medium',
      message: '토스트/알림 시스템 미감지', rule: 'NO_TOAST_SYSTEM',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'ux-quality', category: 'user-experience', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { loadingPatterns, errorDisplays, emptyStates },
  };
}

// IDENTITY_SEAL: PART-3 | role=ux-quality-audit | inputs=AuditContext | outputs=AuditAreaResult

// ============================================================
// PART 4 — Area 12: i18n (국제화)
// ============================================================

export function auditI18n(ctx: AuditContext): AuditAreaResult {
  const findings: AuditFinding[] = [];
  let checks = 0;
  let passed = 0;

  const tsxFiles = ctx.files.filter(f => f.language === 'tsx');

  // Check 1: Translation system exists
  checks++;
  const hasI18n = ctx.files.some(f => /translations|useLang|useTranslation|i18n/i.test(f.content));
  if (hasI18n) { passed++; } else {
    findings.push({
      id: fid('i18n'), area: 'i18n', severity: 'high',
      message: '번역 시스템 미감지', rule: 'NO_I18N_SYSTEM',
    });
  }

  // Check 2: Hardcoded Korean text in components
  checks++;
  let hardcodedKo = 0;
  const koPattern = /[\uAC00-\uD7A3]{3,}/; // 3+ consecutive Korean chars
  for (const f of tsxFiles) {
    if (f.path.includes('translations') || f.path.includes('articles')) continue;
    const lines = f.content.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
      if (koPattern.test(line) && !/(?:console|\/\/|\/\*|\*|import|from)/.test(line)) {
        hardcodedKo++;
        break; // count per file
      }
    }
  }
  if (hardcodedKo <= 5) { passed++; } else {
    findings.push({
      id: fid('i18n'), area: 'i18n', severity: hardcodedKo > 20 ? 'high' : 'medium',
      message: `하드코딩 한국어 ${hardcodedKo}개 파일 — 번역 사전 연결 필요`, rule: 'HARDCODED_KO',
    });
  }

  // Check 3: Hardcoded English text in components
  checks++;
  let hardcodedEn = 0;
  for (const f of tsxFiles) {
    if (f.path.includes('translations') || f.path.includes('articles')) continue;
    // Look for string literals with English words in JSX context
    const matches = f.content.match(/>\s*[A-Z][a-z]+(?:\s[A-Z]?[a-z]+){2,}\s*</g);
    if (matches && matches.length > 3) hardcodedEn++;
  }
  if (hardcodedEn <= 5) { passed++; } else {
    findings.push({
      id: fid('i18n'), area: 'i18n', severity: 'medium',
      message: `하드코딩 영어 텍스트 ${hardcodedEn}개 파일`, rule: 'HARDCODED_EN',
    });
  }

  // Check 4: Language fallback chain
  checks++;
  const hasFallback = ctx.files.some(f => /fallback|L2|defaultLang/i.test(f.content) && f.path.includes('Lang'));
  if (hasFallback) { passed++; } else {
    findings.push({
      id: fid('i18n'), area: 'i18n', severity: 'medium',
      message: '번역 폴백 체인 미감지', rule: 'NO_FALLBACK_CHAIN',
    });
  }

  // Check 5: Multiple language support (>= 2 languages in translations)
  checks++;
  const translationFile = ctx.files.find(f => /translations/i.test(f.path) && f.language === 'typescript');
  if (translationFile) {
    const langKeys = (translationFile.content.match(/\b(ko|en|jp|cn|ja|zh)\b\s*:/g) ?? []);
    const uniqueLangs = new Set(langKeys.map(k => k.replace(/\s*:/, '').trim()));
    if (uniqueLangs.size >= 2) { passed++; } else {
      findings.push({
        id: fid('i18n'), area: 'i18n', severity: 'high',
        message: `번역 파일에 ${uniqueLangs.size}개 언어만 감지`, rule: 'LOW_LANG_COVERAGE',
      });
    }
  } else {
    findings.push({
      id: fid('i18n'), area: 'i18n', severity: 'medium',
      message: '번역 사전 파일 미발견', rule: 'NO_TRANSLATION_FILE',
    });
  }

  const score = Math.max(0, Math.round((passed / Math.max(checks, 1)) * 100));
  return {
    area: 'i18n', category: 'user-experience', score, grade: gradeFromScore(score),
    findings, checks, passed,
    metrics: { hardcodedKo, hardcodedEn },
  };
}

// IDENTITY_SEAL: PART-4 | role=i18n-audit | inputs=AuditContext | outputs=AuditAreaResult
