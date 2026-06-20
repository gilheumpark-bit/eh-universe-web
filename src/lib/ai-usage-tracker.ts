// ============================================================
// PART 1 — Types & Constants
// ============================================================
//
// AI Usage Tracker — localStorage 기반 AI 사용 메타데이터 추적기.
// Amazon KDP / Apple Books / Royal Road 등의 AI 라벨 의무 공개 대응.
//
// - 프로젝트 ID 단위로 AI 생성/번역/리라이트 이벤트를 누적 기록
// - Export 시 buildAIDisclosure()로 4개 언어 고지문 생성
// - opt-out 토글(noa_ai_disclosure_enabled)로 비활성 가능 (기본 on)
//
// 저장 포맷: localStorage `noa_ai_usage_<projectId>` → JSON(AIUsageRecord)
// ============================================================

import { logger } from './logger';
import type { AppLanguage } from './studio-types';

/** AI 이벤트 종류 — translation/rewrite는 보조 기여, generation은 본문 기여 */
export type AIUsageEventType = 'generation' | 'translation' | 'rewrite';

/** 누적 AI 사용 요약 — UI/Export 양쪽에서 소비 */
export interface AIUsageMetadata {
  hasAIAssist: boolean;
  hasAITranslation: boolean;
  /** AI 생성 비율 추정 (0-100). generation 기여 × 계수 / 작품 추정 분량 */
  assistPercentage: number;
  /** 사용된 provider slug 목록 — 예: ['gemini', 'claude', 'dgx-qwen'] */
  providers: string[];
  firstUsedAt?: string;
  lastUsedAt?: string;
}

/** 내부 저장 스키마 — counters + last/first timestamp */
interface AIUsageRecord {
  providers: Record<string, number>;   // provider → 호출 횟수
  generationCount: number;
  translationCount: number;
  rewriteCount: number;
  charsGenerated: number;
  charsTotal: number;                  // 작품 총 분량(갱신 시)
  firstUsedAt?: string;
  lastUsedAt?: string;
}

const STORAGE_PREFIX = 'noa_ai_usage_';
const DISCLOSURE_FLAG_KEY = 'noa_ai_disclosure_enabled';

function emptyRecord(): AIUsageRecord {
  return {
    providers: {},
    generationCount: 0,
    translationCount: 0,
    rewriteCount: 0,
    charsGenerated: 0,
    charsTotal: 0,
  };
}

function readRecord(projectId: string): AIUsageRecord {
  if (typeof window === 'undefined') return emptyRecord();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + projectId);
    if (!raw) return emptyRecord();
    const parsed = JSON.parse(raw) as Partial<AIUsageRecord>;
    return { ...emptyRecord(), ...parsed, providers: parsed.providers ?? {} };
  } catch (err) {
    logger.warn('ai-usage-tracker', `read failed for ${projectId}`, err);
    return emptyRecord();
  }
}

function writeRecord(projectId: string, rec: AIUsageRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(rec));
  } catch (err) {
    // quota exceeded / private browsing — silently degrade
    logger.warn('ai-usage-tracker', `write failed for ${projectId}`, err);
  }
}

// ============================================================
// PART 2 — Public API (record / get / clear)
// ============================================================

/** AI 이벤트 1건 기록. 시그니처 변경 없이 훅에서 한 줄 호출 */
export function recordAIUsage(
  projectId: string,
  event: {
    type: AIUsageEventType;
    provider: string;
    charsGenerated?: number;
  },
): void {
  if (!projectId || !event?.type || !event?.provider) return;

  const rec = readRecord(projectId);
  const now = new Date().toISOString();

  // provider 정규화 (lowercase, 공백 제거)
  const provider = String(event.provider).toLowerCase().trim();
  if (provider) {
    rec.providers[provider] = (rec.providers[provider] ?? 0) + 1;
  }

  if (event.type === 'generation') rec.generationCount += 1;
  else if (event.type === 'translation') rec.translationCount += 1;
  else if (event.type === 'rewrite') rec.rewriteCount += 1;

  const chars = Math.max(0, Math.floor(event.charsGenerated ?? 0));
  if (chars > 0) rec.charsGenerated += chars;

  if (!rec.firstUsedAt) rec.firstUsedAt = now;
  rec.lastUsedAt = now;

  writeRecord(projectId, rec);
}

