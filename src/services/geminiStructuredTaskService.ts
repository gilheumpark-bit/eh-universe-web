import { Type } from '@google/genai';
import { createServerGeminiClient, hasGeminiServerCredentials } from '@/lib/google-genai-server';
import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { SPARK_SERVER_URL } from '@/services/sparkService';

export type StructuredTask = 'characters' | 'worldDesign' | 'worldSim' | 'sceneDirection' | 'items' | 'skills' | 'magicSystems';
export type StoryHints = {
  title?: string; povCharacter?: string; setting?: string; primaryEmotion?: string; synopsis?: string;
  subGenreTags?: string[]; narrativeIntensity?: string; totalEpisodes?: number; platform?: string;
};
export type WorldContext = { corePremise?: string; powerStructure?: string; currentConflict?: string; factionRelations?: string; };
export type SceneTierContext = { charProfiles?: { name: string; desire?: string; conflict?: string; changeArc?: string; values?: string }[]; corePremise?: string; powerStructure?: string; currentConflict?: string; };

const LANGUAGE_NAMES: Record<AppLanguage, string> = { KO: 'Korean', EN: 'English', JP: 'Japanese', CN: 'Chinese' };
const STRUCTURED_GENERATION_TIMEOUT_MS = 60_000;

/** DGX Spark를 통한 JSON 생성 폴백 (자동 재시도 포함) */
async function generateJsonViaSpark<T>(prompt: string, fallback: T): Promise<T> {
  const RETRYABLE = new Set([502, 503, 520, 521, 522, 523, 524]);
  const MAX_RETRIES = 2;
  const DELAYS = [1500, 3000];
  const body = JSON.stringify({
    model: 'Qwen/Qwen2.5-14B-Instruct-AWQ',
    messages: [
      { role: 'system', content: 'You are a creative writing assistant. CRITICAL: Always respond with a single flat JSON object. Use EXACTLY the field names specified in the prompt (e.g. title, synopsis, corePremise). Do NOT nest fields or create your own structure. No markdown, no explanation, just JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 4000, // 14B TTFT ~5초 + 생성 ~20초 = 충분
    stream: false,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, DELAYS[attempt - 1]));

    try {
      const res = await fetch(`${SPARK_SERVER_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'vercel-server',
          'x-user-tier': 'free',
        },
        body,
        signal: AbortSignal.timeout(58_000), // Vercel 60초 maxDuration — 응답 구성 여유 2초
      });

      if (RETRYABLE.has(res.status) && attempt < MAX_RETRIES) continue;

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const isHtml = errText.trimStart().startsWith('<!') || errText.trimStart().startsWith('<html');
        throw new Error(isHtml
          ? `DGX 서버 연결 오류 (${res.status}). ${MAX_RETRIES + 1}회 시도 실패.`
          : `DGX Spark error ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const text = msg?.content || msg?.reasoning_content || '';
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/) || text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[1]) as T; } catch { /* fall through */ }
      }
      try { return JSON.parse(text) as T; } catch {
        throw new Error(`DGX Spark JSON 파싱 실패 — 응답: ${text.slice(0, 200)}`);
      }
    } catch (err) {
      if (err instanceof TypeError && attempt < MAX_RETRIES) continue; // 네트워크 에러 재시도
      throw err;
    }
  }
  return fallback;
}

