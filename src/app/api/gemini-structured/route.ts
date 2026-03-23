import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { resolveServerProviderKey } from '@/lib/server-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 262_144; // 256KB
const SAFE_MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;

type StructuredTask = 'characters' | 'worldDesign' | 'worldSim' | 'sceneDirection';
type StoryHints = {
  title?: string;
  povCharacter?: string;
  setting?: string;
  primaryEmotion?: string;
  synopsis?: string;
};

type WorldContext = {
  corePremise?: string;
  powerStructure?: string;
  currentConflict?: string;
  factionRelations?: string;
};

type SceneTierContext = {
  charProfiles?: { name: string; desire?: string; conflict?: string; changeArc?: string; values?: string }[];
  corePremise?: string;
  powerStructure?: string;
  currentConflict?: string;
};

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  KO: 'Korean',
  EN: 'English',
  JP: 'Japanese',
  CN: 'Chinese',
};

// ============================================================
// PART 1 — Shared request helpers
// ============================================================

function validateOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) return null;
  if (new URL(origin).host !== host) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

async function parseRequest(req: NextRequest): Promise<Record<string, unknown>> {
  const rawText = await req.text();
  if (Buffer.byteLength(rawText, 'utf8') > MAX_REQUEST_BYTES) {
    throw new Error('Request too large');
  }
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    throw new Error('Invalid JSON');
  }
}

function getLanguage(value: unknown): AppLanguage {
  return value === 'EN' || value === 'JP' || value === 'CN' ? value : 'KO';
}

function getModel(value: unknown): string {
  if (typeof value === 'string' && SAFE_MODEL_PATTERN.test(value)) {
    return value;
  }
  return 'gemini-2.5-pro';
}

async function generateJson<T>(
  apiKey: string,
  model: string,
  prompt: string,
  responseSchema: object,
  fallback: T,
): Promise<T> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  try {
    return JSON.parse(response.text || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

// ============================================================
// PART 2 — Task implementations
// ============================================================

async function handleCharacters(
  apiKey: string,
  model: string,
  config: Pick<StoryConfig, 'genre' | 'synopsis'>,
  language: AppLanguage,
) {
  const prompt = `
    Based on the genre [${config.genre}] and world setting [${config.synopsis}],
    generate 4 multidimensional characters in JSON format.
    IMPORTANT: All character names, roles, traits, and appearance descriptions MUST be written in ${LANGUAGE_NAMES[language]}.
    Each character must have a unique narrative role and high narrative potential (dna score 0-100).

    For each character, also provide:
    - desire: What they desperately want (their core drive)
    - deficiency: What they fundamentally lack
    - conflict: The central conflict they face in the story
    - changeArc: How they transform by the end of the story
    - values: Their core beliefs and lines they never cross
  `;

  return generateJson<unknown[]>(
    apiKey,
    model,
    prompt,
    {
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
        required: ['name', 'role', 'traits', 'appearance', 'dna'],
      },
    },
    [],
  );
}

async function handleWorldDesign(
  apiKey: string,
  model: string,
  genre: string,
  language: AppLanguage,
  hints?: StoryHints,
) {
  const hintParts: string[] = [];
  if (hints?.title) hintParts.push(`Title hint: "${hints.title}"`);
  if (hints?.povCharacter) hintParts.push(`Main character: "${hints.povCharacter}"`);
  if (hints?.setting) hintParts.push(`Setting: "${hints.setting}"`);
  if (hints?.primaryEmotion) hintParts.push(`Core emotion: "${hints.primaryEmotion}"`);
  if (hints?.synopsis) hintParts.push(`Story synopsis: "${hints.synopsis}"`);

  const hintBlock = hintParts.length > 0
    ? `\n\nUSER-PROVIDED HINTS (incorporate these into your generation):\n${hintParts.join('\n')}`
    : '';

  return generateJson<Record<string, string>>(
    apiKey,
    model,
    `Generate a unique ${genre} story concept in ${LANGUAGE_NAMES[language]}. Be creative and original.
Include:
- corePremise: The one key rule that makes this world different from reality
- powerStructure: Who holds power and how it is maintained
- currentConflict: The central conflict driving the world right now
${hintBlock}`,
    {
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
      required: ['title', 'povCharacter', 'setting', 'primaryEmotion', 'synopsis'],
    },
    { title: '', povCharacter: '', setting: '', primaryEmotion: '', synopsis: '' },
  );
}

async function handleWorldSim(
  apiKey: string,
  model: string,
  synopsis: string,
  genre: string,
  language: AppLanguage,
  worldContext?: WorldContext,
) {
  const contextParts: string[] = [];
  if (worldContext?.corePremise) contextParts.push(`World Premise: ${worldContext.corePremise}`);
  if (worldContext?.powerStructure) contextParts.push(`Power Structure: ${worldContext.powerStructure}`);
  if (worldContext?.currentConflict) contextParts.push(`Central Conflict: ${worldContext.currentConflict}`);
  if (worldContext?.factionRelations) contextParts.push(`Known Faction Relations: ${worldContext.factionRelations}`);

  const contextBlock = contextParts.length > 0
    ? `\n\n[World Framework]\n${contextParts.join('\n')}\nCivilizations must reflect this framework.`
    : '';

  return generateJson<{ civilizations: unknown[]; relations: unknown[] }>(
    apiKey,
    model,
    `Based on this ${genre} story synopsis, generate 3-4 civilizations/factions and their relationships in ${LANGUAGE_NAMES[language]}.\n\nSynopsis: ${synopsis}${contextBlock}`,
    {
      type: Type.OBJECT,
      properties: {
        civilizations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              era: { type: Type.STRING },
              traits: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['name', 'era', 'traits'],
          },
        },
        relations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              from: { type: Type.STRING },
              to: { type: Type.STRING },
              type: { type: Type.STRING },
            },
            required: ['from', 'to', 'type'],
          },
        },
      },
      required: ['civilizations', 'relations'],
    },
    { civilizations: [], relations: [] },
  );
}

