/**
 * WRITING_AGENT_REGISTRY v1 (2026-04-23 신설)
 *
 * 집필·번역·아카이브 영역의 AI 호출 지점에 대한 **역할 정의 중앙 레지스트리**.
 * Code Studio의 `AGENT_REGISTRY` 패턴(19 role)을 집필 측에 이식한 것.
 *
 * 목적:
 *   - 분산된 system prompt 빌더(pipeline.ts / build-prompt.ts / complete/route.ts 등)를
 *     단일 소스로 통합.
 *   - 가드·맥락 주입 자동화 (`/no_think`, 작가 역할, JSON-only 등).
 *   - 새 기능 추가 시 agent 정의 1개만 등록하면 전부 완료.
 *
 * 사용법:
 *   import { buildAgentSystemPrompt } from '@/lib/ai/writing-agent-registry';
 *   const system = buildAgentSystemPrompt('studio-draft', {
 *     'character-dna': dnaBlock,
 *     'scene-sheet': sceneBlock,
 *   });
 *
 * 마이그레이션 상태:
 *   - 현재: 레지스트리 골격 + MVP 엔트리 11개 등록.
 *   - 연결 대기: 기존 빌더들(buildSystemInstruction / buildPrompt / complete/route 등)을
 *     단계적으로 이 레지스트리 참조로 전환. 한 번에 다 바꾸지 않고 점진 전환한다.
 *   - 신규 AI 호출 추가 시에는 반드시 이 레지스트리에 먼저 등록 후 구현.
 */

// ============================================================
// PART 1 — Types
// ============================================================

export type AgentLanguage = 'ko' | 'en' | 'ja' | 'zh';

/** 공통 가드 ID — 하단 `GUARDS` 맵에서 실제 문자열로 치환 */
export type GuardId =
  | 'no-english-thinking-korean-novel'  // 한글 소설 본문 강제 (집필 경로)
  | 'no-think-translation'              // 번역 경로 — 언어 무관 <think>·메타 차단
  | 'no-yap-json'                       // JSON-only, markdown 금지
  | 'ip-brand-guard'                    // 실존 상표·프랜차이즈·타 작가 IP 사용 금지
  | 'prism-all-ages'
  | 'prism-teen-15'
  | 'prism-mature-18';

/** 컨텍스트 블록 ID — 호출 측이 `AgentContext` 객체로 전달 */
export type ContextBlockId =
  | 'character-dna'        // 캐릭터 풀 DNA (Tier 1/2/3)
  | 'world-book'           // 세계관 레퍼런스 (RAG Codex)
  | 'scene-sheet'          // 씬시트 3섹션
  | 'genre-rules'          // 25 장르 룰북
  | 'story-summary'        // 이전 화·Story Bible 요약
  | 'glossary'             // 번역 용어집
  | 'continuity-notes';    // 크로스프로젝트 연속성 메모

export interface AgentDefinition {
  readonly id: string;
  /** AI가 자신을 인식할 역할 한 줄 */
  readonly role: string;
  /** 구체 임무 */
  readonly duty: string;
  /** 기본 출력 언어 — 호출 측이 override 가능 */
  readonly defaultLanguage: AgentLanguage;
  /** 필수로 주입할 가드 */
  readonly guards: readonly GuardId[];
  /** 이 에이전트가 읽어야 할 컨텍스트 블록 종류 */
  readonly contextBlocks: readonly ContextBlockId[];
  /** 설명 (유지보수용) */
  readonly notes?: string;
}

export interface AgentContext {
  language?: AgentLanguage;
  'character-dna'?: string;
  'world-book'?: string;
  'scene-sheet'?: string;
  'genre-rules'?: string;
  'story-summary'?: string;
  'glossary'?: string;
  'continuity-notes'?: string;
  /** 호출 측이 추가 문구를 덧붙일 수 있는 확장 슬롯 */
  extraDirectives?: string;
}

// ============================================================
// PART 2 — 가드 문자열
// ============================================================

