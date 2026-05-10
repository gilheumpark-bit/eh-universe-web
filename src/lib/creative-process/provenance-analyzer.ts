// ============================================================
// Provenance Analyzer — `_4` 3축 점수 + Actor Profiles + Chronology
// ============================================================
//
// stitch_lore_guard `_4` Provenance Report 화면 backbone.
//
// 3 축 (forensic):
//   - Core Integrity    : 작가 직접 통제 비율 (HUMAN_DRAFT + HUMAN_REVISION)
//   - Narrative Drift   : AI 자동 변경 비율 (AI_DRAFT + AI_REWRITE) — 낮을수록 높음
//   - Control Density   : 작가 명시 결정 빈도 (accept + reject 카운트 기반)
//
// Active Actor Profiles:
//   - 각 actor (human / ai-model / collaborator) 별 이벤트 수·비율·최근 활동 시각
//
// Chronology:
//   - 시간순 events — 일자별 그룹 + originType 분포 stack
//
// Cryptographic Ledger:
//   - manuscriptHash · timelineHash · sourceSummaryHash · sealNumber
//   - report-builder 가 이미 생성한 cert 의 해시들을 row 로 직렬화
//
// 사상 정합:
//   - 4차 §1 "보증 X 기록 O"
//   - 14차 §3 "엄밀성 시장" — 정량 지표 + 디스클레이머 동시 노출
//
// [C] 안전성: 빈 events → 0/0/0 + status 'incomplete'
// [G] 성능: 단일 reduce, O(n)
// [K] 간결성: 단일 export analyzeProvenance()
// ============================================================

import type { CreativeEvent, CertificateLanguage } from './types';

// ============================================================
// PART 1 — 3축 결과
// ============================================================

export interface ProvenanceAxisScores {
  /** 0~100 — 작가 직접 통제 비율 */
  coreIntegrity: number;
  /** 0~100 — AI 자동 변경 비율 (낮을수록 좋음, drift) */
  narrativeDrift: number;
  /** 0~100 — 작가 명시 결정 빈도 */
  controlDensity: number;
}

export interface ProvenanceActor {
  actorType: 'human' | 'ai' | 'system' | 'collaborator';
  actorId: string;
  eventCount: number;
  /** 0~100 % share of total */
  share: number;
  /** ISO timestamp of latest event */
  lastActiveAt: string;
}

export interface ProvenanceChronologyDay {
  /** YYYY-MM-DD (UTC) */
  date: string;
  total: number;
  /** Origin 9종 카운트 */
  byOrigin: Record<string, number>;
}

export interface ProvenanceLedgerRow {
  label: string; // 4언어 라벨
  hash: string;
}

export interface ProvenanceReport {
  axes: ProvenanceAxisScores;
  actors: ProvenanceActor[];
  chronology: ProvenanceChronologyDay[];
  ledger: ProvenanceLedgerRow[];
  totalEvents: number;
  /** 산출 시각 ISO */
  computedAt: string;
}

// ============================================================
// PART 2 — Axis 산출
// ============================================================

