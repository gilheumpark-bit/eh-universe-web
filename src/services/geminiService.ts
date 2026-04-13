// ============================================================
// PART 0: IMPORTS & TYPES
// Story streaming uses lib/ai-providers.ts (multi-provider).
// This file handles:
//   (1) story stream orchestration with engine
//   (2) Gemini structured generation via server route
// ============================================================

import { logger } from '@/lib/logger';
import { MODEL_PLANNER, MODEL_ACTOR, MODEL_GENERAL } from '@/lib/dgx-models';
import { StoryConfig, Character, Item, Skill, MagicSystem, AppLanguage, Message } from "../lib/studio-types";
import { PlatformType } from "../engine/types";
import { buildSystemInstruction, buildUserPrompt, postProcessResponse } from "../engine/pipeline";
import type { EngineReport } from "../engine/types";
import { streamChat, getApiKey, getApiKeyAsync, getActiveModel, getPreferredModel, getActiveProvider, hasStoredApiKey, hasDgxService, ChatMsg } from "../lib/ai-providers";

/** 동기 getApiKey가 빈 문자열이면 비동기로 재시도 */
async function getApiKeyFallback(providerId: 'gemini'): Promise<string> {
  const sync = getApiKey(providerId);
  if (sync) return sync;
  try { return await getApiKeyAsync(providerId); } catch (err) { logger.warn('geminiService', 'API key fallback failed:', err); return ''; }
}
import { HISTORY_LIMITS, truncateMessages } from "../lib/token-utils";

export interface GenerateOptions {
  previousContent?: string;
  language?: AppLanguage;
  signal?: AbortSignal;
  platform?: PlatformType;
  history?: Message[];
  temperature?: number;
  /** Story Bible — 망각 방지 동적 컨텍스트 (시스템 프롬프트에 append) */
  storyBible?: string;
  /** DGX 멀티에이전트: 특정 모델 강제 지정 (예: 'abliterated') */
  model?: string;
}

export interface GenerateResult {
  content: string;
  report: EngineReport;
}

function getStructuredModel(): string {
  // 자동생성(캐릭터/세계관/연출/아이템)은 flash로 속도 우선
  // 집필(스트리밍)은 사용자 선택 모델(pro) 유지
  const userModel = getPreferredModel('gemini');
  // 사용자가 명시적으로 pro를 선택했어도 structured는 flash 사용
  if (userModel.includes('pro')) return 'gemini-2.5-flash';
  return userModel;
}

// 5분 TTL 메모리 캐시 — 동일 요청 반복 호출 방지
const structuredCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const STRUCTURED_FETCH_TIMEOUT_MS = 120_000; // 프론트→Vercel: 넉넉히 120초 (Vercel maxDuration=60이 실제 제한)

// Clean stale cache entries every 60 seconds
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of structuredCache) {
      if (now - val.ts > CACHE_TTL) structuredCache.delete(key);
    }
  }, 60_000);
}

/** Phase 3A: task별 DGX 멀티에이전트 모델 라우팅 */
function getDgxModelForTask(task: string): string {
  switch (task) {
    case 'characters': return MODEL_ACTOR;               // eva — 캐릭터 빙의/대사
    case 'items':
    case 'skills':
    case 'worldDesign':
    case 'worldSim':
    case 'sceneDirection': return MODEL_PLANNER;          // r1 — 기획/논리
    default: return MODEL_GENERAL;                        // qwen — 범용
  }
}

