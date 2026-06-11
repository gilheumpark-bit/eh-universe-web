// WorldGraph Phase 0 — serializer round-trip + 결정론 검증 + store 레코드.
// fixture = 지침(_template_world-fact.md) 포맷 정합 합성 데이터 (일반 placeholder, 소설 인스턴스 아님).
import { parseWorldFact, serializeWorldFact, roundTripStable } from '../worldfact-serializer';
import { validateWorldFact } from '../validate';
import { toStoreRecord, WORLDGRAPH_DB_VERSION, WORLDGRAPH_STORES } from '../worldfact-db-schema';

// ── 합성 fixture 1: magic + sandersonCheck (중첩 구조) ──
const FIXTURE_MAGIC = `---
id: fact_001
workId: example-01
category: magic
tier: 2
tierRationale: "작동 원리 — 마나 소비 체계"
themeLink: null
fact: "마법은 시전자의 마나를 소비하며 고갈 시 발동 불가하다."
exceptions:
  - "유물 매개 시 외부 마나로 대체"
sandersonCheck:
  applicable: true
  magicSystemType: hard
  limitations:
    - activation_cost: "발동당 마나 10 소비"
    - cooldown: "재발동 3초"
  introduced_at_episode: 5
  used_for_resolution_episodes: []
  depth_facts_count: 3
classification: Public
classificationRationale: "공개 룰"
publicAtEpisode: 0
spoilerImpact: low
confidence: 0.85
conflictsWith: []
sourceSentenceIds:
  - "doc_001:s_12"
arcsStatus: PASS
createdAt: "2026-06-06T00:00:00Z"
updatedAt: "2026-06-06T00:00:00Z"
---

## 본문

마법은 마나라는 내적 자원을 소비한다.

## 관련 fact 링크

- 보강: fact_002 (마나 회복)
`;

// ── 합성 fixture 2: 최소 rule (권장 필드 일부 누락) ──
const FIXTURE_MINIMAL = `---
id: fact_010
workId: example-01
category: rule
tier: 1
fact: "이 세계의 통화는 금화 단위로 거래된다."
confidence: 0.6
---

## 본문

기본 경제 규칙.
`;

// ── 합성 fixture 2b: 본문에 --- 구분선 + ```yaml §확장 fence (실 WorldFact 본문 구조) ──
const FIXTURE_BODY_EDGE = `---
id: fact_030
workId: example-01
category: faction
tier: 3
fact: "두 세력은 100년 전쟁 이후 영구 적대 관계에 놓였다."
confidence: 0.8
conflictsWith: []
sourceSentenceIds:
  - "doc_001:s_40"
arcsStatus: PASS
createdAt: "2026-06-06T00:00:00Z"
updatedAt: "2026-06-06T00:00:00Z"
---

## 본문

세력 관계 설명.

---

## §확장

\`\`\`yaml
faction_interaction_matrix:
  factions: [A, B]
  relations:
    - pair: [A, B]
      type: enmity
      intensity: 90
\`\`\`

## [셀프 검증]

\`\`\`
- 총점: 85/100
\`\`\`
`;

// ── 합성 fixture 3: statement 누락 (검증 negative) ──
const FIXTURE_NO_FACT = `---
id: fact_020
workId: example-01
category: location
tier: 1
confidence: 0.4
---

본문 없음.
`;

describe('worldfact-serializer — round-trip (Phase 0 게이트)', () => {
  it('magic fixture: parse→serialize→parse 의미 무손실', () => {
    expect(roundTripStable(FIXTURE_MAGIC)).toBe(true);
  });

  it('minimal fixture: round-trip 무손실', () => {
    expect(roundTripStable(FIXTURE_MINIMAL)).toBe(true);
  });

  it('본문 --- 구분선 + ```yaml §확장 fence 보존 (실 WorldFact 본문 구조)', () => {
    expect(roundTripStable(FIXTURE_BODY_EDGE)).toBe(true);
    const e = parseWorldFact(FIXTURE_BODY_EDGE);
    expect(e.bodyRaw).toContain('faction_interaction_matrix');
    expect(e.bodyRaw).toContain('## [셀프 검증]');
    expect(e.bodyRaw).toContain('---'); // 본문 내 구분선 보존
    // front-matter는 첫 블록만 — 본문 §확장 yaml은 content로 verbatim 보존
    expect(e.frontMatter.id).toBe('fact_030');
  });

  it('front-matter 필드 정확 파싱 (중첩 sandersonCheck 포함)', () => {
    const e = parseWorldFact(FIXTURE_MAGIC);
    expect(e.frontMatter.id).toBe('fact_001');
    expect(e.frontMatter.workId).toBe('example-01');
    expect(e.frontMatter.category).toBe('magic');
    expect(e.frontMatter.tier).toBe(2);
    expect(e.frontMatter.sandersonCheck?.applicable).toBe(true);
    expect(e.frontMatter.sandersonCheck?.limitations?.length).toBe(2);
    expect(e.frontMatter.exceptions).toEqual(['유물 매개 시 외부 마나로 대체']);
  });

  it('본문(bodyRaw) verbatim 보존 (## 본문 · 관련 fact)', () => {
    const e = parseWorldFact(FIXTURE_MAGIC);
    expect(e.bodyRaw).toContain('## 본문');
    expect(e.bodyRaw).toContain('## 관련 fact 링크');
    expect(e.bodyRaw).toContain('fact_002');
  });

  it('serialize → 재파싱 시 front-matter 객체 동등(toEqual, 순서 무관)', () => {
    const a = parseWorldFact(FIXTURE_MAGIC);
    const b = parseWorldFact(serializeWorldFact(a));
    expect(b.frontMatter).toEqual(a.frontMatter);
  });
});

describe('worldfact validate — 결정론 룰', () => {
  it('정상 fixture: confidence PASS, block/high 위반 0', () => {
    const v = validateWorldFact(parseWorldFact(FIXTURE_MAGIC));
    expect(v.confidenceGate).toBe('PASS');
    expect(v.ok).toBe(true);
  });

  it('minimal: confidence HOLD (0.5-0.7), sourceSentenceIds 누락 high', () => {
    const v = validateWorldFact(parseWorldFact(FIXTURE_MINIMAL));
    expect(v.confidenceGate).toBe('HOLD');
    expect(v.violations.some((x) => x.field === 'sourceSentenceIds' && x.severity === 'high')).toBe(true);
  });

  it('fact 누락 + confidence<0.5: high 위반 + DISCARD', () => {
    const v = validateWorldFact(parseWorldFact(FIXTURE_NO_FACT));
    expect(v.confidenceGate).toBe('DISCARD');
    expect(v.ok).toBe(false);
    expect(v.violations.some((x) => x.field === 'fact')).toBe(true);
  });
});

describe('worldfact-db-schema — store 레코드 + SSOT 상수', () => {
  it('toStoreRecord: 핵심 필드 비정규화', () => {
    const r = toStoreRecord(parseWorldFact(FIXTURE_MAGIC));
    expect(r.id).toBe('fact_001');
    expect(r.workId).toBe('example-01');
    expect(r.category).toBe('magic');
    expect(r.tier).toBe(2);
    expect(r.entry.frontMatter.fact).toContain('마나');
  });

  it('SSOT 상수: 버전 1, world_facts store 단일', () => {
    expect(WORLDGRAPH_DB_VERSION).toBe(1);
    expect(WORLDGRAPH_STORES).toEqual(['world_facts']);
  });
});