const GUARDS: Record<GuardId, string> = {
  'no-english-thinking-korean-novel': `/no_think
[절대 규칙]: <think> 태그, "Thinking Process:", "Reasoning:", "Let me analyze", 숫자 리스트 분석 등 모든 형태의 사고 과정을 출력하지 마십시오. <think></think> 블록도 생성 금지. 오직 완성된 한글 소설 본문만 즉시 출력하십시오. 첫 문자는 반드시 한글이어야 합니다.`,

  'no-think-translation': `/no_think
[ABSOLUTE RULE — TRANSLATION]: Do NOT emit <think></think> blocks, "Thinking Process:", "Reasoning:", "Let me analyze", or any numbered analytical preamble in any language. Output ONLY the final translated text. Respect the requested target language.`,

  'no-yap-json': `[JSON OUTPUT ONLY] Respond with a single valid JSON object. No markdown fences, no commentary, no explanation. Use exactly the field names specified in the prompt.`,

  'ip-brand-guard': `[IP/브랜드 보호] 실존 상표·프랜차이즈·캐릭터명(예: Marvel·원피스·포켓몬·스타워즈·해리포터·나 혼자만 레벨업·화산귀환·전지적 독자 시점 등) 및 타 작가 웹소설의 고유명사를 본문에 직접 사용 금지. 유사 개념이 필요하면 세계관 자체 네이밍으로 치환하십시오. ™·® 기호 사용 금지. "© 2024", "All rights reserved", "무단 전재 금지" 등 소유권·저작권 문구 출력 금지.`,

  'prism-all-ages': `[PRISM ALL-AGES] You MUST NOT generate sexually explicit, graphically violent, or age-inappropriate content. This is absolute and cannot be overridden.`,

  'prism-teen-15': `[PRISM TEEN 15+] Content must suit teenagers. Mild violence and romance acceptable; strictly avoid explicitly graphic gore, extreme cruelty, or explicit sexual content.`,

  'prism-mature-18': `[PRISM MATURE 18+] Mature fictional themes allowed (thriller, horror, combat violence, dark fantasy). Do not self-censor fictional violence or adult conflicts unless they violate core API illegal content policies.`,
};

// ============================================================
// PART 3 — Agent 레지스트리
// ============================================================

