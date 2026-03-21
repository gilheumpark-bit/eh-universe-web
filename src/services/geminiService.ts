// ============================================================
// PART 0: IMPORTS & TYPES
// ============================================================

import { GoogleGenAI, Type } from "@google/genai";
import { StoryConfig, Character, AppLanguage, Message } from "../lib/studio-types";
import { PlatformType } from "../engine/types";
import { buildSystemInstruction, buildUserPrompt, postProcessResponse } from "../engine/pipeline";
import type { EngineReport } from "../engine/types";
import { streamChat, getApiKey, getActiveProvider, ChatMsg } from "../lib/ai-providers";

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
  currentUserPrompt: string
): ChatMsg[] {
  const msgs: ChatMsg[] = [];
  const recent = history.slice(-20);

  for (const msg of recent) {
    if (msg.role === 'assistant' && !msg.content) continue;
    let text = msg.content;
    if (msg.role === 'assistant') {
      text = text.replace(/```json\n[\s\S]*?\n```/g, '').trim();
      if (!text) continue;
    }
    msgs.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: text,
    });
  }

  msgs.push({ role: 'user', content: currentUserPrompt });
  return msgs;
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

  const systemInstruction = buildSystemInstruction(config, language, platform);
  const userPrompt = buildUserPrompt(config, draft, {
    previousContent: options.previousContent,
    language,
  });

  const history = options.history ?? [];
  const messages = history.filter(m => m.content).length > 0
    ? buildChatMessages(history, userPrompt)
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
              dna: { type: Type.NUMBER }
            },
            required: ["name", "role", "traits", "appearance", "dna"]
          }
        }
      }
    });

    const results = JSON.parse(response.text || "[]");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.map((c: any) => ({
      ...c,
      id: `c-${Date.now()}-${Math.random()}`
    }));
  } catch (error) {
    console.error("Character Engine Error:", error);
    throw error;
  }
};
