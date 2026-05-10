// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// Symbol Index Builder — StoryConfig + Episode 본문에서 작품 전체 Symbol Table 빌드.
//
// 입력:
//   - StoryConfig (캐릭터·월드룰·아이템·스킬)
//   - EpisodeManuscript[] (본문 — 화수별 content)
//
// 출력: SymbolIndex (definitions Map + surfaceMap + byKind + hash)
//
// [C] 빈 입력 가드 (characters undefined / episodes 0개) — 빈 인덱스 반환
// [G] 단일 패스 — config 1회 순회 + episodes 1회 순회 (스캔은 별도 모듈)
// [K] 5종 SymbolKind 모두 처리, world 룰북 키워드 추출은 휴리스틱
// ============================================================

import type {
  StoryConfig,
  EpisodeManuscript,
  Character,
  Item,
  Skill,
} from '@/lib/studio-types';
import type {
  SymbolDefinition,
  SymbolIndex,
  SymbolKind,
  SymbolJumpTarget,
} from './types';

// ============================================================
// PART 2 — Helpers
// ============================================================

/** 단순 string hash — manuscriptHash 용. 충돌 0 보장 X (캐시 무효화 트리거만 필요) */
function quickHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** 표면형 정규화 — 공백 trim, 빈 문자열 거부 */
function normalizeSurface(s: string | undefined | null): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (trimmed.length < 2) return null; // 1글자는 매칭 노이즈 너무 큼
  return trimmed;
}