export async function generateJson<T>(apiKey: string, model: string, prompt: string, responseSchema: object, fallback: T): Promise<T> {
  // Gemini 키도 없고 서버 자격증명도 없으면 DGX Spark 직행
  if (!apiKey && !hasGeminiServerCredentials() && SPARK_SERVER_URL) {
    return generateJsonViaSpark(prompt, fallback);
  }

  const ai = createServerGeminiClient(apiKey);
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema, abortSignal: AbortSignal.timeout(STRUCTURED_GENERATION_TIMEOUT_MS) },
      });
      try { return JSON.parse(response.text || JSON.stringify(fallback)) as T; } catch {
        throw new Error(`Gemini JSON 파싱 실패 — 응답: ${(response.text || '').slice(0, 200)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isRetryable = /500|502|503|504|INTERNAL|resource.*exhausted|deadline|overloaded/i.test(msg);
      if (!isRetryable || attempt === MAX_RETRIES) {
        // Gemini 실패 + DGX 있으면 폴백
        if (SPARK_SERVER_URL) return generateJsonViaSpark(prompt, fallback);
        throw err;
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return fallback;
}

export async function handleCharacters(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 4, existingNames: string[] = []) {
  const existingBlock = existingNames.length > 0 ? `\n\nIMPORTANT: The following characters already exist — DO NOT generate characters with the same or similar names. Create completely NEW and DIFFERENT characters:\nExisting: ${existingNames.join(', ')}` : '';
  const prompt = `
    Based on the genre [${config.genre}] and world setting [${config.synopsis}],
    generate exactly ${count} multidimensional characters in JSON format.
    IMPORTANT: All character names, traits, and appearance descriptions MUST be written in ${LANGUAGE_NAMES[language]}.
    Each character must have a unique narrative role and high narrative potential (dna score 0-100).

    CRITICAL: The "role" field MUST be exactly one of: "hero", "villain", "ally", "extra".
    - "hero": protagonist or main character (1-2 per story)
    - "villain": antagonist or opposing force (1-2 per story)
    - "ally": supporting character who helps the protagonist
    - "extra": minor or neutral character

    For each character, also provide:
    - desire: What they desperately want (their core drive)
    - deficiency: What they fundamentally lack
    - conflict: The central conflict they face in the story
    - changeArc: How they transform by the end of the story
    - values: Their core beliefs and lines they never cross
    ${existingBlock}
  `;
  return generateJson<unknown[]>(apiKey, model, prompt, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING }, role: { type: Type.STRING }, traits: { type: Type.STRING }, appearance: { type: Type.STRING },
        dna: { type: Type.NUMBER }, desire: { type: Type.STRING }, deficiency: { type: Type.STRING }, conflict: { type: Type.STRING },
        changeArc: { type: Type.STRING }, values: { type: Type.STRING },
      },
      required: ['name', 'role', 'traits', 'appearance', 'dna'],
    },
  }, []);
}

export async function handleItems(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 3, existingNames: string[] = []) {
  const existingBlock = existingNames.length > 0 ? `\nExisting items (DO NOT duplicate): ${existingNames.join(', ')}` : '';
  return generateJson<unknown[]>(apiKey, model, `Based on the genre [${config.genre}] and world setting [${config.synopsis}],
generate exactly ${count} unique narrative items, weapons, artifacts, or consumables in ${LANGUAGE_NAMES[language]}.
Each item must be deeply connected to the world's lore and serve a narrative purpose.

For each item provide ALL of the following:
- name: Unique item name
- category: One of "weapon", "armor", "accessory", "consumable", "material", "quest", "misc"
- rarity: One of "common", "uncommon", "rare", "epic", "legendary", "mythic"
- description: What the item is and its history (2-3 sentences)
- effect: What it does mechanically or narratively
- obtainedFrom: Where/how it can be found
- worldConnection: How this item ties into the world's lore (1-2 sentences)
- flavorText: An in-world quote or inscription about this item
${existingBlock}`, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING }, category: { type: Type.STRING }, rarity: { type: Type.STRING }, description: { type: Type.STRING }, effect: { type: Type.STRING }, obtainedFrom: { type: Type.STRING }, worldConnection: { type: Type.STRING }, flavorText: { type: Type.STRING }, },
      required: ['name', 'category', 'rarity', 'description', 'effect'],
    },
  }, []);
}

export async function handleSkills(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 3, existingNames: string[] = []) {
  const existingBlock = existingNames.length > 0 ? `\nExisting skills (DO NOT duplicate): ${existingNames.join(', ')}` : '';
  return generateJson<unknown[]>(apiKey, model, `Based on the genre [${config.genre}] and world setting [${config.synopsis}],
generate exactly ${count} unique and compelling skills/abilities in ${LANGUAGE_NAMES[language]}.

For each skill provide ALL of the following:
- name: The skill or ability's name
- type: Exactly one of "active", "passive", or "ultimate"
- owner: The character or class likely to wield this (placeholder name or archetype)
- description: How the skill is performed and what it looks like (2-3 sentences)
- cost: What it costs to use (mana, stamina, HP, sanity, etc.)
- cooldown: Usage limitations
- rank: Power level or grade (e.g., S-Rank, Level 3)
${existingBlock}`, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, owner: { type: Type.STRING }, description: { type: Type.STRING }, cost: { type: Type.STRING }, cooldown: { type: Type.STRING }, rank: { type: Type.STRING } },
      required: ['name', 'type', 'description'],
    },
  }, []);
}

export async function handleMagicSystems(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 2, existingNames: string[] = []) {
  const existingBlock = existingNames.length > 0 ? `\nExisting magic/power systems (DO NOT duplicate): ${existingNames.join(', ')}` : '';
  return generateJson<unknown[]>(apiKey, model, `Based on the genre [${config.genre}] and world setting [${config.synopsis}],
generate exactly ${count} unique core magic or power systems in ${LANGUAGE_NAMES[language]}.
The system MUST fit the world logically and have clear rules.

For each system provide ALL of the following:
- name: The name of the magic/power system
- source: Where the energy/power comes from (mana core, divine grace, existence density, etc.)
- rules: How it is harnessed and utilized (mechanics)
- limitations: Critical flaws, costs, or side-effects of using it
- ranks: An array of 3 to 5 power tiers or growth stages (e.g. ["1-Circle", "2-Circle", "3-Circle"])
${existingBlock}`, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING }, source: { type: Type.STRING }, rules: { type: Type.STRING }, limitations: { type: Type.STRING }, ranks: { type: Type.ARRAY, items: { type: Type.STRING } } },
      required: ['name', 'source', 'rules', 'limitations', 'ranks'],
    },
  }, []);
}

export async function handleWorldDesign(apiKey: string, model: string, genre: string, language: AppLanguage, hints?: StoryHints) {
  const hintParts: string[] = [];
  if (hints?.title) hintParts.push(`Title hint: "${hints.title}"`);
  if (hints?.povCharacter) hintParts.push(`Main character: "${hints.povCharacter}"`);
  if (hints?.setting) hintParts.push(`Setting: "${hints.setting}"`);
  if (hints?.primaryEmotion) hintParts.push(`Core emotion: "${hints.primaryEmotion}"`);
  if (hints?.synopsis) hintParts.push(`Story synopsis: "${hints.synopsis}"`);
  if (hints?.subGenreTags?.length) hintParts.push(`Sub-genre tags: ${hints.subGenreTags.join(', ')}`);
  if (hints?.narrativeIntensity) hintParts.push(`Narrative intensity: ${hints.narrativeIntensity}`);
  if (hints?.totalEpisodes) hintParts.push(`Total episodes: ${hints.totalEpisodes}`);
  if (hints?.platform) hintParts.push(`Target platform: ${hints.platform}`);
  const hintBlock = hintParts.length > 0 ? `\n\nUSER-PROVIDED HINTS (incorporate these into your generation):\n${hintParts.join('\n')}` : '';

  return generateJson<Record<string, string>>(apiKey, model, `Generate a unique ${genre} story concept in ${LANGUAGE_NAMES[language]}. Be creative, original, and DETAILED.
Fill ALL of the following fields thoroughly — do not leave any empty.

[Basic Info — REQUIRED]
- title: A compelling, unique title for this story (1 sentence)
- povCharacter: The main protagonist's name and brief description (1-2 sentences)
- setting: Where and when this story takes place (1-2 sentences)
- primaryEmotion: The dominant emotional tone of the story (1 word or short phrase)
- synopsis: A captivating 3-4 sentence summary of the entire story

[Tier 1 — Core]
- corePremise: The one key rule that makes this world different from reality (2-3 sentences)
- powerStructure: Who holds power and how it is maintained (2-3 sentences)
- currentConflict: The central conflict driving the world right now (2-3 sentences)

[Tier 2 — Systems]
- worldHistory: Key historical events that shaped this world (2-3 sentences)
- socialSystem: Class structure, culture, education, law and order (2-3 sentences)
- economy: Resources, currency, trade, daily livelihoods (2-3 sentences)
- magicTechSystem: Core abilities/technology — principles and limitations (2-3 sentences)
- factionRelations: Major faction conflicts and alliances (2-3 sentences)
- survivalEnvironment: Geography, climate, hazards (2-3 sentences)

[Tier 3 — Detail]
- culture: Rituals, art, customs (1-2 sentences)
- religion: What people believe, mythology (1-2 sentences)
- education: How knowledge is passed down (1-2 sentences)
- lawOrder: Law enforcement, punishment, justice system (1-2 sentences)
- taboo: Things absolutely forbidden (1-2 sentences)
- dailyLife: A typical day from waking to sleeping (1-2 sentences)
- travelComm: Travel time between cities, speed of information (1-2 sentences)
- truthVsBeliefs: What people believe vs what is actually true (1-2 sentences)
${hintBlock}`, {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING }, povCharacter: { type: Type.STRING }, setting: { type: Type.STRING }, primaryEmotion: { type: Type.STRING }, synopsis: { type: Type.STRING },
      corePremise: { type: Type.STRING }, powerStructure: { type: Type.STRING }, currentConflict: { type: Type.STRING }, worldHistory: { type: Type.STRING }, socialSystem: { type: Type.STRING },
      economy: { type: Type.STRING }, magicTechSystem: { type: Type.STRING }, factionRelations: { type: Type.STRING }, survivalEnvironment: { type: Type.STRING },
      culture: { type: Type.STRING }, religion: { type: Type.STRING }, education: { type: Type.STRING }, lawOrder: { type: Type.STRING }, taboo: { type: Type.STRING }, dailyLife: { type: Type.STRING }, travelComm: { type: Type.STRING }, truthVsBeliefs: { type: Type.STRING },
    },
    required: ['title', 'povCharacter', 'setting', 'primaryEmotion', 'synopsis', 'corePremise', 'powerStructure', 'currentConflict'],
  }, { title: '', povCharacter: '', setting: '', primaryEmotion: '', synopsis: '' });
}

export async function handleWorldSim(apiKey: string, model: string, synopsis: string, genre: string, language: AppLanguage, worldContext?: WorldContext) {
  const contextParts: string[] = [];
  if (worldContext?.corePremise) contextParts.push(`World Premise: ${worldContext.corePremise}`);
  if (worldContext?.powerStructure) contextParts.push(`Power Structure: ${worldContext.powerStructure}`);
  if (worldContext?.currentConflict) contextParts.push(`Central Conflict: ${worldContext.currentConflict}`);
  if (worldContext?.factionRelations) contextParts.push(`Known Faction Relations: ${worldContext.factionRelations}`);
  const contextBlock = contextParts.length > 0 ? `\n\n[World Framework]\n${contextParts.join('\n')}\nCivilizations must reflect this framework.` : '';

  return generateJson<{ civilizations: unknown[]; relations: unknown[] }>(apiKey, model, `Based on this ${genre} story synopsis, generate 3-4 civilizations/factions and their relationships in ${LANGUAGE_NAMES[language]}.\n\nSynopsis: ${synopsis}${contextBlock}`, {
    type: Type.OBJECT,
    properties: {
      civilizations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, era: { type: Type.STRING }, traits: { type: Type.ARRAY, items: { type: Type.STRING } }, }, required: ['name', 'era', 'traits'], }, },
      relations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { from: { type: Type.STRING }, to: { type: Type.STRING }, type: { type: Type.STRING }, }, required: ['from', 'to', 'type'], }, },
    },
    required: ['civilizations', 'relations'],
  }, { civilizations: [], relations: [] });
}

export async function handleSceneDirection(apiKey: string, model: string, synopsis: string, characters: string[], language: AppLanguage, tierContext?: SceneTierContext) {
  const contextParts: string[] = [];
  if (tierContext?.corePremise) contextParts.push(`World Premise: ${tierContext.corePremise}`);
  if (tierContext?.powerStructure) contextParts.push(`Power Structure: ${tierContext.powerStructure}`);
  if (tierContext?.currentConflict) contextParts.push(`World Conflict: ${tierContext.currentConflict}`);
  if (tierContext?.charProfiles?.length) {
    const charBlock = tierContext.charProfiles.map((character) => `  - ${character.name}: wants "${character.desire || '?'}", conflicts with "${character.conflict || '?'}", arc toward "${character.changeArc || '?'}", forbidden line "${character.values || '?'}"`).join('\n');
    contextParts.push(`Character Profiles:\n${charBlock}`);
  }
  const tierBlock = contextParts.length > 0 ? `\n\n[NARRATIVE FRAMEWORK]\n${contextParts.join('\n')}\n\nIMPORTANT RULES:\n- Hooks must connect to character desires or world conflicts\n- Cliffhangers must threaten character values or exploit their deficiencies\n- Tension devices must escalate toward the character's change arc\n- Dialogue tone must reflect each character's core conflict\n` : '';

  return generateJson<Record<string, unknown>>(apiKey, model, `Based on this story, generate COMPREHENSIVE scene direction elements in ${LANGUAGE_NAMES[language]}.
Include hooks, goguma/cider tension devices, cliffhanger, emotion targets, dialogue tones, foreshadowing, dopamine devices, pacing beats, and tension curve.

Synopsis: ${synopsis}
Characters: ${characters.join(', ')}${tierBlock}

Generate multiple items for each array field (2-4 items each). Be specific and detailed.`, {
    type: Type.OBJECT,
    properties: {
      hooks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { position: { type: Type.STRING }, hookType: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['position', 'hookType', 'desc'] }, },
      goguma: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, intensity: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['type', 'intensity', 'desc'] }, },
      cliffhanger: { type: Type.OBJECT, properties: { cliffType: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['cliffType', 'desc'], },
      emotionTargets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { emotion: { type: Type.STRING }, intensity: { type: Type.NUMBER }, }, required: ['emotion', 'intensity'] }, },
      dialogueTones: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { character: { type: Type.STRING }, tone: { type: Type.STRING }, }, required: ['character', 'tone'] }, },
      foreshadows: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { planted: { type: Type.STRING }, payoff: { type: Type.STRING }, }, required: ['planted', 'payoff'] }, },
      dopamineDevices: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { scale: { type: Type.STRING }, device: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['scale', 'device', 'desc'] }, },
      pacings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { section: { type: Type.STRING }, percent: { type: Type.NUMBER }, desc: { type: Type.STRING }, }, required: ['section', 'percent', 'desc'] }, },
      tensionCurve: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { position: { type: Type.NUMBER }, level: { type: Type.NUMBER }, label: { type: Type.STRING }, }, required: ['position', 'level', 'label'] }, },
    },
    required: ['hooks', 'goguma', 'cliffhanger', 'emotionTargets', 'dialogueTones'],
  }, {});
}
