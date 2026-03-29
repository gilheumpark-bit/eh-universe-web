import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import type { AppLanguage } from '@/lib/studio-types';
import { resolveServerProviderKey } from '@/lib/server-ai';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 524_288; // 512KB — 원고는 길 수 있음
const SAFE_MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MAX_CONTENT_CHARS = 8_000; // 토큰 과부하 방지용 원고 잘라내기

// ============================================================
// PART 1 — 요청 유효성 검사 & 공통 헬퍼
// ============================================================

function validateOrigin(req: NextRequest, hasClientKey: boolean): NextResponse | null {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) {
    if (!hasClientKey) {
      return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
    }
    return null;
  }
  if (host && new URL(origin).host !== host) {
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
  if (typeof value === 'string' && SAFE_MODEL_PATTERN.test(value)) return value;
  return 'gemini-2.5-flash'; // 분석 작업은 flash로 충분 + 속도 우선
}

async function generateJson<T>(
  apiKey: string,
  model: string,
  prompt: string,
  responseSchema: object,
  fallback: T,
): Promise<T> {
  const ai = new GoogleGenAI({ apiKey });
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema },
      });
      try {
        return JSON.parse(response.text || JSON.stringify(fallback)) as T;
      } catch {
        return fallback;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isRetryable = /500|502|503|504|INTERNAL|resource.*exhausted|deadline|overloaded/i.test(msg);
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return fallback;
}

// ============================================================
// PART 2 — Gemini 응답 스키마 정의
// ============================================================

const CHARACTER_STATE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name:            { type: Type.STRING },
      presence:        { type: Type.STRING },  // direct | indirect | mentioned | absent
      sceneRole:       { type: Type.STRING },
      emotion: {
        type: Type.OBJECT,
        properties: {
          primary:   { type: Type.STRING },
          intensity: { type: Type.STRING }, // low | mid | high | extreme
        },
        required: ['primary', 'intensity'],
      },
      expression:      { type: Type.STRING },
      gaze: {
        type: Type.OBJECT,
        properties: {
          direction: { type: Type.STRING },
          target:    { type: Type.STRING },
        },
        required: ['direction', 'target'],
      },
      pose:            { type: Type.STRING },
      actionState:     { type: Type.STRING },
      bodyState:       { type: Type.ARRAY, items: { type: Type.STRING } },
      outfitDelta:     { type: Type.ARRAY, items: { type: Type.STRING } },
      heldItem:        { type: Type.ARRAY, items: { type: Type.STRING } },
      relationContext: { type: Type.STRING },
      aura:            { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['name', 'presence', 'sceneRole', 'emotion', 'expression', 'gaze', 'pose', 'actionState'],
  },
};

const BACKGROUND_STATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    location:             { type: Type.STRING },
    spaceType:            { type: Type.STRING },
    time:                 { type: Type.STRING },
    weather:              { type: Type.STRING },
    lighting:             { type: Type.STRING },
    mood:                 { type: Type.ARRAY, items: { type: Type.STRING } },
    keyObjects:           { type: Type.ARRAY, items: { type: Type.STRING } },
    environmentCondition: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['location', 'spaceType', 'time', 'weather', 'lighting'],
};

const SCENE_STATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary:       { type: Type.STRING },
    phase:         { type: Type.STRING },
    tension:       { type: Type.STRING }, // low | mid | high | extreme
    conflictType:  { type: Type.ARRAY, items: { type: Type.STRING } },
    characterGoal: { type: Type.STRING },
    obstacle:      { type: Type.STRING },
    turningPoint:  { type: Type.STRING },
    symbolicTags:  { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['summary', 'phase', 'tension', 'characterGoal'],
};

const SOUND_STATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ambient:    { type: Type.ARRAY, items: { type: Type.STRING } },
    effects:    { type: Type.ARRAY, items: { type: Type.STRING } },
    voiceTone:  { type: Type.ARRAY, items: { type: Type.STRING } },
    audioMood:  { type: Type.ARRAY, items: { type: Type.STRING } },
    bgmTags:    { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['ambient', 'effects', 'voiceTone', 'audioMood', 'bgmTags'],
};

