// ============================================================
// PART 1 — Types
// StudioContext의 프로젝트 데이터 → 번역 스튜디오용 컨텍스트 매핑
// ============================================================

import type { StoryConfig, AppLanguage } from '@/lib/studio-types';

/** 번역 스튜디오용 캐릭터 (말투 프로필 추론 포함) */
export interface TranslationCharacter {
  name: string;
  aliases: string[];
  register?: {
    age?: string;
    role?: string;
    tone?: 'formal' | 'casual' | 'rough' | 'polite';
    speechHint?: string;
  };
}

/** 번역 용어집 항목 (locked 우선) */
export interface TranslationGlossaryEntry {
  source: string;
  target?: string;     // 이미 번역된 항목 (locked)
  category: 'character' | 'place' | 'item' | 'skill' | 'general';
  locked: boolean;
}

/** 번역 엔진에 주입되는 프로젝트 컨텍스트 묶음 */
export interface TranslationProjectContext {
  projectId: string;
  projectTitle: string;
  characters: TranslationCharacter[];
  worldBible: string;
  glossary: TranslationGlossaryEntry[];
  genre: string;
  recentEpisodes: Array<{ no: number; title: string; summary: string }>;
  /** 원문 언어 — translation 엔진의 sourceLang 기본값 */
  sourceLang?: AppLanguage;
}

/** 작품 프로젝트 호환 입력 — StoryConfig 기반 + Project 메타 + 옵션 source/episode */
export interface BridgeProjectInput {
  /** Project.id 또는 sessionId */
  id?: string;
  projectId?: string;
  /** Project.name (optional fallback to config.title) */
  title?: string;
  name?: string;
  /** StoryConfig 본체 (필수) */
  config?: Partial<StoryConfig>;
  /** lore 별칭 (호환용) */
  lore?: unknown;
  /** 현재 활성 화 번호 — recentEpisodes 컷오프 기준 */
  currentEpisodeNo?: number;
}

// ============================================================
// PART 2 — Pure extraction helpers
// 외부 객체는 모두 unknown으로 받아 typeof/Array.isArray 가드
// ============================================================

const WORLD_BIBLE_FIELDS = [
  'corePremise', 'powerStructure', 'currentConflict',
  'worldHistory', 'socialSystem', 'economy', 'magicTechSystem',
  'factionRelations', 'survivalEnvironment',
  'culture', 'religion', 'education', 'lawOrder', 'taboo',
  'dailyLife', 'travelComm', 'truthVsBeliefs',
] as const;

/**
 * StoryConfig 또는 임의 객체에서 worldBible 정보 추출 → Markdown 헤더 평탄화.
 * 최대 3000자로 절단 (recentEpisodes 길이와 균형 유지).
 */
export function serializeWorldBible(worldBible: unknown, maxChars = 3000): string {
  if (!worldBible) return '';
  if (typeof worldBible === 'string') return worldBible.slice(0, maxChars);

  try {
    const lines: string[] = [];
    if (typeof worldBible === 'object' && worldBible !== null) {
      const obj = worldBible as Record<string, unknown>;

      // StoryConfig 인지 감지: 알려진 worldBible 필드 추출 우선
      const isStoryConfig = WORLD_BIBLE_FIELDS.some(f => f in obj);
      if (isStoryConfig) {
        for (const key of WORLD_BIBLE_FIELDS) {
          const value = obj[key];
          if (typeof value === 'string' && value.trim()) {
            lines.push(`## ${key}\n${value.trim()}`);
          }
          if (lines.join('\n').length > maxChars) break;
        }
      } else {
        // 일반 객체: 모든 string/array 필드 평탄화
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && value.trim()) {
            lines.push(`## ${key}\n${value.trim()}`);
          } else if (Array.isArray(value)) {
            const items = value
              .filter(v => v !== null && v !== undefined)
              .map(v => `- ${typeof v === 'string' ? v : JSON.stringify(v)}`)
              .join('\n');
            if (items) lines.push(`## ${key}\n${items}`);
          }
          if (lines.join('\n').length > maxChars) break;
        }
      }
    }
    return lines.join('\n\n').slice(0, maxChars);
  } catch {
    return '';
  }
}

/**
 * Character 객체에서 번역용 register(말투 프로필) 추론.
 * StoryConfig.Character 스키마와 호환 (speechStyle, personality, traits 등 활용).
 */
export function inferRegisterFromProfile(
  character: unknown
): TranslationCharacter['register'] {
  if (!character || typeof character !== 'object') return undefined;
  const c = character as Record<string, unknown>;

  // SocialProfile 우선 — 명시 데이터 신뢰
  const socialProfile = (typeof c.socialProfile === 'object' && c.socialProfile !== null)
    ? c.socialProfile as Record<string, unknown>
    : null;

  const ageRegister = socialProfile && typeof socialProfile.ageRegister === 'string'
    ? socialProfile.ageRegister
    : undefined;
  const profession = socialProfile && typeof socialProfile.professionRegister === 'string'
    ? socialProfile.professionRegister
    : undefined;

  return {
    age: ageRegister
      ?? (typeof c.age === 'string' || typeof c.age === 'number' ? String(c.age) : undefined),
    role: profession
      ?? (typeof c.role === 'string' ? c.role : undefined),
    tone: inferTone(c),
    speechHint: typeof c.speechExample === 'string' && c.speechExample.trim()
      ? c.speechExample.slice(0, 200)
      : (typeof c.speechStyle === 'string' ? c.speechStyle : undefined),
  };
}

