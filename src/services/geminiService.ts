// ============================================================
// PART 0: IMPORTS & TYPES
// Story streaming uses lib/ai-providers.ts (multi-provider).
// This file handles:
//   (1) story stream orchestration with engine
//   (2) Gemini structured generation via server route
// ============================================================

import { StoryConfig, Character, Item, AppLanguage, Message } from "../lib/studio-types";
import { PlatformType } from "../engine/types";
import { buildSystemInstruction, buildUserPrompt, postProcessResponse } from "../engine/pipeline";
import type { EngineReport } from "../engine/types";
import { streamChat, getApiKey, getActiveModel, getPreferredModel, ChatMsg } from "../lib/ai-providers";
import { HISTORY_LIMITS, truncateMessages } from "../lib/token-utils";

export interface GenerateOptions {
  previousContent?: string;
  language?: AppLanguage;
  signal?: AbortSignal;
  platform?: PlatformType;
  history?: Message[];
  temperature?: number;
}

export interface GenerateResult {
  content: string;
  report: EngineReport;
}

function getStructuredModel(): string {
  // Structured generation currently uses Gemini only.
  // When more providers support structured output, this can check capabilities.
  return getPreferredModel('gemini');
}

async function fetchStructuredGemini<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/gemini-structured', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body,
      provider: 'gemini', // future: make this configurable per capability
      model: getStructuredModel(),
      apiKey: getApiKey('gemini') || undefined,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage = data && typeof data.error === 'string'
      ? data.error
      : `Structured Gemini error ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
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

  const systemInstruction = buildSystemInstruction(config, language, platform, config.simulatorRef?.ruleLevel);
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
    });

    const { content, report } = postProcessResponse(fullContent, config, language, platform);
    return { content, report };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.error("Story Generation Error:", error);
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
  hints?: { title?: string; povCharacter?: string; setting?: string; primaryEmotion?: string; synopsis?: string }
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