const IMAGE_PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    characterFocus:  { type: Type.STRING },
    backgroundFocus: { type: Type.STRING },
    sceneFocus:      { type: Type.STRING },
    styleHints:      { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['characterFocus', 'backgroundFocus', 'sceneFocus', 'styleHints'],
};

const MUSIC_PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    mood:           { type: Type.STRING },
    emotionFlow:    { type: Type.STRING },
    soundKeywords:  { type: Type.ARRAY, items: { type: Type.STRING } },
    musicStyle:     { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['mood', 'emotionFlow', 'soundKeywords', 'musicStyle'],
};

const FULL_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    characterState:  CHARACTER_STATE_SCHEMA,
    backgroundState: BACKGROUND_STATE_SCHEMA,
    sceneState:      SCENE_STATE_SCHEMA,
    soundState:      SOUND_STATE_SCHEMA,
    imagePromptPack: IMAGE_PROMPT_SCHEMA,
    musicPromptPack: MUSIC_PROMPT_SCHEMA,
  },
  required: ['characterState', 'backgroundState', 'sceneState', 'soundState', 'imagePromptPack', 'musicPromptPack'],
};

// ============================================================
// PART 3 — 분석 프롬프트 생성 및 실행
// ============================================================

const LANG_NAMES: Record<AppLanguage, string> = {
  KO: 'Korean', EN: 'English', JP: 'Japanese', CN: 'Chinese',
};

function buildAnalysisPrompt(content: string, language: AppLanguage): string {
  const lang = LANG_NAMES[language];
  const excerpt = content.slice(0, MAX_CONTENT_CHARS);
  const truncated = content.length > MAX_CONTENT_CHARS ? ' [truncated for analysis]' : '';

  return `You are a professional novel scene analyst. Analyze the following manuscript excerpt and extract structured scene data in ${lang}.

MANUSCRIPT:
---
${excerpt}${truncated}
---

Extract ALL of the following data in ${lang}:

1. characterState — All characters appearing in this scene. For each:
   - name: Character name
   - presence: "direct" (present), "indirect" (influence felt), "mentioned" (talked about), or "absent"
   - sceneRole: Their role in this scene (1 sentence)
   - emotion: { primary (main emotion in ${lang}), intensity: "low"|"mid"|"high"|"extreme" }
   - expression: Facial expression description
   - gaze: { direction, target }
   - pose: Body posture / stance
   - actionState: What they are actively doing
   - bodyState: Physical body condition tags (e.g. ["trembling", "sweating"])
   - outfitDelta: Costume changes or notable clothing details (empty array if none)
   - heldItem: Items held or carried (empty array if none)
   - relationContext: Relationship dynamic with other characters present
   - aura: Atmospheric impression tags (e.g. ["cold", "authoritative", "desperate"])

2. backgroundState — The scene's setting:
   - location: Specific place name or description
   - spaceType: Type of space (indoor/outdoor, building type, etc.)
   - time: Time of day and/or season
   - weather: Weather conditions
   - lighting: Lighting description
   - mood: Atmosphere tags (3-5 words/phrases)
   - keyObjects: Important objects present in scene
   - environmentCondition: Environmental conditions (e.g. ["silent", "crowded", "smoky"])

3. sceneState — Scene structure:
   - summary: 1-2 sentence scene summary
   - phase: Narrative phase (e.g. "confrontation", "revelation", "escape", "reconciliation")
   - tension: Overall tension level — "low"|"mid"|"high"|"extreme"
   - conflictType: Types of conflict present (e.g. ["internal", "interpersonal"])
   - characterGoal: What the POV character wants in this scene
   - obstacle: What prevents them from getting it
   - turningPoint: The pivotal moment or beat of change
   - symbolicTags: Symbolic or thematic elements

4. soundState — Auditory landscape:
   - ambient: Background/environmental sounds
   - effects: Specific sound effects
   - voiceTone: How characters sound when speaking
   - audioMood: Overall audio atmosphere tags
   - bgmTags: Music mood tags for a soundtrack (e.g. ["tense strings", "low drone", "silence"])

5. imagePromptPack — For AI image generation:
   - characterFocus: Concise prompt describing the main character's appearance and state
   - backgroundFocus: Concise prompt describing the scene environment
   - sceneFocus: Concise prompt describing the overall scene composition
   - styleHints: Visual style keywords (e.g. ["cinematic lighting", "manhwa style", "dramatic angle"])

6. musicPromptPack — For AI music generation:
   - mood: Primary emotional mood
   - emotionFlow: How the emotion changes through the scene
   - soundKeywords: Specific sound descriptors
   - musicStyle: Genre and style tags

Be specific, detailed, and extract everything directly from the text. Do not invent information not present in the manuscript.`;
}