/** 작품 총 분량 업데이트 — assistPercentage 정확도 향상용 (선택 호출) */
export function updateProjectTotalChars(projectId: string, totalChars: number): void {
  if (!projectId) return;
  const rec = readRecord(projectId);
  rec.charsTotal = Math.max(0, Math.floor(totalChars));
  writeRecord(projectId, rec);
}

/** Export/UI가 소비할 요약 메타데이터 */
export function getAIUsageForProject(projectId: string): AIUsageMetadata {
  const rec = readRecord(projectId);
  const providers = Object.keys(rec.providers);
  const denom = rec.charsTotal > 0 ? rec.charsTotal : rec.charsGenerated;
  // [C] 분모 0 가드 + 100% 상한
  const pct = denom > 0
    ? Math.min(100, Math.round((rec.charsGenerated / denom) * 100))
    : (rec.generationCount > 0 ? 100 : 0);

  return {
    hasAIAssist: rec.generationCount > 0 || rec.rewriteCount > 0,
    hasAITranslation: rec.translationCount > 0,
    assistPercentage: pct,
    providers,
    firstUsedAt: rec.firstUsedAt,
    lastUsedAt: rec.lastUsedAt,
  };
}

/** 프로젝트 삭제 시 호출 */
export function clearAIUsage(projectId: string): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + projectId);
  } catch (err) {
    logger.warn('ai-usage-tracker', `clear failed for ${projectId}`, err);
  }
}

// ============================================================
// PART 3 — Disclosure toggle + 4-language disclosure text builder
// ============================================================

/** 사용자가 AI 고지문 삽입을 켜두었는지 여부 (기본 true). */
export function isDisclosureEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(DISCLOSURE_FLAG_KEY);
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

export function setDisclosureEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCLOSURE_FLAG_KEY, enabled ? '1' : '0');
  } catch (err) {
    logger.warn('ai-usage-tracker', 'setDisclosureEnabled failed', err);
  }
}

/** provider 목록을 display string으로 포맷 — 빈 배열이면 'AI' fallback */
function formatProviders(providers: string[]): string {
  if (!providers || providers.length === 0) return 'AI';
  return providers.join(', ');
}

/** Export 시 삽입할 4개 언어 고지문 */
export function buildAIDisclosure(meta: AIUsageMetadata, lang: AppLanguage): string {
  const provStr = formatProviders(meta.providers);
  const disclosures: Record<AppLanguage, string> = {
    KO: `\n---\n[AI 사용 고지]\n이 작품의 집필 과정에서 AI(${provStr})가 사용되었습니다. 번역 및 품질 검수에 AI 도구가 활용되었으며, 최종 저작물은 작가의 창의적 기여와 편집을 거쳐 완성되었습니다. (Loreguard로 제작)\n`,
    EN: `\n---\n[AI Use Disclosure]\nAI tools (${provStr}) were used in the creation of this work, including translation and quality review. The final work reflects the author's creative contribution and editing. (Made with Loreguard)\n`,
    JP: `\n---\n[AI使用開示]\n本作品の制作にはAI(${provStr})が使用されました。翻訳および品質チェックにAIツールが活用され、最終作品は作家の創造的貢献と編集によって完成されています。(Loreguardで制作)\n`,
    CN: `\n---\n[AI 使用声明]\n本作品创作过程使用了AI工具（${provStr}），包括翻译和质量审核。最终作品反映了作者的创造性贡献和编辑。（使用 Loreguard 制作）\n`,
  };
  return disclosures[lang] ?? disclosures.KO;
}

/** EPUB `<meta>` 태그용 요약 (dc 확장) */
export function buildEpubAIMetaTags(meta: AIUsageMetadata): string[] {
  if (!meta.hasAIAssist && !meta.hasAITranslation) return [];
  const tags: string[] = [];
  tags.push(`    <meta name="ai-generated" content="true"/>`);
  if (meta.providers.length > 0) {
    const esc = meta.providers.map(p => p.replace(/[<>&"]/g, '')).join(', ');
    tags.push(`    <meta name="ai-providers" content="${esc}"/>`);
  }
  if (meta.hasAITranslation) {
    tags.push(`    <meta name="ai-translated" content="true"/>`);
  }
  return tags;
}
