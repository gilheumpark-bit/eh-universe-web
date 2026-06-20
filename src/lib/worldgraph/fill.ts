// ============================================================
// WorldGraph FILL — chat(브레인스토밍) → WorldFact 양식 자동 채움 (Phase 1)
// "채팅에서 양식을 AI가 채우는" 흐름의 엔진. 격리: studio-types import 0.
// 두 경로: localFillDraft(결정론·키 없이 동작, 미리보기) / buildFillPrompt(실 AI 호출용).
// 채운 값은 provenance origin='ENGINE_DRAFT' (사람 수락 전 = 초안). _공통 원칙2(M4) 정합.
// ============================================================

import type { WorldFactEntry, WorldFactFrontMatter, WorldFactTier } from './types';

// ============================================================
// PART 1 — category 추론 (지침 35+ enum 의 결정론 키워드 매핑)
// ============================================================

const CATEGORY_HINTS: Array<{ re: RegExp; category: string }> = [
  { re: /마법|마나|주문|magic|mana|spell/i, category: 'magic' },
  { re: /길드|세력|진영|파벌|faction|guild/i, category: 'faction' },
  { re: /지역|장소|도시|대륙|location|city|region/i, category: 'location' },
  { re: /등급|랭크|시스템|각성|능력|rank|system|awakening|power/i, category: 'power_system' },
  { re: /종족|인종|race|species/i, category: 'race' },
  { re: /신|종교|신앙|deity|religion|god/i, category: 'religion' },
  { re: /역사|전쟁|사건|history|war|event/i, category: 'history_event' },
  { re: /화폐|경제|통화|currency|economy/i, category: 'currency' },
  { re: /금기|규칙|법칙|법|taboo|rule|law/i, category: 'rule' },
];

/** chatText 에서 category 추론. 매칭 없으면 'rule'(가장 일반). */
export function guessCategory(text: string): string {
  for (const h of CATEGORY_HINTS) if (h.re.test(text)) return h.category;
  return 'rule';
}

/** 첫 문장 추출(1문장 단언 후보) — . ! ? 。 또는 줄바꿈 기준. */
export function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return '';
  const m = t.split(/(?<=[.!?。])\s|\n/);
  return (m[0] || t).trim().slice(0, 300);
}

// ============================================================
// PART 2 — localFillDraft (키 없이 동작하는 결정론 초안)
// ============================================================

export interface FillOptions {
  workId?: string;
  domain?: string;
  /** 테스트/결정론용 주입 — 미제공 시 런타임에서 생성 */
  id?: string;
  now?: number;
}

/**
 * chat 브레인스토밍 → WorldFact 초안(ENGINE_DRAFT).
 * confidence 0.5 = HOLD (작가 확인 필요) — AI 초안은 자동 canon 아님.
 * 실 AI(generateJsonViaSpark) 미연결 시 미리보기로 흐름 시연.
 */
export function localFillDraft(chatText: string, opts: FillOptions = {}): WorldFactEntry {
  const now = opts.now ?? Date.now();
  const iso = new Date(now).toISOString();
  const id = opts.id ?? `fact_${now.toString(36)}`;
  const fact = firstSentence(chatText) || '[확인 필요] 단언을 입력하세요';

  const frontMatter: WorldFactFrontMatter = {
    id,
    workId: opts.workId ?? 'untitled',
    category: guessCategory(chatText),
    tier: 1 as WorldFactTier,
    fact,
    exceptions: [],
    classification: 'Public',
    confidence: 0.5, // HOLD — 작가 확인 전
    conflictsWith: [],
    sourceSentenceIds: [],
    arcsStatus: 'HOLD',
    createdAt: iso,
    updatedAt: iso,
  };

  return {
    frontMatter,
    bodyRaw: `## 본문\n\n${chatText.trim()}\n`,
    provenance: { origin: 'ENGINE_DRAFT', createdAt: now },
  };
}

// ============================================================
// PART 3 — buildFillPrompt (실 AI 호출용 — generateJsonViaSpark)
// ============================================================

/** AI 에게 WorldFact JSON 을 채우게 하는 프롬프트(구조화 생성용). 실 AI 경로에서 사용. */
export function buildFillPrompt(chatText: string, domain = '한국 웹소설'): string {
  return [
    `당신은 ${domain} 세계관 설계 보조다. 아래 작가의 브레인스토밍을 읽고 WorldFact 1건을 JSON 으로 채워라.`,
    `규칙: fact 는 검증 가능한 1문장 단언. category 는 35+ enum 중 1(magic/faction/location/power_system/rule/race/religion/history_event/currency 등).`,
    `tier 는 1(표면)·2(시스템)·3(형이상학) 중 1. 추측 금지 — 근거 없으면 confidence 를 낮춰라(0.5~0.7).`,
    `출력 JSON 키: id, workId, category, tier, fact, exceptions[], classification, confidence, createdAt, updatedAt.`,
    ``,
    `[작가 브레인스토밍]`,
    chatText.trim(),
  ].join('\n');
}

/** AI JSON 응답 → WorldFactEntry (provenance ENGINE_DRAFT 부여). 파싱 실패 시 null. */
export function parseAIFill(raw: string, chatText: string, now = Date.now()): WorldFactEntry | null {
  try {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const fm = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Partial<WorldFactFrontMatter>;
    if (!fm.fact || !fm.category) return null;
    const iso = new Date(now).toISOString();
    return {
      frontMatter: {
        id: String(fm.id ?? `fact_${now.toString(36)}`),
        workId: String(fm.workId ?? 'untitled'),
        category: String(fm.category),
        tier: (Number(fm.tier) === 2 ? 2 : Number(fm.tier) === 3 ? 3 : 1) as WorldFactTier,
        fact: String(fm.fact),
        exceptions: Array.isArray(fm.exceptions) ? fm.exceptions.map(String) : [],
        classification: fm.classification ?? 'Public',
        confidence: typeof fm.confidence === 'number' ? fm.confidence : 0.6,
        conflictsWith: [],
        sourceSentenceIds: [],
        arcsStatus: 'HOLD',
        createdAt: String(fm.createdAt ?? iso),
        updatedAt: iso,
      },
      bodyRaw: `## 본문\n\n${chatText.trim()}\n`,
      provenance: { origin: 'ENGINE_DRAFT', createdAt: now },
    };
  } catch {
    return null;
  }
}

// ============================================================
// PART 4 — 사람 커밋 (origin USER 승격 = canon 확정, M4 정합)
// ============================================================

/** 작가 확정: provenance origin → USER (canon), editedBy[] 에 전이 기록. 신규 lockHistory X. */
export function commitAsCanon(entry: WorldFactEntry, now = Date.now()): WorldFactEntry {
  const prevEdited = entry.provenance?.editedBy ?? [];
  return {
    ...entry,
    frontMatter: { ...entry.frontMatter, arcsStatus: 'PASS', updatedAt: new Date(now).toISOString() },
    provenance: {
      origin: 'USER',
      createdAt: entry.provenance?.createdAt ?? now,
      editedBy: [...prevEdited, { origin: 'USER', at: now }],
      sourceReferenceId: entry.provenance?.sourceReferenceId,
    },
  };
}