// ============================================================
// PART 4 — Route handler
// ============================================================

interface CharacterStateEntry {
  name?: string;
  presence?: string;
  emotion?: { primary?: string; intensity?: string };
  [key: string]: unknown;
}

interface AnalysisFallback {
  characterState: CharacterStateEntry[];
  backgroundState: Record<string, string | string[]>;
  sceneState: { tension: string; [key: string]: string | string[] };
  soundState: Record<string, string[]>;
  imagePromptPack: Record<string, string | string[]>;
  musicPromptPack: Record<string, string | string[]>;
  [key: string]: unknown;
}

const EMPTY_FALLBACK: AnalysisFallback = {
  characterState: [],
  backgroundState: {
    location: '', spaceType: '', time: '', weather: '', lighting: '',
    mood: [], keyObjects: [], environmentCondition: [],
  },
  sceneState: {
    summary: '', phase: '', tension: 'mid' as const,
    conflictType: [], characterGoal: '', obstacle: '', turningPoint: '', symbolicTags: [],
  },
  soundState: { ambient: [], effects: [], voiceTone: [], audioMood: [], bgmTags: [] },
  imagePromptPack: { characterFocus: '', backgroundFocus: '', sceneFocus: '', styleHints: [] },
  musicPromptPack: { mood: '', emotionFlow: '', soundKeywords: [], musicStyle: [] },
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(ip, 'analyze-chapter', RATE_LIMITS.default);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await parseRequest(req);

    const forbidden = validateOrigin(req, !!body.apiKey);
    if (forbidden) return forbidden;

    const apiKey = resolveServerProviderKey('gemini', body.apiKey);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Add your key in Settings.' },
        { status: 401 },
      );
    }

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'Manuscript content is required.' }, { status: 400 });
    }

    const language = getLanguage(body.language);
    const model = getModel(body.model);
    const prompt = buildAnalysisPrompt(content, language);

    const result = await generateJson(apiKey, model, prompt, FULL_ANALYSIS_SCHEMA, EMPTY_FALLBACK);

    // tension / emotion intensity 값 정규화 (Gemini가 가끔 다른 문자열을 반환)
    const validIntensity = new Set(['low', 'mid', 'high', 'extreme']);
    const validPresence = new Set(['direct', 'indirect', 'mentioned', 'absent']);

    if (result.sceneState && !validIntensity.has(result.sceneState.tension)) {
      result.sceneState.tension = 'mid';
    }
    if (Array.isArray(result.characterState)) {
      result.characterState = result.characterState.map((c) => ({
        ...c,
        presence: (c.presence && validPresence.has(c.presence)) ? c.presence : 'direct',
        emotion: {
          primary: c.emotion?.primary ?? '',
          intensity: (c.emotion?.intensity && validIntensity.has(c.emotion.intensity)) ? c.emotion.intensity : 'mid',
        },
      }));
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API:analyze-chapter]', error instanceof Error ? error.message : error);
    const status =
      /Request too large/i.test(message) ? 413
      : /Invalid JSON/i.test(message) ? 400
      : /401|403|unauthorized/i.test(message) ? 401
      : 500;
    return NextResponse.json({ error: message.slice(0, 240) }, { status });
  }
}