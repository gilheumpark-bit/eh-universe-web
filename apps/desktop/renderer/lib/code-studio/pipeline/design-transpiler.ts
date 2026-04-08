import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Design Spec Transpiler & Sanitizer
// ============================================================
// [SCOPE_START: DesignTranspiler]
// [CONTRACT: PART-01]
// - Inputs: rawCode (string) from external AI generator (Zone 1)
// - Outputs: SanitizeResult mapping semantic tokens for host
// - MUST_NOT_CHANGE: Public signature of transpileVendorCode

export interface SanitizeResult {
  passed: boolean;
  code: string;
  findings: string[];
}

const FORBIDDEN_PATTERN = ['dangerouslySetInnerHTML', 'eval\(', 'window.location', 'unpkg.com'];

export function transpileVendorCode(rawCode: string): SanitizeResult {
  const findings: string[] = [];
  let safeCode = rawCode;
  let hasReject = false;

  // 1. 보안 필터링 (XSS & 임의 DOM 조작 스캔)
  for (const forbidden of FORBIDDEN_PATTERN) {
    if (rawCode.includes(forbidden)) {
      findings.push(`[SECURITY REJECT] 금지된 API 사용 감지. 변명의 여지가 없는 P0 런타임 위협: ${forbidden}`);
      hasReject = true;
    }
  }

  // 2. 외주망 하드코딩 토큰 -> 내부 사내 규격(v8.0) 매핑
  // 2.1 Backgrounds
  const bgRegex = /bg-(?:gray|zinc|slate)-[89]00/g;
  if (bgRegex.test(safeCode)) {
    safeCode = safeCode.replace(bgRegex, 'bg-bg-primary');
    findings.push('[AUTO-FIX] 촌스러운 다크 테마 하드코딩 발견. 사내 시맨틱 "bg-bg-primary"로 강제 덮어쓰기 집행.');
  }

  const bgSubRegex = /bg-(?:gray|zinc|slate)-[67]00/g;
  if (bgSubRegex.test(safeCode)) {
    safeCode = safeCode.replace(bgSubRegex, 'bg-bg-secondary');
  }

  // 2.2 Text
  const textWhiteRegex = /text-(?:white|gray-50)/g;
  if (textWhiteRegex.test(safeCode)) {
    safeCode = safeCode.replace(textWhiteRegex, 'text-text-primary');
    findings.push('[AUTO-FIX] "text-white" 계열 하드코딩을 사내 토큰 "text-text-primary"로 강제 매핑.');
  }

  // 2.3 Z-Index
  const zModalRegex = /z-[5-9]0/g;
  if (zModalRegex.test(safeCode)) {
    safeCode = safeCode.replace(zModalRegex, 'var(--z-modal)');
    findings.push('[AUTO-FIX] 모달/오버레이 Z-Index 폭주. 사내 통제 규격 "var(--z-modal)"로 압축 완료.');
  }

  // 3. 최신 SaaS (Vercel / Linear) UI 트렌드 적용 검사
  // [G] 원색 유틸리티 사용 적발 시 즉결 처형
  const primaryColorRegex = /(bg|text|border)-(red|blue|green|yellow|pink)-(400|500|600)/g;
  if (primaryColorRegex.test(safeCode)) {
    findings.push(`[DESIGN REJECT] 원색 유틸리티(Tailwind 500 계열) 감지. Linear/Vercel 퀄리티에 역행하는 저급한 UI 스펙임. 즉각 폐기 요망.`);
    hasReject = true;
  }

  // 4. 접근성(A11y) & SaaS 마이크로 모션 강제 보강
  // [C] 안전성 & 품질: 포커스 트랩과 hover:scale 액션 누락 감지 및 린트 우회 보강
  const interactiveRegex = /<(button|a|select|input)([^>]*?)className=(['"])(.*?)(['"])/g;
  safeCode = safeCode.replace(interactiveRegex, (match, tag, before, quote, classNames, quoteEnd) => {
    let newClass = classNames;
    if (!newClass.includes('focus-visible')) {
      newClass += ' focus-visible:ring-2 ring-accent-purple/40 outline-none';
    }
    // 마이크로 모션(버튼, 링크 등)
    if ((tag === 'button' || tag === 'a') && !newClass.includes('hover:scale')) {
      newClass += ' hover:scale-[1.02] active:scale-95 transition-all duration-200';
    }
    
    if (newClass !== classNames) {
      findings.push(`[AUTO-FIX] <${tag}> 엘리먼트에 SaaS 마이크로 모션 및 접근성 포커스 강제 주입.`);
      return `<${tag}${before}className=${quote}${newClass}${quoteEnd}`;
    }
    return match;
  });

  if (findings.length > 0) {
    logger.info(`[DesignTranspiler] 외주 코드 컴플라이언스 점검 완료. 산출물 트렌드 교정 및 결함 판정 내역: ${findings.length}건`);
  }

  return {
    passed: !hasReject,
    code: safeCode,
    findings
  };
}

// [SCOPE_END]
// IDENTITY_SEAL: PART-1 | role=Design Specs Sanitizer | inputs=raw code string | outputs=SanitizeResult
