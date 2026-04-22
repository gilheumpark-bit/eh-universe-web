/**
 * Compliance Axis 7 — IP / Brand Violation (2026-04-23 신설)
 *
 * 이전 턴에 설계한 **준수 채점 6축**(세계관·캐릭터·연출·장르·씬시트·연속성)에 이어,
 * 생성된 초안에 대해 IP/브랜드 위반을 측정하는 7번째 축.
 *
 * 파이프라인 위치:
 *   [AI 초안 생성] → [6축 채점] → [축 7 IP 채점 — 이 모듈] → 불합격 시 재생성 루프
 *
 * 재생성 루프 연계:
 *   - `buildIPAvoidanceDirective()`가 "발견된 브랜드를 피하고 자체 네이밍으로 치환" 프롬프트 반환
 *   - 메인 재생성 엔진이 이 directive를 작가의 원 지시 뒤에 주입 → 재생성
 */

import {
  scanTextForIP,
  type IPScanResult,
  type IPScanOptions,
} from './scan';
import type { BrandFlag } from './brand-blocklist';

// ============================================================
// PART 1 — Types
// ============================================================

export interface ComplianceAxis7Result {
  /** 0~100 (높을수록 IP 리스크 낮음) */
  readonly score: number;
  /** 합격 여부 — critical 0 && score >= passThreshold */
  readonly passed: boolean;
  /** 재생성 트리거 여부 — 호출 측 루프에서 사용 */
  readonly shouldRegenerate: boolean;
  /** 치명 (실존 IP 직접 매칭) */
  readonly criticalBrands: readonly BrandFlag[];
  /** 경고 (브랜드 + 일반 패턴) */
  readonly warnings: readonly {
    kind: 'brand' | 'pattern';
    message: string;
    position: number;
  }[];
  /** 상세 원본 스캔 결과 (UI·로그용) */
  readonly raw: IPScanResult;
  /** 작가에게 보여줄 한 줄 요약 */
  readonly reason: string;
}

export interface ComplianceAxis7Options extends IPScanOptions {
  /** 합격 점수 임계 (기본 80). 플랫폼·장르별로 다르게 설정 가능. */
  readonly passThreshold?: number;
  /** critical 1건이라도 있으면 무조건 불합격 (기본 true) */
  readonly strictCritical?: boolean;
}

// ============================================================
// PART 2 — 채점
// ============================================================

/**
 * 생성 본문에 대한 IP 준수 채점.
 *
 * 실패 조건 (합격 기준):
 *   - `strictCritical`이 true이고 critical 브랜드 매칭이 1건이라도 있으면 fail
 *   - score < passThreshold 면 fail
 *
 * 경고는 집계만. 재생성 여부 결정에는 critical만 관여 (엄격 기준).
 */
export function scoreIPCompliance(
  text: string,
  options: ComplianceAxis7Options = {},
): ComplianceAxis7Result {
  const threshold = options.passThreshold ?? 80;
  const strict = options.strictCritical ?? true;

  const raw = scanTextForIP(text, options);

  const criticalBrands = raw.brands.filter(b => b.entry.severity === 'critical');

  // readonly 리턴 타입이지만 로컬은 mutable 배열로 작업 (push 가능)
  type WarningItem = { kind: 'brand' | 'pattern'; message: string; position: number };
  const warnings: WarningItem[] = [];
  for (const b of raw.brands) {
    if (b.entry.severity !== 'critical') {
      warnings.push({
        kind: 'brand',
        message: `브랜드 경고: ${b.matched} (${b.entry.canonical})`,
        position: b.position,
      });
    }
  }
  for (const p of raw.patterns) {
    if (p.severity !== 'critical') {
      warnings.push({
        kind: 'pattern',
        message: `${p.description}: "${p.pattern}"`,
        position: p.position,
      });
    }
  }

  const passed =
    raw.score >= threshold && (!strict || criticalBrands.length === 0);
  const shouldRegenerate = !passed;

  const reason = buildReason(raw, criticalBrands, warnings.length, passed);

  return {
    score: raw.score,
    passed,
    shouldRegenerate,
    criticalBrands,
    warnings,
    raw,
    reason,
  };
}

function buildReason(
  raw: IPScanResult,
  criticals: readonly BrandFlag[],
  warningCount: number,
  passed: boolean,
): string {
  if (passed) {
    return `IP 준수 OK — 점수 ${raw.score}/100, 경고 ${warningCount}건.`;
  }
  if (criticals.length > 0) {
    const names = criticals.slice(0, 3).map(b => b.matched).join(', ');
    const suffix = criticals.length > 3 ? ` 외 ${criticals.length - 3}건` : '';
    return `IP 위반 ${criticals.length}건 — "${names}"${suffix}. 자체 네이밍으로 치환 필요.`;
  }
  return `점수 ${raw.score}/100 기준치 미달 — 경고 ${warningCount}건 재검토 권장.`;
}

// ============================================================
// PART 3 — 재생성 지시문 빌더
// ============================================================

/**
 * 불합격 시 재생성 루프에 주입할 지시문 생성.
 *
 * 프롬프트 구조:
 *   [IP 회피 지시 — 재생성]
 *   이전 초안에 다음 실존 IP가 검출되어 재생성합니다:
 *     - "스파이더맨" → 다른 이름으로 치환
 *     - "포켓몬" → 다른 이름으로 치환
 *   지침:
 *   1. 위 이름들을 본문에 절대 사용하지 마십시오.
 *   2. 유사 개념은 세계관 고유 용어로 재작성하세요.
 *   3. ™·® 기호 금지.
 */
export function buildIPAvoidanceDirective(flags: readonly BrandFlag[]): string {
  if (flags.length === 0) return '';
  const criticals = flags.filter(f => f.entry.severity === 'critical');
  const listed = (criticals.length > 0 ? criticals : flags).slice(0, 10);

  const lines: string[] = [
    '[IP 회피 지시 — 재생성]',
    '이전 초안에 다음 실존 IP/상표가 검출되어 재생성합니다:',
  ];
  for (const f of listed) {
    lines.push(`  - "${f.matched}" (공식명: ${f.entry.canonical}) → 다른 이름으로 치환`);
  }
  lines.push('');
  lines.push('지침:');
  lines.push('1. 위 이름들을 본문에 절대 사용하지 마십시오.');
  lines.push('2. 유사 개념은 세계관 고유 용어로 자체 네이밍하여 재작성하세요.');
  lines.push('3. ™·® 기호·저작권 문구 출력 금지.');

  return lines.join('\n');
}

/**
 * 재생성 시 AI에게 보낼 전체 프롬프트 수정본.
 * 원본 사용자 지시 + IP 회피 directive를 결합.
 */
export function applyIPAvoidanceToPrompt(originalPrompt: string, flags: readonly BrandFlag[]): string {
  const directive = buildIPAvoidanceDirective(flags);
  if (!directive) return originalPrompt;
  return `${originalPrompt}\n\n${directive}`;
}