/** 프론트엔드에서 DGX 직접 호출 — Vercel 60초 제한 우회 */
async function fetchStructuredViaDgx<T>(body: Record<string, unknown>, cacheable: boolean, cacheKey: string): Promise<T> {
  const sparkUrl = process.env.NEXT_PUBLIC_SPARK_SERVER_URL || '';
  const TASK_PROMPTS: Record<string, (b: Record<string, unknown>) => string> = {
    worldDesign: (b) => `Generate a unique ${b.genre || 'fantasy'} story concept in ${b.language === 'KO' ? 'Korean' : 'English'}. Return JSON with fields: title, povCharacter, setting, primaryEmotion, synopsis, corePremise, powerStructure, currentConflict. 2-3 sentences per field.${b.hints ? `\nHints: ${JSON.stringify(b.hints)}` : ''}`,
    characters: (b) => `Generate ${b.count || 4} characters for a ${(b.config as Record<string,string>)?.genre || 'fantasy'} story in ${b.language === 'KO' ? 'Korean' : 'English'}. Return JSON array with: name, role, traits, speechStyle, backstory. ${b.existingNames ? `Avoid names: ${b.existingNames}` : ''}`,
    worldSim: (b) => `Simulate world dynamics for: ${b.synopsis}. Genre: ${b.genre}. Return JSON with civilizations and relations arrays. ${b.language === 'KO' ? 'Korean' : 'English'}.`,
    sceneDirection: (b) => `Generate scene direction for: ${b.synopsis}. Characters: ${b.characters}. Return JSON with hooks, emotionTargets, dialogueTones. ${b.language === 'KO' ? 'Korean' : 'English'}.`,
    items: (b) => `Generate ${b.count || 3} items for ${(b.config as Record<string,string>)?.genre || 'fantasy'} story. Return JSON array with: name, category, rarity, description, effect. ${b.language === 'KO' ? 'Korean' : 'English'}.`,
    skills: (b) => `Generate skills for ${(b.config as Record<string,string>)?.genre || 'fantasy'} story. Return JSON array with: name, type, description, cooldown. ${b.language === 'KO' ? 'Korean' : 'English'}.`,
    magicSystems: (b) => `Generate magic system for ${(b.config as Record<string,string>)?.genre || 'fantasy'} story. Return JSON with: name, source, rules, limitations, schools. ${b.language === 'KO' ? 'Korean' : 'English'}.`,
  };
  const taskKey = body.task as string;
  const promptFn = TASK_PROMPTS[taskKey];
  if (!promptFn) throw new Error(`Unknown task: ${taskKey}`);
  const prompt = promptFn(body);

  const dgxModel = getDgxModelForTask(taskKey);
  const res = await fetch(`${sparkUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: dgxModel,
      messages: [
        { role: 'system', content: 'You are a creative writing assistant. Always respond with valid JSON only, no markdown or explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
      stream: false,
    }),
    signal: AbortSignal.timeout(95_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const isHtml = errText.trimStart().startsWith('<!') || errText.trimStart().startsWith('<html');
    throw new Error(isHtml ? `DGX 연결 오류 (${res.status})` : errText.slice(0, 150));
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/) || text.match(/(\[[\s\S]*\])/);
  let result: T;
  try {
    result = JSON.parse(jsonMatch ? jsonMatch[1] : text) as T;
  } catch {
    result = {} as T;
  }
  if (cacheable && cacheKey) structuredCache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

async function fetchStructuredGemini<T>(body: Record<string, unknown>): Promise<T> {
  // Phase 3A: DGX 멀티에이전트 라우팅 — task별 전문 모델로 직접 호출
  if (hasDgxService()) {
    const taskKey = (body.task as string) || '';
    const cacheable = taskKey === 'worldDesign' || taskKey === 'worldSim' || taskKey === 'sceneDirection';
    const cacheKey = cacheable ? JSON.stringify(body) : '';
    if (cacheable) {
      const cached = structuredCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T;
    }
    return fetchStructuredViaDgx<T>(body, cacheable, cacheKey);
  }

  // 프로바이더 자동 감지: LM Studio/Ollama가 등록되어 있으면 해당 프로바이더로 라우팅
  const activeProvider = getActiveProvider();
  const isLocal = activeProvider === 'lmstudio' || activeProvider === 'ollama';
  const provider = isLocal ? activeProvider : 'gemini';
  const model = isLocal ? 'local-model' : getStructuredModel();
  const apiKey = isLocal
    ? (getApiKey(activeProvider) || undefined)
    : (getApiKey('gemini') || await getApiKeyFallback('gemini') || undefined);

  const payload = JSON.stringify({
    ...body,
    provider,
    model,
    apiKey,
  });

  // 캐시 히트 체크 (캐릭터 생성 등 랜덤성 있는 task는 제외)
  const cacheable = body.task === 'worldDesign' || body.task === 'worldSim' || body.task === 'sceneDirection';
  const cacheKey = cacheable ? payload : '';
  if (cacheable) {
    const cached = structuredCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data as T;
  }

  const endpoint = '/api/gemini-structured';

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(STRUCTURED_FETCH_TIMEOUT_MS),
      body: payload,
    });
  } catch (err) {
    throw err;
  }

  const data = await response.json().catch(() => null);
  if (response.ok) {
    if (cacheable && cacheKey) structuredCache.set(cacheKey, { data, ts: Date.now() });
    return data as T;
  }

  const errorMessage = data && typeof data.error === 'string'
    ? data.error
    : `Structured Gemini error ${response.status}`;

  throw new Error(errorMessage);
}

// ============================================================
// PART 1: HISTORY BUILDER
// ============================================================

function buildChatMessages(
  history: Message[],
  currentUserPrompt: string,
  systemInstruction: string
): ChatMsg[] {
  const allMsgs: ChatMsg[] = [];
  const capped = history.slice(-HISTORY_LIMITS.STORAGE);

  for (const msg of capped) {
    if (msg.role === 'assistant' && !msg.content) continue;
    let text = msg.content;
    if (msg.role === 'assistant') {
      text = text.replace(/```json\n[\s\S]*?\n```/g, '').trim();
      if (!text) continue;
    }
    allMsgs.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: text,
    });
  }

  const model = getActiveModel();
  const { messages: trimmed } = truncateMessages(systemInstruction, allMsgs, model);
  trimmed.push({ role: 'user', content: currentUserPrompt });
  return trimmed;
}

// ============================================================
// PART 2: MAIN STREAM — SERVER PROXY
// ============================================================

export const generateStoryStream = async (
  config: StoryConfig,
  draft: string,
  onChunk: (text: string) => void,
  options: GenerateOptions = {}
): Promise<GenerateResult> => {
  const language = options.language ?? 'KO';
  const platform = options.platform ?? config.platform ?? PlatformType.MOBILE;
  const temperature = options.temperature ?? parseFloat(localStorage.getItem('noa_temperature') || '0.9');

  const baseSystem = buildSystemInstruction(config, language, platform, config.simulatorRef?.ruleLevel);
  const systemInstruction = options.storyBible
    ? `${baseSystem}\n\n${options.storyBible}`
    : baseSystem;
  const userPrompt = buildUserPrompt(config, draft, {
    previousContent: options.previousContent,
    language,
  });

  const history = options.history ?? [];
  const messages = history.filter((message) => message.content).length > 0
    ? buildChatMessages(history, userPrompt, systemInstruction)
    : [{ role: 'user' as const, content: userPrompt }];

  try {
    const fullContent = await streamChat({
      systemInstruction,
      messages,
      temperature,
      signal: options.signal,
      onChunk,
      model: options.model,
    });

    const { content, report } = postProcessResponse(fullContent, config, language, platform);
    return { content, report };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    logger.error('geminiService', 'Story Generation Error:', error);
    throw error;
  }
};

// ============================================================
// PART 3: CHARACTER GENERATION
// ============================================================

export const generateCharacters = async (
  config: StoryConfig,
  language: AppLanguage = 'KO',
  count: number = 4,
): Promise<Character[]> => {
  const existingNames = (config.characters || []).map(c => c.name).filter(Boolean);
  const results = await fetchStructuredGemini<unknown[]>({
    task: 'characters',
    config: {
      genre: config.genre,
      synopsis: config.synopsis,
    },
    genre: config.genre,
    setting: config.synopsis?.slice(0, 200),
    language,
    count,
    existingNames,
  });

  if (!Array.isArray(results)) return [];

  return results
    .filter((character): character is Omit<Character, 'id'> => {
      return Boolean(
        character
        && typeof character === 'object'
        && typeof (character as Character).name === 'string'
      );
    })
    .map((character) => {
      const VALID_ROLES = ['hero', 'villain', 'ally', 'extra'];
      const rawRole = ((character as Character).role || 'extra').toLowerCase();
      const normalizedRole = VALID_ROLES.includes(rawRole) ? rawRole : 'extra';
      return {
        ...character,
        role: normalizedRole,
        id: `c-${Date.now()}-${Math.random()}`,
      };
    });
};

// ============================================================
// PART 4: WORLD DESIGN GENERATION
// ============================================================

export const generateWorldDesign = async (
  genre: string,
  language: AppLanguage = 'KO',
  hints?: { title?: string; povCharacter?: string; setting?: string; primaryEmotion?: string; synopsis?: string; subGenreTags?: string[]; narrativeIntensity?: string; totalEpisodes?: number; platform?: string }
): Promise<{
  title: string;
  povCharacter: string;
  setting: string;
  primaryEmotion: string;
  synopsis: string;
  corePremise?: string;
  powerStructure?: string;
  currentConflict?: string;
  worldHistory?: string;
  socialSystem?: string;
  economy?: string;
  magicTechSystem?: string;
  factionRelations?: string;
  survivalEnvironment?: string;
  culture?: string;
  religion?: string;
  education?: string;
  lawOrder?: string;
  taboo?: string;
  dailyLife?: string;
  travelComm?: string;
  truthVsBeliefs?: string;
}> => {
  return fetchStructuredGemini({
    task: 'worldDesign',
    genre,
    language,
    hints,
  });
};

// ============================================================
// PART 4B: ITEM GENERATION
// ============================================================

export const generateItems = async (
  config: StoryConfig,
  language: AppLanguage = 'KO',
  count: number = 3,
): Promise<Item[]> => {
  const existingNames = (config.items || []).map(i => i.name).filter(Boolean);
  const results = await fetchStructuredGemini<unknown[]>({
    task: 'items',
    config: {
      genre: config.genre,
      synopsis: config.synopsis,
    },
    genre: config.genre,
    setting: config.synopsis?.slice(0, 200),
    language,
    count,
    existingNames,
  });

  if (!Array.isArray(results)) return [];

  const VALID_CATEGORIES = ['weapon', 'armor', 'accessory', 'consumable', 'material', 'quest', 'misc'];
  const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  // API가 예상 외 값을 반환할 경우 가장 가까운 유효 값으로 매핑
  const CATEGORY_ALIAS: Record<string, string> = { artifact: 'accessory', key_item: 'quest' };
  const normalizeCategory = (c: string) => VALID_CATEGORIES.includes(c) ? c : (CATEGORY_ALIAS[c] || 'misc');
  const normalizeRarity = (r: string) => VALID_RARITIES.includes(r) ? r : 'common';

  return results
    .filter((item): item is Omit<Item, 'id'> => {
      return Boolean(
        item
        && typeof item === 'object'
        && typeof (item as Item).name === 'string'
      );
    })
    .map((item) => ({
      ...item,
      category: normalizeCategory((item as Item).category || 'misc') as Item['category'],
      rarity: normalizeRarity((item as Item).rarity || 'common') as Item['rarity'],
      id: `item-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
};

// ============================================================
// PART 4C: SKILL GENERATION
// ============================================================

export const generateSkills = async (
  config: StoryConfig,
  language: AppLanguage = 'KO',
  count: number = 3,
): Promise<Skill[]> => {
  const existingNames = (config.skills || []).map(s => s.name).filter(Boolean);
  const results = await fetchStructuredGemini<unknown[]>({
    task: 'skills',
    config: {
      genre: config.genre,
      synopsis: config.synopsis,
    },
    genre: config.genre,
    setting: config.synopsis?.slice(0, 200),
    language,
    count,
    existingNames,
  });

  if (!Array.isArray(results)) return [];

  const VALID_TYPES = ['active', 'passive', 'ultimate'];
  const normalizeType = (t: string) => VALID_TYPES.includes(t) ? t : 'active';

  return results
    .filter((skill): skill is Omit<Skill, 'id'> => {
      return Boolean(
        skill
        && typeof skill === 'object'
        && typeof (skill as Skill).name === 'string'
      );
    })
    .map((skill) => ({
      ...skill,
      type: normalizeType((skill as Skill).type || 'active') as Skill['type'],
      id: `skill-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
};

// ============================================================
// PART 4D: MAGIC SYSTEM GENERATION
// ============================================================

export const generateMagicSystems = async (
  config: StoryConfig,
  language: AppLanguage = 'KO',
  count: number = 2,
): Promise<MagicSystem[]> => {
  const existingNames = (config.magicSystems || []).map(m => m.name).filter(Boolean);
  const results = await fetchStructuredGemini<unknown[]>({
    task: 'magicSystems',
    config: {
      genre: config.genre,
      synopsis: config.synopsis,
    },
    language,
    count,
    existingNames,
  });

  if (!Array.isArray(results)) return [];

  return results
    .filter((magic): magic is Omit<MagicSystem, 'id'> => {
      return Boolean(
        magic
        && typeof magic === 'object'
        && typeof (magic as MagicSystem).name === 'string'
      );
    })
    .map((magic) => ({
      ...magic,
      id: `magic-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }));
};

// ============================================================
// PART 5: WORLD SIMULATOR GENERATION
// ============================================================

export const generateWorldSim = async (
  synopsis: string,
  genre: string,
  language: AppLanguage = 'KO',
  worldContext?: { corePremise?: string; powerStructure?: string; currentConflict?: string; factionRelations?: string }
): Promise<{
  civilizations: { name: string; era: string; traits: string[] }[];
  relations: { from: string; to: string; type: string }[];
}> => {
  return fetchStructuredGemini({
    task: 'worldSim',
    synopsis,
    genre,
    language,
    worldContext,
  });
};

// ============================================================
// PART 6: SCENE DIRECTION GENERATION
// ============================================================

export const generateSceneDirection = async (
  synopsis: string,
  characters: string[],
  language: AppLanguage = 'KO',
  tierContext?: {
    charProfiles?: { name: string; desire?: string; conflict?: string; changeArc?: string; values?: string }[];
    corePremise?: string;
    powerStructure?: string;
    currentConflict?: string;
  }
): Promise<{
  hooks: { position: string; hookType: string; desc: string }[];
  goguma: { type: string; intensity: string; desc: string }[];
  cliffhanger: { cliffType: string; desc: string };
  emotionTargets: { emotion: string; intensity: number }[];
  dialogueTones: { character: string; tone: string }[];
  foreshadows?: { planted: string; payoff: string }[];
  dopamineDevices?: { scale: string; device: string; desc: string }[];
  pacings?: { section: string; percent: number; desc: string }[];
  tensionCurve?: { position: number; level: number; label: string }[];
}> => {
  return fetchStructuredGemini({
    task: 'sceneDirection',
    synopsis,
    characters,
    language,
    tierContext,
  });
};