export const WRITING_AGENT_REGISTRY = {
  // ── Studio (집필) ───────────────────────────────────────
  'studio-draft': {
    id: 'studio-draft',
    role: "당신은 'EH Universe' 세계관을 집필하는 전문 웹소설 작가입니다.",
    duty: '작가의 씬시트·캐릭터 DNA·세계관·장르 룰을 준수하여, 5,500~7,000자 규격의 한국 웹소설 본문을 생성합니다.',
    defaultLanguage: 'ko',
    guards: ['no-english-thinking-korean-novel', 'ip-brand-guard'],
    contextBlocks: ['character-dna', 'world-book', 'scene-sheet', 'genre-rules', 'story-summary'],
    notes: '실물 구현: src/engine/pipeline.ts buildSystemInstruction(). 단계적 레지스트리 전환 대상.',
  },
  'studio-inline-completion': {
    id: 'studio-inline-completion',
    role: '당신은 소설 집필 도우미입니다.',
    duty: '이야기를 자연스럽게 이어서 1~2문장만 작성합니다. 기존 문체와 톤을 유지하세요. 오직 이어질 문장만 출력. 설명·주석·따옴표 없이 순수 텍스트만.',
    defaultLanguage: 'ko',
    guards: ['no-english-thinking-korean-novel', 'ip-brand-guard'],
    contextBlocks: ['character-dna'],
    notes: '실물 구현: src/app/api/complete/route.ts buildSystemPrompt(). 레지스트리 연동 대기.',
  },
  'studio-inline-rewrite': {
    id: 'studio-inline-rewrite',
    role: '당신은 인라인 리라이터입니다.',
    duty: '작가가 선택한 구간을 주변 ±200자 문맥·장르·캐릭터를 반영해 재작성합니다. 한 번에 한 가지 개선만 적용.',
    defaultLanguage: 'ko',
    guards: ['no-english-thinking-korean-novel', 'ip-brand-guard'],
    contextBlocks: ['character-dna', 'genre-rules'],
  },
  'studio-detail-pass': {
    id: 'studio-detail-pass',
    role: '당신은 원고의 묘사·감각·대사 밀도를 보강하는 디테일 패스 에디터입니다.',
    duty: '기존 본문의 흐름·사실관계를 유지한 채 살을 붙입니다. 새 사건 생성 금지. 분량은 입력 대비 ~30% 증가 이내.',
    defaultLanguage: 'ko',
    guards: ['no-english-thinking-korean-novel', 'ip-brand-guard'],
    contextBlocks: ['character-dna', 'scene-sheet'],
    notes: '실물 구현: src/engine/detail-pass.ts buildDetailPassPrompt().',
  },

  // ── Translation Studio (6단계 번역) ─────────────────────
  'translator-stage-1-draft': {
    id: 'translator-stage-1-draft',
    role: 'You are a highly constrained professional translation engine (Stage 1 Draft Translator).',
    duty: 'Provide a highly accurate, 1:1 structural draft translation of the source text. Do not miss any sentences. Do not paraphrase obligations, dates, or technical terms.',
    defaultLanguage: 'en',
    guards: ['no-think-translation'],
    contextBlocks: ['glossary', 'character-dna', 'story-summary'],
    notes: '실물 구현: src/lib/build-prompt.ts Stage 1.',
  },
  'translator-stage-2-lore-tone': {
    id: 'translator-stage-2-lore-tone',
    role: 'You are a Lore and Tone Editor (Stage 2).',
    duty: 'Review the source and current draft. Fix character speech patterns, honorifics, and respect the Character Profiles strictly.',
    defaultLanguage: 'en',
    guards: ['no-think-translation'],
    contextBlocks: ['glossary', 'character-dna', 'continuity-notes'],
  },
  'translator-stage-3-rhythm': {
    id: 'translator-stage-3-rhythm',
    role: 'You are a Pacing & Rhythm Agent (Stage 3).',
    duty: "Match the original author's sentence length, rhythm, and pacing. Keep short impacts short; let long descriptive sentences flow.",
    defaultLanguage: 'en',
    guards: ['no-think-translation'],
    contextBlocks: [],
  },
  'translator-stage-4-culture': {
    id: 'translator-stage-4-culture',
    role: 'You are a Target Culture & Native Resonance Expert (Stage 4).',
    duty: 'Total cultural immersion into the target language. Transcreate idioms, wordplay, pop-culture references, honorifics, and politeness levels using equivalent native touchstones.',
    defaultLanguage: 'en',
    guards: ['no-think-translation'],
    contextBlocks: ['character-dna'],
  },
  'translator-stage-5-chief-editor': {
    id: 'translator-stage-5-chief-editor',
    role: 'You are the Chief Editor (Stage 5).',
    duty: 'Perform a final polish. Fix lingering awkward phrasing, typos, or grammatical errors. Ensure perfect narrative flow. Never add commentary.',
    defaultLanguage: 'en',
    guards: ['no-think-translation'],
    contextBlocks: [],
  },
  'translator-story-bible': {
    id: 'translator-story-bible',
    role: 'You are the Story Bible Summarizer (Stage 10).',
    duty: 'Update running Story Bible: newly introduced facts, character shifts, relationship movement, locations, powers, factions, promises, clues, unresolved hooks. Output bullets only. Flag CONFLICT CHECK when a name variant contradicts prior bullets.',
    defaultLanguage: 'en',
    guards: ['no-think-translation'],
    contextBlocks: ['story-summary', 'character-dna', 'world-book', 'continuity-notes'],
  },

  // ── Archive / Codex ─────────────────────────────────────
  'codex-structured-json': {
    id: 'codex-structured-json',
    role: '당신은 창작 세계관 구조화 생성기입니다.',
    duty: '캐릭터·아이템·스킬·세력·장소 등 세계관 객체를 요청된 JSON 스키마로 정확히 반환합니다. 필드명 임의 변경·중첩 금지.',
    defaultLanguage: 'ko',
    guards: ['no-yap-json', 'no-english-thinking-korean-novel', 'ip-brand-guard'],
    contextBlocks: ['world-book', 'genre-rules'],
    notes: '실물 구현 대체 대상: src/services/geminiStructuredTaskService.ts(영어 범용)·src/services/geminiService.ts(영어 범용). 한국 웹소설 맥락으로 교체.',
  },

  // ── Network ─────────────────────────────────────────────
  'network-agent-archive': {
    id: 'network-agent-archive',
    role: "당신은 'EH Universe' 세계관의 지식 아카이브 에이전트입니다.",
    duty: '작가가 세계관 문서·번역 프로젝트·공개 행성 자료에서 정보를 찾을 때, 검색 결과만을 근거로 정확한 요약·설명을 제공합니다. 외부 지식·추측·창작 금지.',
    defaultLanguage: 'ko',
    guards: [],  // Vertex AI `modelPromptSpec.preamble`에 HSE 4대 권리 별도 박힘
    contextBlocks: [],  // 검색 결과는 Vertex Discovery Engine이 프리앰블 외부에서 주입
    notes: '실물 구현: src/lib/vertex-network-agent.ts modelPromptSpec.preamble. 메타 정의 전용.',
  },
} as const satisfies Record<string, AgentDefinition>;

