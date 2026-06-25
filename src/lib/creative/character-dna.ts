// ============================================================
// character-dna — Truby 캐릭터 DNA Tier 1/2/3 (창작 지침 03_세계관캐릭 흡수)
// 순수 TS 함수. React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (Tier 1/2/3 + 필수 필드 메타)
// ============================================================

/** Tier 1 — 캐릭터의 뼈대. 4필드 모두 필수. */
export interface CharacterDNATier1 {
  /** 이름 */
  name: string;
  /** 욕망(desire) — 의식적으로 추구하는 목표 */
  desire: string;
  /** 유령(ghost) — 과거의 상처/트라우마 */
  ghost: string;
  /** 약점(weakness) — 극을 통해 극복할 결함 */
  weakness: string;
}

/** Tier 2 — 캐릭터의 내면. 4필드 모두 필수. */
export interface CharacterDNATier2 {
  /** 필요(need) — 본인은 모르지만 진짜 필요한 것 */
  need: string;
  /** 가치관 목록 */
  values: string[];
  /** 목소리 지문(voiceFingerprint) — 말투/어휘/리듬 특징 */
  voiceFingerprint: string;
  /** 변화 곡선(arc) — 시작→끝 변화 요약 */
  arc: string;
}

/** Tier 3 — 선택적 심화. 관계/비밀/시그니처 대사. */
export interface CharacterDNATier3 {
  relationships: string[];
  secrets: string[];
  signaturePhrases: string[];
}

/** Truby 캐릭터 DNA 전체 구조 */
export interface CharacterDNA {
  tier1: CharacterDNATier1;
  tier2: CharacterDNATier2;
  tier3?: CharacterDNATier3;
}

/** validateDNA 결과 */
export interface DNAValidation {
  /** 비어 있는 필수 필드 경로 목록 (예: 'tier1.name') */
  missing: string[];
  /** 필수 필드가 모두 채워졌으면 true */
  ok: boolean;
}

// Tier 1 필수 문자열 필드 (순서 고정 — missing 경로 안정성)
const TIER1_FIELDS = ['name', 'desire', 'ghost', 'weakness'] as const;
// Tier 2 필수 필드 (values 는 배열이라 별도 처리)
const TIER2_STRING_FIELDS = ['need', 'voiceFingerprint', 'arc'] as const;
// 완성도 계산용 전체 필수 슬롯 수 = tier1 4 + tier2 4 = 8
const TOTAL_REQUIRED_SLOTS = 8;

// ============================================================
// PART 2 — 생성/검증 (empty / validate / completeness)
// ============================================================

/** 빈 DNA 생성. 가변 기본인수 회피 위해 매 호출 신규 객체 반환. */
export function emptyCharacterDNA(): CharacterDNA {
  return {
    tier1: { name: '', desire: '', ghost: '', weakness: '' },
    tier2: { need: '', values: [], voiceFingerprint: '', arc: '' },
  };
}

/** 문자열이 실질적으로 채워졌는지 (null/undefined/공백 방어) */
function isFilled(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}

/** 배열이 1개 이상 비어있지 않은 항목을 가졌는지 */
function hasFilledItem(arr: unknown): boolean {
  return Array.isArray(arr) && arr.some(isFilled);
}

/**
 * 필수 필드(tier1 4 + tier2 4) 검증.
 * null/부분 입력 방어. 누락 경로를 missing 에 수집.
 */
export function validateDNA(dna: CharacterDNA | null | undefined): DNAValidation {
  const missing: string[] = [];
  // null/비객체 가드 — 모든 필수 슬롯을 누락 처리
  if (!dna || typeof dna !== 'object') {
    for (const f of TIER1_FIELDS) missing.push(`tier1.${f}`);
    for (const f of TIER2_STRING_FIELDS) missing.push(`tier2.${f}`);
    missing.push('tier2.values');
    return { missing, ok: false };
  }

  const t1 = dna.tier1;
  for (const f of TIER1_FIELDS) {
    if (!t1 || !isFilled(t1[f])) missing.push(`tier1.${f}`);
  }

  const t2 = dna.tier2;
  for (const f of TIER2_STRING_FIELDS) {
    if (!t2 || !isFilled(t2[f])) missing.push(`tier2.${f}`);
  }
  if (!t2 || !hasFilledItem(t2.values)) missing.push('tier2.values');

  return { missing, ok: missing.length === 0 };
}

/**
 * 완성도 0~100 %.
 * 필수 8슬롯(tier1 4 + tier2 4) 중 채워진 비율. 0분모 없음(상수 8 고정).
 */
export function dnaCompleteness(dna: CharacterDNA | null | undefined): number {
  const { missing } = validateDNA(dna);
  // missing 은 최대 8개(필수 슬롯). 채워진 슬롯 = 8 - 누락.
  const filled = TOTAL_REQUIRED_SLOTS - Math.min(missing.length, TOTAL_REQUIRED_SLOTS);
  return Math.round((filled / TOTAL_REQUIRED_SLOTS) * 100);
}

// ============================================================
// PART 3 — 프롬프트 직렬화 (dnaToPromptBlock)
// ============================================================

/** 한 줄 항목 — 값이 있을 때만 추가 (빈 줄 누출 방지) */
function line(label: string, value: unknown, out: string[]): void {
  if (isFilled(value)) out.push(`- ${label}: ${(value as string).trim()}`);
}

/** 배열 항목 — 비어있지 않은 항목만 콤마 결합 */
function listLine(label: string, arr: unknown, out: string[]): void {
  if (Array.isArray(arr)) {
    const items = arr.filter(isFilled).map((s) => (s as string).trim());
    if (items.length > 0) out.push(`- ${label}: ${items.join(', ')}`);
  }
}

/**
 * 집필 주입용 프롬프트 블록 생성.
 * null/부분 입력 방어 — 채워진 필드만 출력. 비면 안내 문구 반환.
 */
export function dnaToPromptBlock(dna: CharacterDNA | null | undefined): string {
  if (!dna || typeof dna !== 'object') return '[캐릭터 DNA 없음]';

  const out: string[] = [];
  const t1 = dna.tier1;
  if (t1 && typeof t1 === 'object') {
    line('이름', t1.name, out);
    line('욕망(Desire)', t1.desire, out);
    line('유령(Ghost)', t1.ghost, out);
    line('약점(Weakness)', t1.weakness, out);
  }

  const t2 = dna.tier2;
  if (t2 && typeof t2 === 'object') {
    line('필요(Need)', t2.need, out);
    listLine('가치관(Values)', t2.values, out);
    line('목소리 지문(Voice)', t2.voiceFingerprint, out);
    line('변화 곡선(Arc)', t2.arc, out);
  }

  const t3 = dna.tier3;
  if (t3 && typeof t3 === 'object') {
    listLine('관계(Relationships)', t3.relationships, out);
    listLine('비밀(Secrets)', t3.secrets, out);
    listLine('시그니처 대사(Signature)', t3.signaturePhrases, out);
  }

  if (out.length === 0) return '[캐릭터 DNA 없음]';
  return `[캐릭터 DNA]\n${out.join('\n')}`;
}