async function handleSceneDirection(
  apiKey: string,
  model: string,
  synopsis: string,
  characters: string[],
  language: AppLanguage,
  tierContext?: SceneTierContext,
) {
  const contextParts: string[] = [];
  if (tierContext?.corePremise) contextParts.push(`World Premise: ${tierContext.corePremise}`);
  if (tierContext?.powerStructure) contextParts.push(`Power Structure: ${tierContext.powerStructure}`);
  if (tierContext?.currentConflict) contextParts.push(`World Conflict: ${tierContext.currentConflict}`);
  if (tierContext?.charProfiles?.length) {
    const charBlock = tierContext.charProfiles
      .map((character) => `  - ${character.name}: wants "${character.desire || '?'}", conflicts with "${character.conflict || '?'}", arc toward "${character.changeArc || '?'}", forbidden line "${character.values || '?'}"`)
      .join('\n');
    contextParts.push(`Character Profiles:\n${charBlock}`);
  }

  const tierBlock = contextParts.length > 0
    ? `\n\n[NARRATIVE FRAMEWORK]\n${contextParts.join('\n')}\n\nIMPORTANT RULES:\n- Hooks must connect to character desires or world conflicts\n- Cliffhangers must threaten character values or exploit their deficiencies\n- Tension devices must escalate toward the character's change arc\n- Dialogue tone must reflect each character's core conflict\n`
    : '';

  return generateJson<Record<string, unknown>>(
    apiKey,
    model,
    `Based on this story, generate scene direction elements in ${LANGUAGE_NAMES[language]}.\n\nSynopsis: ${synopsis}\nCharacters: ${characters.join(', ')}${tierBlock}`,
    {
      type: Type.OBJECT,
      properties: {
        hook: {
          type: Type.OBJECT,
          properties: {
            position: { type: Type.STRING },
            type: { type: Type.STRING },
            desc: { type: Type.STRING },
          },
          required: ['position', 'type', 'desc'],
        },
        tension: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            desc: { type: Type.STRING },
          },
          required: ['type', 'desc'],
        },
        cliffhanger: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            desc: { type: Type.STRING },
          },
          required: ['type', 'desc'],
        },
        emotionTarget: { type: Type.STRING },
        dialogueTone: {
          type: Type.OBJECT,
          properties: {
            character: { type: Type.STRING },
            tone: { type: Type.STRING },
          },
          required: ['character', 'tone'],
        },
      },
      required: ['hook', 'tension', 'cliffhanger', 'emotionTarget', 'dialogueTone'],
    },
    {},
  );
}

// ============================================================
// PART 3 — Route handler
// ============================================================

export async function POST(req: NextRequest) {
  const forbidden = validateOrigin(req);
  if (forbidden) return forbidden;

  try {
    const body = await parseRequest(req);
    const apiKey = resolveServerProviderKey('gemini', body.apiKey);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Set a personal key or configure GEMINI_API_KEY on the server.' },
        { status: 401 },
      );
    }

    const task = body.task;
    if (task !== 'characters' && task !== 'worldDesign' && task !== 'worldSim' && task !== 'sceneDirection') {
      return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
    }

    const model = getModel(body.model);
    const language = getLanguage(body.language);

    switch (task as StructuredTask) {
      case 'characters': {
        const config = body.config as Pick<StoryConfig, 'genre' | 'synopsis'> | undefined;
        if (!config?.genre || !config?.synopsis) {
          return NextResponse.json({ error: 'Invalid character config' }, { status: 400 });
        }
        return NextResponse.json(await handleCharacters(apiKey, model, config, language));
      }
      case 'worldDesign': {
        if (typeof body.genre !== 'string' || !body.genre.trim()) {
          return NextResponse.json({ error: 'Invalid genre' }, { status: 400 });
        }
        return NextResponse.json(
          await handleWorldDesign(apiKey, model, body.genre, language, body.hints as StoryHints | undefined),
        );
      }
      case 'worldSim': {
        if (typeof body.synopsis !== 'string' || typeof body.genre !== 'string') {
          return NextResponse.json({ error: 'Invalid world simulator input' }, { status: 400 });
        }
        return NextResponse.json(
          await handleWorldSim(
            apiKey,
            model,
            body.synopsis,
            body.genre,
            language,
            body.worldContext as WorldContext | undefined,
          ),
        );
      }
      case 'sceneDirection': {
        if (typeof body.synopsis !== 'string' || !Array.isArray(body.characters)) {
          return NextResponse.json({ error: 'Invalid scene direction input' }, { status: 400 });
        }
        const characters = body.characters.filter((value): value is string => typeof value === 'string');
        return NextResponse.json(
          await handleSceneDirection(
            apiKey,
            model,
            body.synopsis,
            characters,
            language,
            body.tierContext as SceneTierContext | undefined,
          ),
        );
      }
      default:
        return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /Request too large/i.test(message) ? 413 : /Invalid JSON/i.test(message) ? 400 : /401|403|unauthorized/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message.slice(0, 240) }, { status });
  }
}
