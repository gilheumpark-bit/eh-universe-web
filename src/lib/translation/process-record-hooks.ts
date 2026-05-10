// ============================================================
// PART 1 — Module Header
// ============================================================
//
// process-record-hooks.ts — Translation 결과를 창작 과정 확인서에 자동 기록.
//
// 시장 분석 4차 §4 §"AI 사용 과정 기록" 직접 매핑:
//   "AI 사용 과정 기록 / 번역가 검토 / 작가 승인" 순서대로 process record 에 누적.
//
// Studio 의 creative-process 모듈을 dynamic import 로 호출 — 의존성 그래프 격리.
// 6 절대 금지 파일 (creative-process/types.ts 등) 0byte 변경.
//
// [C] 실패 silent — 번역 본 흐름 차단 X
// [G] dynamic import — bundle size 절감
// [K] 함수 4개 — recordDualTranslation / recordSegmentAdoption / recordAuthorSignoff / recordNCTReport
// ============================================================

import type { DualPipelineResult } from './dual-pipeline';
import type { TranslationSegmentAdoption } from './segment-adoption';
import type { NCTReport } from './ncg-nct';

// ============================================================
// PART 2 — 공통 헬퍼
// ============================================================

async function loadCreativeProcess() {
  return await import('@/lib/creative-process').catch(() => null);
}

function safeProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage?.getItem('noa_studio_currentProjectId') ?? null;
  } catch {
    return null;
  }
}

// ============================================================
// PART 3 — Hook 함수
// ============================================================

/**
 * Dual translation 완료 시 호출 — Faithful/Market 두 결과 모두 기록.
 */
export async function recordDualTranslation(
  result: DualPipelineResult,
  meta: {
    chapterName: string;
    chapterIndex: number;
    fromLang: string;
    toLang: string;
    provider: string;
  },
): Promise<void> {
  const cp = await loadCreativeProcess();
  const projectId = safeProjectId();
  if (!cp || !projectId) return;

  try {
    if (result.faithful) {
      const fHash = await cp.computeSha256Hex(result.faithful);
      const sourceId = await cp.recordSource({
        projectId,
        sourceType: 'ai_output',
        label: `[Faithful] ${meta.chapterName} (${meta.fromLang}→${meta.toLang})`,
        contentHash: fHash,
        provider: meta.provider,
        model: meta.provider,
        visibility: 'private',
      });
      await cp.recordCreativeEvent({
        projectId,
        targetType: 'manuscript',
        targetId: `dual-faithful-${meta.chapterIndex}-${Date.now()}`,
        eventType: 'create',
        actorType: 'ai',
        actorId: meta.provider,
        originType: 'AI_REWRITE',
        beforeHash: null,
        afterHash: fHash,
        sourceId,
        note: `Faithful track · ${meta.chapterName} · ${meta.fromLang}→${meta.toLang} · totalCalls=${result.totalCalls}`,
      });
    }
    if (result.market) {
      const mHash = await cp.computeSha256Hex(result.market);
      const sourceId = await cp.recordSource({
        projectId,
        sourceType: 'ai_output',
        label: `[Market] ${meta.chapterName} (${meta.fromLang}→${meta.toLang})`,
        contentHash: mHash,
        provider: meta.provider,
        model: meta.provider,
        visibility: 'private',
      });
      await cp.recordCreativeEvent({
        projectId,
        targetType: 'manuscript',
        targetId: `dual-market-${meta.chapterIndex}-${Date.now()}`,
        eventType: 'create',
        actorType: 'ai',
        actorId: meta.provider,
        originType: 'AI_REWRITE',
        beforeHash: null,
        afterHash: mHash,
        sourceId,
        note: `Market track · ${meta.chapterName} · ${meta.fromLang}→${meta.toLang} · totalCalls=${result.totalCalls}`,
      });
    }
  } catch { /* silent */ }
}

/**
 * 번역가 세그먼트 채택 시 호출 — 어떤 결과를 채택했는지 기록.
 */
export async function recordSegmentAdoption(
  segments: TranslationSegmentAdoption[],
  meta: { chapterName: string; chapterIndex: number; translatorId?: string },
): Promise<void> {
  const cp = await loadCreativeProcess();
  const projectId = safeProjectId();
  if (!cp || !projectId) return;

  try {
    const stats = {
      faithful: segments.filter((s) => s.action === 'faithful').length,
      market: segments.filter((s) => s.action === 'market').length,
      manual: segments.filter((s) => s.action === 'manual').length,
      pending: segments.filter((s) => s.action === 'pending').length,
    };
    await cp.recordCreativeEvent({
      projectId,
      targetType: 'manuscript',
      targetId: `segment-adoption-${meta.chapterIndex}-${Date.now()}`,
      eventType: 'edit',
      actorType: 'human',
      actorId: meta.translatorId ?? 'translator',
      originType: 'HUMAN_REVISION',
      beforeHash: null,
      afterHash: null,
      sourceId: undefined,
      note: `Segment adoption · ${meta.chapterName} · F=${stats.faithful} M=${stats.market} manual=${stats.manual} pending=${stats.pending}`,
    });
  } catch { /* silent */ }
}

/**
 * 작가 sign-off 시 호출 — Faithful archive 또는 Market publish 승인.
 */
export async function recordAuthorSignoff(
  meta: {
    chapterName: string;
    chapterIndex: number;
    track: 'faithful' | 'market';
    authorId?: string;
  },
): Promise<void> {
  const cp = await loadCreativeProcess();
  const projectId = safeProjectId();
  if (!cp || !projectId) return;

  try {
    await cp.recordCreativeEvent({
      projectId,
      targetType: 'manuscript',
      targetId: `signoff-${meta.track}-${meta.chapterIndex}-${Date.now()}`,
      eventType: 'edit',
      actorType: 'human',
      actorId: meta.authorId ?? 'author',
      originType: 'HUMAN_REVISION',
      beforeHash: null,
      afterHash: null,
      sourceId: undefined,
      note: `Author sign-off · ${meta.track} track · ${meta.chapterName}`,
    });
  } catch { /* silent */ }
}

/**
 * NCT 실행 결과 기록 — 출판 권장 결정 trail.
 */
export async function recordNCTReport(
  report: NCTReport,
  meta: { chapterName: string; chapterIndex: number },
): Promise<void> {
  const cp = await loadCreativeProcess();
  const projectId = safeProjectId();
  if (!cp || !projectId) return;

  try {
    const summary = `NCT · ${meta.chapterName} · recommendation=${report.recommendation} · faithful=${report.faithful?.status ?? 'n/a'} · market=${report.market?.status ?? 'n/a'} · glossary-misses=${report.glossaryMisses.length}`;
    await cp.recordCreativeEvent({
      projectId,
      targetType: 'manuscript',
      targetId: `nct-${meta.chapterIndex}-${Date.now()}`,
      eventType: 'edit',
      actorType: 'system',
      actorId: 'ncg-nct',
      originType: 'SYSTEM_GENERATED',
      beforeHash: null,
      afterHash: null,
      sourceId: undefined,
      note: summary,
    });
  } catch { /* silent */ }
}