/** 별칭 추출 — 콤마/슬래시/(괄호) 분리 */
function extractAliases(rawAliases: string | undefined): string[] {
  if (!rawAliases) return [];
  return rawAliases
    .split(/[,\/(),、，]/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

// ============================================================
// PART 3 — Definition Builders (kind 별)
// ============================================================

/** 캐릭터 → SymbolDefinition. role/traits 를 definition 에 압축 */
function buildCharacterSymbols(characters: Character[] | undefined): SymbolDefinition[] {
  if (!characters || characters.length === 0) return [];
  return characters
    .map((c): SymbolDefinition | null => {
      const name = normalizeSurface(c.name);
      if (!name) return null;
      const aliases = extractAliases(c.appearance) // 외형/소개에서 별칭 추출 휴리스틱
        .filter((a) => a !== name);
      const definition = [
        c.role && `역할: ${c.role}`,
        c.traits && `특성: ${c.traits}`,
        c.desire && `욕망: ${c.desire}`,
        c.changeArc && `변화: ${c.changeArc}`,
      ]
        .filter(Boolean)
        .join(' · ');
      const jumpTarget: SymbolJumpTarget = { tab: 'characters', subId: c.id };
      return {
        id: `character:${c.id}`,
        kind: 'character',
        name,
        aliases,
        definition: definition || `캐릭터 — ${name}`,
        jumpTarget,
      };
    })
    .filter((s): s is SymbolDefinition => s !== null);
}

/** 아이템 → SymbolDefinition. category + description 압축 */
function buildItemSymbols(items: Item[] | undefined): SymbolDefinition[] {
  if (!items || items.length === 0) return [];
  return items
    .map((it): SymbolDefinition | null => {
      const name = normalizeSurface(it.name);
      if (!name) return null;
      const definition = [
        it.category && `종류: ${it.category}`,
        it.rarity && `희귀도: ${it.rarity}`,
        it.description,
      ]
        .filter(Boolean)
        .join(' · ');
      return {
        id: `item:${it.id}`,
        kind: 'item',
        name,
        aliases: [],
        definition: definition || `아이템 — ${name}`,
        episodeId: it.episode,
        jumpTarget: { tab: 'items', subId: it.id },
      };
    })
    .filter((s): s is SymbolDefinition => s !== null);
}

/** 스킬 → SymbolDefinition. type + description 압축 */
function buildSkillSymbols(skills: Skill[] | undefined): SymbolDefinition[] {
  if (!skills || skills.length === 0) return [];
  return skills
    .map((sk): SymbolDefinition | null => {
      const name = normalizeSurface(sk.name);
      if (!name) return null;
      const definition = [sk.type && `유형: ${sk.type}`, sk.description].filter(Boolean).join(' · ');
      return {
        // [Phase B fix — 2026-05-07] ID prefix 를 kind 와 일치 ('concept:').
        // 스킬은 추상 concept 으로 분류 — surfaceMap 매칭 일관성 보장.
        id: `concept:${sk.id}`,
        kind: 'concept',
        name,
        aliases: [],
        definition: definition || `스킬 — ${name}`,
        jumpTarget: { tab: 'skills', subId: sk.id },
      };
    })
    .filter((s): s is SymbolDefinition => s !== null);
}

/**
 * 세계관 → SymbolDefinition[].
 * StoryConfig 의 7~17개 world 필드(corePremise / culture / religion 등)에서
 * 고유명사 후보 추출. 휴리스틱: 「」 또는 ""로 묶인 명사 추출.
 */
function buildWorldSymbols(config: StoryConfig): SymbolDefinition[] {
  const worldFields: Array<[string, string | undefined]> = [
    ['core', config.corePremise],
    ['power', config.powerStructure],
    ['history', config.worldHistory],
    ['social', config.socialSystem],
    ['magic', config.magicTechSystem],
    ['faction', config.factionRelations],
    ['culture', config.culture],
    ['religion', config.religion],
    ['law', config.lawOrder],
  ];
  const extracted = new Map<string, SymbolDefinition>();
  for (const [field, val] of worldFields) {
    if (!val) continue;
    // 「」, "", 〈〉 안 명사 추출 — 흔한 한국어/일본어 인용 부호 패턴
    const matches = val.matchAll(/[「『〈"]([^」』〉"]{2,30})[」』〉"]/g);
    for (const m of matches) {
      const surface = normalizeSurface(m[1]);
      if (!surface) continue;
      const id = `place:world-${field}-${surface.slice(0, 20)}`;
      if (extracted.has(id)) continue;
      extracted.set(id, {
        id,
        kind: 'place',
        name: surface,
        aliases: [],
        definition: `세계관(${field}) — ${val.slice(0, 80)}…`,
        jumpTarget: { tab: 'world', subId: field },
      });
    }
  }
  return Array.from(extracted.values());
}

// ============================================================
// PART 4 — Public API: buildSymbolIndex
// ============================================================

/**
 * 작품 전체 → SymbolIndex 1회 빌드.
 *
 * 호출 측은 manuscript hash 변경 시점에만 재빌드 (`useSymbolIndex` 훅 참조).
 *
 * @param config StoryConfig — 캐릭터·아이템·스킬·월드 필드 추출
 * @param episodes 본문 (manuscriptHash 산출용)
 * @returns 빌드된 SymbolIndex
 */
export function buildSymbolIndex(
  config: StoryConfig | null | undefined,
  episodes: EpisodeManuscript[] | null | undefined,
): SymbolIndex {
  const empty = createEmptyIndex();
  if (!config) return empty;

  // 1. 5 종 builder 병합
  const allDefs: SymbolDefinition[] = [
    ...buildCharacterSymbols(config.characters),
    ...buildItemSymbols(config.items),
    ...buildSkillSymbols(config.skills),
    ...buildWorldSymbols(config),
  ];

  // 2. definitions Map + surfaceMap (별칭 포함)
  const definitions = new Map<string, SymbolDefinition>();
  const surfaceMap = new Map<string, string>(); // surface → symbolId
  for (const def of allDefs) {
    if (definitions.has(def.id)) continue; // 중복 ID 방어
    definitions.set(def.id, def);
    surfaceMap.set(def.name, def.id);
    for (const alias of def.aliases) {
      // 이미 다른 symbol 의 surface 면 skip — 이름 충돌 정책 (1차 정의 우선)
      if (surfaceMap.has(alias)) continue;
      surfaceMap.set(alias, def.id);
    }
  }

  // 3. byKind 그룹
  const byKind: Record<SymbolKind, SymbolDefinition[]> = {
    character: [],
    place: [],
    item: [],
    concept: [],
    event: [],
  };
  for (const def of definitions.values()) {
    byKind[def.kind].push(def);
  }

  // 4. manuscript hash — episodes content concat 1회 hash
  const manuscriptText = (episodes ?? [])
    .map((ep) => `${ep.episode}:${ep.content?.length ?? 0}`)
    .join('|');
  const manuscriptHash = quickHash(manuscriptText);

  return {
    definitions,
    surfaceMap,
    byKind,
    manuscriptHash,
    builtAt: new Date().toISOString(),
  };
}

/** 빈 SymbolIndex — config null 또는 빈 입력 시 반환 */
export function createEmptyIndex(): SymbolIndex {
  return {
    definitions: new Map(),
    surfaceMap: new Map(),
    byKind: { character: [], place: [], item: [], concept: [], event: [] },
    manuscriptHash: 'empty',
    builtAt: new Date().toISOString(),
  };
}
