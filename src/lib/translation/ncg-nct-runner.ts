// ============================================================
// PART 1 — Module Header
// ============================================================
//
// ncg-nct-runner.ts — NCG 사전 게이트 + NCT 사후 검증 dialog 통합 runner.
//
// 이전: TranslatorStudioApp.tsx runDualTranslate 안에 inline (60+ LOC).
// 수정: 모듈 함수로 추출 — alert/confirm 만 DI, 나머지 self-contained.
//
// 역할:
//   - runPreflightNCG — block 시 alert + 중단 / warn 시 confirm
//   - persistNCGReport / persistNCTReport — localStorage + customEvent dispatch
//
// [C] try/catch 모두 silent — 본 흐름 차단 X
// [K] 단일 책임 — NCG/NCT runner 만 (UI/state 무관)
// [G] dynamic import — 초기 번들 영향 0
// ============================================================

import { normalizeLang } from './lang-utils';
import type { NCGReport, NCTReport, NCGViolation } from './ncg-nct';

// ============================================================
// PART 2 — Types
// ============================================================

type DialogAlert = (message: string) => Promise<void>;
type DialogConfirm = (message: string, title?: string) => Promise<boolean>;

export type NCGTrack = 'faithful' | 'market' | 'dual';

export interface PreflightNCGInput {
  source: string;
  from: string;
  to: string;
  track: NCGTrack;
  alert: DialogAlert;
  confirm: DialogConfirm;
}

export interface PreflightNCGResult {
  /** true = 번역 계속, false = 사용자가 중단 */
  proceed: boolean;
  /** NCG 보고서 — 후속 NCT 와 병합 가능 (null = 모듈 로드 실패) */
  report: NCGReport | null;
}

// ============================================================
// PART 3 — Pre-flight runner
// ============================================================

/**
 * 번역 전 NCG 사전 게이트.
 * - block: alert 후 proceed=false
 * - warn:  confirm 후 사용자 응답 따라 proceed
 * - pass:  proceed=true
 *
 * NCG 모듈 로드 실패 (network 등) 시 silent → proceed=true (본 흐름 차단 X).
 */
export async function runPreflightNCG(input: PreflightNCGInput): Promise<PreflightNCGResult> {
  try {
    const ncgMod = await import('./ncg-nct');
    const report = ncgMod.runNCG({
      source: input.source,
      srcLang: normalizeLang(input.from),
      tgtLang: normalizeLang(input.to),
      glossary: [],
      track: input.track,
    });
    persistNCGReport(report);

    if (report.decision === 'block') {
      const lines = report.violations.map((v: NCGViolation) => `- ${v.message.ko}`).join('\n');
      await input.alert(`NCG 사전 게이트 차단:\n\n${lines}\n\nLLM 호출을 건너뜁니다.`);
      return { proceed: false, report };
    }

    if (report.decision === 'warn') {
      const lines = report.violations.map((v: NCGViolation) => `- ${v.message.ko}`).join('\n');
      const proceed = await input.confirm(`NCG 경고 (계속 가능):\n\n${lines}\n\n계속 진행할까요?`, 'NCG 경고');
      return { proceed, report };
    }

    return { proceed: true, report };
  } catch {
    // NCG 모듈 로드 실패 — silent. 본 흐름 차단 X.
    return { proceed: true, report: null };
  }
}

// ============================================================
// PART 4 — Persistence helpers
// ============================================================

const NCG_KEY = 'noa_translator_lastNCG';
const NCT_KEY = 'noa_translator_lastNCT';
const UPDATE_EVENT = 'noa:translator-ncg-nct-updated';

export function persistNCGReport(report: NCGReport): void {
  try { localStorage.setItem(NCG_KEY, JSON.stringify(report)); } catch { /* quota */ }
}

export function persistNCTReport(report: NCTReport): void {
  try { localStorage.setItem(NCT_KEY, JSON.stringify(report)); } catch { /* quota */ }
}

export function dispatchNCGNCTUpdate(): void {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(UPDATE_EVENT)); } catch { /* */ }
}