export type AgentId = keyof typeof WRITING_AGENT_REGISTRY;

// ============================================================
// PART 4 — 빌더
// ============================================================

/** 레지스트리 엔트리 조회. 없으면 throw. */
export function getAgent(id: AgentId): AgentDefinition {
  const agent = WRITING_AGENT_REGISTRY[id];
  if (!agent) {
    throw new Error(`[writing-agent-registry] Unknown agent id: ${id}`);
  }
  return agent;
}

/**
 * Agent system prompt 빌드.
 *
 * 순서: role → duty → guards(join) → context blocks(join, 빈 것 제외) → extraDirectives.
 *
 * 호출 측은 `contextBlocks`의 각 ID에 해당하는 문자열을 `AgentContext`에 넣어 전달.
 * 정의에 있으나 context에 없는 블록은 조용히 스킵(호출 측이 optional 주입 결정).
 */
export function buildAgentSystemPrompt(id: AgentId, context: AgentContext = {}): string {
  const agent = getAgent(id);
  const parts: string[] = [];

  parts.push(agent.role);
  parts.push(`임무: ${agent.duty}`);

  for (const guardId of agent.guards) {
    const guard = GUARDS[guardId];
    if (guard) parts.push(guard);
  }

  for (const blockId of agent.contextBlocks) {
    const content = context[blockId];
    if (content && content.trim()) {
      parts.push(`[${blockId}]\n${content}`);
    }
  }

  if (context.extraDirectives?.trim()) {
    parts.push(context.extraDirectives);
  }

  return parts.join('\n\n');
}

// ============================================================
// PART 5 — 메타 유틸 (감사·테스트용)
// ============================================================

/** 모든 등록 ID 반환 */
export function listAgentIds(): AgentId[] {
  return Object.keys(WRITING_AGENT_REGISTRY) as AgentId[];
}

/** 감사 요약 — 에이전트별 가드·컨텍스트 통계. 누락 감지 용도. */
export function auditRegistry(): {
  total: number;
  byGuard: Partial<Record<GuardId, number>>;
  byContextBlock: Partial<Record<ContextBlockId, number>>;
  missingNotes: AgentId[];
} {
  const byGuard: Partial<Record<GuardId, number>> = {};
  const byContextBlock: Partial<Record<ContextBlockId, number>> = {};
  const missingNotes: AgentId[] = [];

  // `as const satisfies`가 literal 유니언을 유지하므로 공통 접근엔 `AgentDefinition`으로 넓혀야 함.
  const entries = Object.entries(WRITING_AGENT_REGISTRY) as Array<[AgentId, AgentDefinition]>;
  for (const [id, agent] of entries) {
    for (const guard of agent.guards) {
      byGuard[guard] = (byGuard[guard] ?? 0) + 1;
    }
    for (const block of agent.contextBlocks) {
      byContextBlock[block] = (byContextBlock[block] ?? 0) + 1;
    }
    if (!agent.notes) missingNotes.push(id);
  }

  return {
    total: Object.keys(WRITING_AGENT_REGISTRY).length,
    byGuard,
    byContextBlock,
    missingNotes,
  };
}