function computeAxisScores(events: CreativeEvent[]): ProvenanceAxisScores {
  if (events.length === 0) {
    return { coreIntegrity: 0, narrativeDrift: 0, controlDensity: 0 };
  }

  // Core Integrity = human-driven / total
  const humanDriven = events.filter(
    (e) => e.originType === 'HUMAN_DRAFT' || e.originType === 'HUMAN_REVISION',
  ).length;
  const coreIntegrity = round1((humanDriven / events.length) * 100);

  // Narrative Drift = AI-driven / total
  const aiDriven = events.filter(
    (e) => e.originType === 'AI_DRAFT' || e.originType === 'AI_REWRITE',
  ).length;
  const narrativeDrift = round1((aiDriven / events.length) * 100);

  // Control Density = (accept + reject) / total — 작가 명시 결정 빈도
  const decisions = events.filter((e) => e.eventType === 'accept' || e.eventType === 'reject').length;
  const controlDensity = round1((decisions / events.length) * 100);

  return { coreIntegrity, narrativeDrift, controlDensity };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ============================================================
// PART 3 — Actor Profiling
// ============================================================

function computeActorProfiles(events: CreativeEvent[]): ProvenanceActor[] {
  if (events.length === 0) return [];

  // key = `${actorType}|${actorId}`
  const map = new Map<
    string,
    { actorType: 'human' | 'ai' | 'system' | 'collaborator'; actorId: string; count: number; latest: string }
  >();
  for (const e of events) {
    const key = `${e.actorType}|${e.actorId || 'unknown'}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (e.createdAt > existing.latest) existing.latest = e.createdAt;
    } else {
      map.set(key, {
        actorType: e.actorType,
        actorId: e.actorId || 'unknown',
        count: 1,
        latest: e.createdAt,
      });
    }
  }

  const total = events.length;
  const actors: ProvenanceActor[] = Array.from(map.values()).map((a) => ({
    actorType: a.actorType,
    actorId: a.actorId,
    eventCount: a.count,
    share: round1((a.count / total) * 100),
    lastActiveAt: a.latest,
  }));

  // share 큰 순 정렬
  actors.sort((a, b) => b.eventCount - a.eventCount);
  return actors;
}

// ============================================================
// PART 4 — Chronology (일자별)
// ============================================================

function computeChronology(events: CreativeEvent[]): ProvenanceChronologyDay[] {
  if (events.length === 0) return [];

  const days = new Map<string, ProvenanceChronologyDay>();
  for (const e of events) {
    let date: string;
    try {
      date = e.createdAt.slice(0, 10); // YYYY-MM-DD
    } catch {
      continue;
    }
    let entry = days.get(date);
    if (!entry) {
      entry = { date, total: 0, byOrigin: {} };
      days.set(date, entry);
    }
    entry.total += 1;
    entry.byOrigin[e.originType] = (entry.byOrigin[e.originType] ?? 0) + 1;
  }

  // 오름차순 정렬
  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// PART 5 — Ledger 조립
// ============================================================

function buildLedger(
  hashes: { manuscriptHash?: string; timelineHash?: string; sourceSummaryHash?: string; sealNumber?: string | null },
  language: CertificateLanguage,
): ProvenanceLedgerRow[] {
  const labels = LEDGER_LABELS[language];
  const rows: ProvenanceLedgerRow[] = [];
  if (hashes.manuscriptHash) rows.push({ label: labels.manuscript, hash: hashes.manuscriptHash });
  if (hashes.timelineHash) rows.push({ label: labels.timeline, hash: hashes.timelineHash });
  if (hashes.sourceSummaryHash) rows.push({ label: labels.sourceSummary, hash: hashes.sourceSummaryHash });
  if (hashes.sealNumber) rows.push({ label: labels.seal, hash: hashes.sealNumber });
  return rows;
}

const LEDGER_LABELS: Record<CertificateLanguage, { manuscript: string; timeline: string; sourceSummary: string; seal: string }> = {
  ko: { manuscript: '원고 해시', timeline: '타임라인 해시', sourceSummary: '출처 요약 해시', seal: 'Witness Seal' },
  en: { manuscript: 'Manuscript Hash', timeline: 'Timeline Hash', sourceSummary: 'Source Summary Hash', seal: 'Witness Seal' },
  ja: { manuscript: '原稿ハッシュ', timeline: 'タイムラインハッシュ', sourceSummary: '出典要約ハッシュ', seal: 'Witness Seal' },
  zh: { manuscript: '原稿哈希', timeline: '时间轴哈希', sourceSummary: '来源摘要哈希', seal: 'Witness Seal' },
};

// ============================================================
// PART 6 — 메인 export
// ============================================================

export interface AnalyzeProvenanceInput {
  events: CreativeEvent[];
  language: CertificateLanguage;
  hashes?: {
    manuscriptHash?: string;
    timelineHash?: string;
    sourceSummaryHash?: string;
    sealNumber?: string | null;
  };
}

export function analyzeProvenance(input: AnalyzeProvenanceInput): ProvenanceReport {
  return {
    axes: computeAxisScores(input.events),
    actors: computeActorProfiles(input.events),
    chronology: computeChronology(input.events),
    ledger: buildLedger(input.hashes ?? {}, input.language),
    totalEvents: input.events.length,
    computedAt: new Date().toISOString(),
  };
}

// ============================================================
// PART 7 — 4언어 Axis 라벨
// ============================================================

export const PROVENANCE_AXIS_LABELS = {
  ko: {
    coreIntegrity: { label: '핵심 무결성', desc: '작가 직접 통제 비율' },
    narrativeDrift: { label: '서사 표류', desc: 'AI 자동 변경 비율' },
    controlDensity: { label: '통제 밀도', desc: '작가 명시 결정 빈도' },
  },
  en: {
    coreIntegrity: { label: 'Core Integrity', desc: "Author's direct control share" },
    narrativeDrift: { label: 'Narrative Drift', desc: 'AI-driven change ratio' },
    controlDensity: { label: 'Control Density', desc: 'Author decision frequency' },
  },
  ja: {
    coreIntegrity: { label: '核心整合性', desc: '作者の直接管理比率' },
    narrativeDrift: { label: '叙述漂流', desc: 'AI自動変更比率' },
    controlDensity: { label: '管理密度', desc: '作者の明示的決定頻度' },
  },
  zh: {
    coreIntegrity: { label: '核心完整性', desc: '作者直接控制比率' },
    narrativeDrift: { label: '叙事漂移', desc: 'AI自动变更比率' },
    controlDensity: { label: '控制密度', desc: '作者明示决策频率' },
  },
} as const;