function inferTone(c: Record<string, unknown>): 'formal' | 'casual' | 'rough' | 'polite' | undefined {
  const speechStyle = typeof c.speechStyle === 'string' ? c.speechStyle : '';
  const personality = typeof c.personality === 'string' ? c.personality : '';
  const traits = typeof c.traits === 'string' ? c.traits : '';
  const raw = (speechStyle + ' ' + personality + ' ' + traits).toLowerCase();
  if (!raw.trim()) return undefined;
  if (/formal|격식|존댓말|정중한|예의/.test(raw)) return 'formal';
  if (/rough|거친|욕설|험|난폭|공격적/.test(raw)) return 'rough';
  if (/polite|정중|친절|예의바른/.test(raw)) return 'polite';
  if (/casual|반말|친근|편안|편한/.test(raw)) return 'casual';
  return undefined;
}

/**
 * 로컬 glossary와 프로젝트 glossary 병합. source 키 기준 deduplication.
 * 프로젝트 쪽이 우선 (신뢰도 높음, 기본 locked: true).
 */
export function mergeGlossaries(
  local: Array<{ source: string; target?: string; locked?: boolean }>,
  project: Array<{ source: string; target?: string; category?: string; locked?: boolean }>
): TranslationGlossaryEntry[] {
  const map = new Map<string, TranslationGlossaryEntry>();
  for (const l of local) {
    if (!l || typeof l.source !== 'string' || !l.source.trim()) continue;
    map.set(l.source, {
      source: l.source,
      target: typeof l.target === 'string' ? l.target : undefined,
      category: 'general',
      locked: l.locked === true,
    });
  }
  for (const p of project) {
    if (!p || typeof p.source !== 'string' || !p.source.trim()) continue;
    map.set(p.source, {
      source: p.source,
      target: typeof p.target === 'string' ? p.target : undefined,
      category: (p.category as TranslationGlossaryEntry['category']) ?? 'general',
      locked: p.locked === undefined ? true : p.locked === true,
    });
  }
  return Array.from(map.values());
}

/**
 * 캐릭터 이름 배열 → glossary 자동 추출 (locked).
 * 캐릭터 이름은 번역 시 절대 변경되면 안 됨.
 */
function namesToGlossary(
  names: Array<{ name: string }>
): Array<{ source: string; category: string; locked: boolean }> {
  return names
    .filter(c => typeof c?.name === 'string' && c.name.trim())
    .map(c => ({
      source: c.name.trim(),
      category: 'character',
      locked: true,
    }));
}

// ============================================================
// PART 3 — Main builder
// StoryConfig + Project 메타 → TranslationProjectContext
// ============================================================

const MAX_CHARACTERS = 30;
const MAX_WORLDBIBLE_CHARS = 3000;
const MAX_EPISODE_SUMMARY = 800;
const MAX_GLOSSARY_ENTRIES = 200;

/**
 * StoryConfig + Project 메타 → TranslationProjectContext.
 * TranslationPanel/TranslatorStudioApp이 이 함수를 호출하여 컨텍스트를 얻고
 * useTranslation에 전달한다.
 *
 * 입력 가드:
 * - project: null/undefined/non-object → null 반환
 * - projectId 미존재 → null 반환 (식별 불가)
 *
 * 길이 제한:
 * - characters: 30개
 * - worldBible: 3000자
 * - recentEpisodes: 5화 (옵션 조정 가능), 화당 800자
 * - glossary: 200개
 */
