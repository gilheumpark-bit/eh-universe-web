// ============================================================
// PART 0: IMPORTS & TYPES
// Story streaming uses lib/ai-providers.ts (multi-provider).
// This file handles: (1) story stream orchestration with engine
//                     (2) Gemini-only structured output (characters)
// ============================================================

import { GoogleGenAI, Type } from "@google/genai";
import { StoryConfig, Character, AppLanguage, Message } from "../lib/studio-types";
import { PlatformType } from "../engine/types";
import { buildSystemInstruction, buildUserPrompt, postProcessResponse } from "../engine/pipeline";
import type { EngineReport } from "../engine/types";
import { streamChat, getApiKey, getActiveProvider, getActiveModel, ChatMsg } from "../lib/ai-providers";
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

// ============================================================
// PART 1: HISTORY BUILDER
// ============================================================

function buildChatMessages(
  history: Message[],
  currentUserPrompt: string,
  systemInstruction: string
): ChatMsg[] {
  // Convert all history to ChatMsg format (cap at STORAGE limit for sanity)
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

  // Token-aware truncation instead of arbitrary message count
  const model = getActiveModel();
  const { messages: trimmed } = truncateMessages(systemInstruction, allMsgs, model);

  trimmed.push({ role: 'user', content: currentUserPrompt });
  return trimmed;
}

// ============================================================
// PART 2: MAIN STREAM — BYOK MULTI-PROVIDER
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
  const messages = history.filter(m => m.content).length > 0
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
// PART 3: CHARACTER GENERATION (Gemini-specific, structured output)
// ============================================================