export function buildProjectTranslationContext(
  project: unknown,
  options: { currentEpisodeNo?: number; recentCount?: number; sourceLang?: AppLanguage } = {}
): TranslationProjectContext | null {
  if (!project || typeof project !== 'object') return null;
  const p = project as Record<string, unknown>;

  // projectId: id | projectId
  const projectId = typeof p.id === 'string' && p.id
    ? p.id
    : typeof p.projectId === 'string' && p.projectId
      ? p.projectId
      : '';
  if (!projectId) return null;

  // title: title | name | config.title
  const config = (typeof p.config === 'object' && p.config !== null)
    ? p.config as Record<string, unknown>
    : (p as Record<string, unknown>); // config 없으면 project 자체가 StoryConfig일 수도

  const projectTitle = typeof p.title === 'string' && p.title.trim()
    ? p.title
    : typeof p.name === 'string' && p.name.trim()
      ? p.name
      : typeof config.title === 'string'
        ? config.title
        : '';

  const recentCount = typeof options.recentCount === 'number' && options.recentCount > 0
    ? Math.min(options.recentCount, 20)
    : 5;

  // characters
  const rawCharacters = Array.isArray(config.characters) ? config.characters : [];
  const characters: TranslationCharacter[] = rawCharacters
    .slice(0, MAX_CHARACTERS)
    .map((c: unknown): TranslationCharacter => {
      const cr = (c && typeof c === 'object') ? c as Record<string, unknown> : {};
      const name = typeof cr.name === 'string' ? cr.name.trim() : '';
      const aliases = Array.isArray(cr.aliases)
        ? cr.aliases.filter((a: unknown): a is string => typeof a === 'string' && a.trim().length > 0)
        : [];
      return {
        name,
        aliases,
        register: inferRegisterFromProfile(c),
      };
    })
    .filter((c) => c.name);

  // glossary: 캐릭터 이름 자동 + 프로젝트 glossary + 로컬 glossary
  const projectGlossarySource = Array.isArray(config.translationConfig)
    ? []
    : (config.translationConfig && typeof config.translationConfig === 'object'
      ? (config.translationConfig as Record<string, unknown>).glossary
      : null);
  const projectGlossaryArr: Array<{ source: string; target?: string; category?: string; locked?: boolean }> =
    Array.isArray(projectGlossarySource) ? projectGlossarySource : [];

  const characterGlossary = namesToGlossary(characters);
  const merged = mergeGlossaries(
    loadLocalGlossary(),
    [...characterGlossary, ...projectGlossaryArr]
  ).slice(0, MAX_GLOSSARY_ENTRIES);

  // worldBible: StoryConfig 필드 직접 직렬화 (lore 별칭 fallback)
  const worldBibleSource = config.worldBible ?? p.lore ?? config;
  const worldBible = serializeWorldBible(worldBibleSource, MAX_WORLDBIBLE_CHARS);

  // recentEpisodes: manuscripts에서 currentEpisodeNo 기준 최근 N개 (이전 화)
  const manuscripts = Array.isArray(config.manuscripts) ? config.manuscripts : [];
  const cutoff = typeof options.currentEpisodeNo === 'number' ? options.currentEpisodeNo : Number.MAX_SAFE_INTEGER;

  const recentEpisodes = manuscripts
    .filter((e: unknown): e is { episode?: number; title?: string; summary?: string; content?: string } => {
      if (!e || typeof e !== 'object') return false;
      const er = e as Record<string, unknown>;
      const epNo = typeof er.episode === 'number' ? er.episode : 0;
      return epNo > 0 && epNo < cutoff;
    })
    .sort((a, b) => (b.episode ?? 0) - (a.episode ?? 0))
    .slice(0, recentCount)
    .map((e) => {
      const summarySource = typeof e.summary === 'string' && e.summary.trim()
        ? e.summary
        : typeof e.content === 'string' ? e.content : '';
      return {
        no: typeof e.episode === 'number' ? e.episode : 0,
        title: typeof e.title === 'string' ? e.title : '',
        summary: summarySource.slice(0, MAX_EPISODE_SUMMARY),
      };
    })
    .reverse(); // 시간순 (오름차순)

  return {
    projectId,
    projectTitle,
    characters,
    worldBible,
    glossary: merged,
    genre: typeof config.genre === 'string' ? config.genre : '',
    recentEpisodes,
    sourceLang: options.sourceLang,
  };
}

// ============================================================
// PART 4 — localStorage glossary persistence
// 번역 스튜디오 외부에서도 누적되는 사용자 용어집
// ============================================================

const LOCAL_GLOSSARY_KEY = 'noa_translation_glossary';

export function loadLocalGlossary(): Array<{ source: string; target?: string; locked?: boolean }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_GLOSSARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: unknown): p is { source: string; target?: string; locked?: boolean } => {
      if (!p || typeof p !== 'object') return false;
      const pr = p as Record<string, unknown>;
      return typeof pr.source === 'string' && pr.source.trim().length > 0;
    });
  } catch {
    return [];
  }
}

export function saveLocalGlossary(
  entries: Array<{ source: string; target?: string; locked?: boolean }>
): boolean {
  if (typeof window === 'undefined') return false;
  if (!Array.isArray(entries)) return false;
  try {
    const sanitized = entries
      .filter(e => e && typeof e.source === 'string' && e.source.trim())
      .slice(0, MAX_GLOSSARY_ENTRIES);
    localStorage.setItem(LOCAL_GLOSSARY_KEY, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=TranslationProjectContext
// IDENTITY_SEAL: PART-2 | role=ExtractHelpers | inputs=unknown | outputs=string,register,glossary[]
// IDENTITY_SEAL: PART-3 | role=ContextBuilder | inputs=project,options | outputs=TranslationProjectContext|null
// IDENTITY_SEAL: PART-4 | role=LocalStorage | inputs=entries[] | outputs=boolean