export const generateCharacters = async (config: StoryConfig, language: AppLanguage = 'KO'): Promise<Character[]> => {
  // Character generation uses structured JSON output — Gemini-only feature
  // Falls back to active provider's key if gemini key not set
  const provider = getActiveProvider();
  const apiKey = provider === 'gemini'
    ? getApiKey('gemini')
    : (getApiKey('gemini') || getApiKey(provider));

  if (!apiKey) throw new Error("API_KEY_INVALID");

  const ai = new GoogleGenAI({ apiKey });
  const langNames: Record<string, string> = {
    'KO': 'Korean', 'EN': 'English', 'JP': 'Japanese', 'CN': 'Chinese'
  };

  const prompt = `
    Based on the genre [${config.genre}] and world setting [${config.synopsis}],
    generate 4 multidimensional characters in JSON format.
    IMPORTANT: All character names, roles, traits, and appearance descriptions MUST be written in ${langNames[language]}.
    Each character must have a unique narrative role and high narrative potential (dna score 0-100).

    For each character, also provide:
    - desire: What they desperately want (their core drive)
    - deficiency: What they fundamentally lack
    - conflict: The central conflict they face in the story
    - changeArc: How they transform by the end of the story
    - values: Their core beliefs and lines they never cross
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              traits: { type: Type.STRING },
              appearance: { type: Type.STRING },
              dna: { type: Type.NUMBER },
              desire: { type: Type.STRING },
              deficiency: { type: Type.STRING },
              conflict: { type: Type.STRING },
              changeArc: { type: Type.STRING },
              values: { type: Type.STRING },
            },
            required: ["name", "role", "traits", "appearance", "dna"]
          }
        }
      }
    });

    let results: unknown[];
    try {
      results = JSON.parse(response.text || "[]");
    } catch {
      console.error("Character Engine: malformed JSON from AI", response.text?.slice(0, 200));
      results = [];
    }
    if (!Array.isArray(results)) results = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.filter((c: any) => c && typeof c.name === 'string').map((c: any) => ({
      ...c,
      id: `c-${Date.now()}-${Math.random()}`
    }));
  } catch (error) {
    console.error("Character Engine Error:", error);
    throw error;
  }
};

// ============================================================
// PART 4: AI WORLD DESIGN GENERATION
// ============================================================

export const generateWorldDesign = async (
  genre: string,
  language: AppLanguage = 'KO',
  hints?: { title?: string; povCharacter?: string; setting?: string; primaryEmotion?: string; synopsis?: string }
): Promise<{
  title: string; povCharacter: string; setting: string; primaryEmotion: string; synopsis: string;
  corePremise?: string; powerStructure?: string; currentConflict?: string;
}> => {
  const apiKey = getApiKey('gemini') || getApiKey(getActiveProvider());
  if (!apiKey) throw new Error("API_KEY_INVALID");
  const ai = new GoogleGenAI({ apiKey });
  const langName = language === 'KO' ? 'Korean' : 'English';

  // 사용자가 입력한 힌트가 있으면 프롬프트에 반영
  const hintParts: string[] = [];
  if (hints?.title) hintParts.push(`Title hint: "${hints.title}"`);
  if (hints?.povCharacter) hintParts.push(`Main character: "${hints.povCharacter}"`);
  if (hints?.setting) hintParts.push(`Setting: "${hints.setting}"`);
  if (hints?.primaryEmotion) hintParts.push(`Core emotion: "${hints.primaryEmotion}"`);
  if (hints?.synopsis) hintParts.push(`Story synopsis: "${hints.synopsis}"`);

  const hintBlock = hintParts.length > 0
    ? `\n\nUSER-PROVIDED HINTS (incorporate these into your generation):\n${hintParts.join('\n')}`
    : '';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Generate a unique ${genre} story concept in ${langName}. Be creative and original.
Include:
- corePremise: The one key rule that makes this world different from reality
- powerStructure: Who holds power and how it is maintained
- currentConflict: The central conflict driving the world right now
${hintBlock}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            povCharacter: { type: Type.STRING },
            setting: { type: Type.STRING },
            primaryEmotion: { type: Type.STRING },
            synopsis: { type: Type.STRING },
            corePremise: { type: Type.STRING },
            powerStructure: { type: Type.STRING },
            currentConflict: { type: Type.STRING },
          },
          required: ["title", "povCharacter", "setting", "primaryEmotion", "synopsis"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("World Design Generation Error:", error);
    throw error;
  }
};

// ============================================================
// PART 5: AI WORLD SIMULATOR GENERATION
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
  const apiKey = getApiKey('gemini') || getApiKey(getActiveProvider());
  if (!apiKey) throw new Error("API_KEY_INVALID");
  const ai = new GoogleGenAI({ apiKey });
  const langName = language === 'KO' ? 'Korean' : 'English';

  const ctxParts: string[] = [];
  if (worldContext?.corePremise) ctxParts.push(`World Premise: ${worldContext.corePremise}`);
  if (worldContext?.powerStructure) ctxParts.push(`Power Structure: ${worldContext.powerStructure}`);
  if (worldContext?.currentConflict) ctxParts.push(`Central Conflict: ${worldContext.currentConflict}`);
  if (worldContext?.factionRelations) ctxParts.push(`Known Faction Relations: ${worldContext.factionRelations}`);
  const ctxBlock = ctxParts.length > 0 ? `\n\n[World Framework]\n${ctxParts.join('\n')}\nCivilizations must reflect this framework.` : '';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Based on this ${genre} story synopsis, generate 3-4 civilizations/factions and their relationships in ${langName}.\n\nSynopsis: ${synopsis}${ctxBlock}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            civilizations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, era: { type: Type.STRING }, traits: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["name", "era", "traits"] } },
            relations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { from: { type: Type.STRING }, to: { type: Type.STRING }, type: { type: Type.STRING } }, required: ["from", "to", "type"] } },
          },
          required: ["civilizations", "relations"]
        }
      }
    });
    return JSON.parse(response.text || '{"civilizations":[],"relations":[]}');
  } catch (error) {
    console.error("World Sim Generation Error:", error);
    throw error;
  }
};

// ============================================================
// PART 6: AI SCENE DIRECTION GENERATION
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
  hook: { position: string; type: string; desc: string };
  tension: { type: string; desc: string };
  cliffhanger: { type: string; desc: string };
  emotionTarget: string;
  dialogueTone: { character: string; tone: string };
}> => {
  const apiKey = getApiKey('gemini') || getApiKey(getActiveProvider());
  if (!apiKey) throw new Error("API_KEY_INVALID");
  const ai = new GoogleGenAI({ apiKey });
  const langName = language === 'KO' ? 'Korean' : 'English';

  // 3-tier 컨텍스트 빌드
  const contextParts: string[] = [];
  if (tierContext?.corePremise) contextParts.push(`World Premise: ${tierContext.corePremise}`);
  if (tierContext?.powerStructure) contextParts.push(`Power Structure: ${tierContext.powerStructure}`);
  if (tierContext?.currentConflict) contextParts.push(`World Conflict: ${tierContext.currentConflict}`);
  if (tierContext?.charProfiles?.length) {
    const charBlock = tierContext.charProfiles
      .map(c => `  - ${c.name}: wants "${c.desire || '?'}", conflicts with "${c.conflict || '?'}", arc toward "${c.changeArc || '?'}", forbidden line "${c.values || '?'}"`)
      .join('\n');
    contextParts.push(`Character Profiles:\n${charBlock}`);
  }
  const tierBlock = contextParts.length > 0
    ? `\n\n[NARRATIVE FRAMEWORK]\n${contextParts.join('\n')}\n\nIMPORTANT RULES:\n- Hooks must connect to character desires or world conflicts\n- Cliffhangers must threaten character values or exploit their deficiencies\n- Tension devices must escalate toward the character's change arc\n- Dialogue tone must reflect each character's core conflict\n`
    : '';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Based on this story, generate scene direction elements in ${langName}.\n\nSynopsis: ${synopsis}\nCharacters: ${characters.join(', ')}${tierBlock}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hook: { type: Type.OBJECT, properties: { position: { type: Type.STRING }, type: { type: Type.STRING }, desc: { type: Type.STRING } }, required: ["position", "type", "desc"] },
            tension: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, desc: { type: Type.STRING } }, required: ["type", "desc"] },
            cliffhanger: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, desc: { type: Type.STRING } }, required: ["type", "desc"] },
            emotionTarget: { type: Type.STRING },
            dialogueTone: { type: Type.OBJECT, properties: { character: { type: Type.STRING }, tone: { type: Type.STRING } }, required: ["character", "tone"] },
          },
          required: ["hook", "tension", "cliffhanger", "emotionTarget", "dialogueTone"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Scene Direction Generation Error:", error);
    throw error;
  }
};
