/**
 * codex-prompts/en.ts — Western fantasy/epic codex domain.
 *
 * Conventions: sword & sorcery, chosen-one, prophecy, kingdom-vs-empire,
 * Tolkien/Sanderson/Martin lineage. Items use D&D-style rarity.
 *
 * All prompts are written in natural English — user decision (2026-05-10):
 *   "do not corrupt grammar of any language". Direct English commands,
 *   not translated from Korean.
 *
 * [C] Native English imperative mood throughout
 * [G] Plain template literals, zero runtime cost
 * [K] Implements the same 7-builder CodexDomainPrompts interface
 */

import type {
  CodexDomainPrompts,
  CharactersPromptInput,
  ItemsPromptInput,
  SkillsPromptInput,
  MagicSystemsPromptInput,
  WorldDesignPromptInput,
  WorldSimPromptInput,
  SceneDirectionPromptInput,
} from './types';

// ============================================================
// PART 1 — Characters
// ============================================================

function buildCharactersPrompt(input: CharactersPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[NO DUPLICATES] These characters already exist. Generate completely different new ones:\n${input.existingNames.join(', ')}`
    : '';

  return `You are a Western fantasy/epic novel character generator.

Genre: ${input.genre}
World synopsis: ${input.synopsis}

Generate exactly ${input.count} multi-dimensional characters as a JSON array.

[role field — exactly one of]
- "protagonist": main viewpoint hero (1-2)
- "antagonist": principal opposing force, with their own logic (1-2)
- "ally": companion / party member supporting the protagonist
- "rival": equal-stature competitor in the same domain
- "mentor": guide with hidden past or secret
- "regressor": time-traveler or returnee with future knowledge (regression-genre only)
- "extra": minor or background figure

[Required fields]
- name: a Western fantasy name (Anglo / Gaelic / Latinate / invented — fits the world)
- role: one of the enum above
- traits: 3-5 personality keywords, comma-separated
- appearance: 1-2 sentence description of looks and attire
- dna: narrative potential score 0-100 (integer)
- desire: what the character desperately wants (1 sentence)
- deficiency: what they fundamentally lack (1 sentence)
- conflict: their central conflict throughout the story (1 sentence)
- changeArc: how they transform by the end (1 sentence)
- values: core beliefs and lines they will not cross (1 sentence)

[Western fantasy conventions]
- Protagonist often answers a call to adventure or breaks from a quiet origin
- Antagonist embodies an ideology or wields institutional power, not pure evil
- Mentor figures carry buried failures or oaths from a prior age
- Inter-character bonds set up oaths, betrayals, or prophecies for later payoff${existing}

Output the JSON array only. No prose, no markdown fences, no commentary.`;
}

// ============================================================
// PART 2 — Items
// ============================================================

function buildItemsPrompt(input: ItemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[NO DUPLICATES] Existing items: ${input.existingNames.join(', ')}`
    : '';

  return `You are a Western fantasy item generator.

Genre: ${input.genre}
World synopsis: ${input.synopsis}

Generate ${input.count} unique items consistent with the world as a JSON array.

[category — exactly one of]
- "weapon" / "armor" / "accessory" / "consumable" / "material" / "quest" / "misc"

[rarity — exactly one of]
- "common" / "uncommon" / "rare" / "epic" / "legendary" / "mythic"

[Required fields]
- name: an evocative Western fantasy name (e.g. "Aelthorn's Edge", "Crown of Ashen Light")
- category: enum above
- rarity: enum above
- description: what the item is and its history (2-3 sentences)
- effect: what it does mechanically or narratively
- obtainedFrom: where or how it can be found (ruin, dragon-hoard, lost expedition, etc.)
- worldConnection: how this item ties into the world's lore (1-2 sentences)
- flavorText: an in-world inscription, song line, or oath (1 sentence)

[Western fantasy conventions]
- Legendary and mythic items carry the names of ancient heroes, fallen gods, or lost kings
- Common and uncommon items still have meaningful narrative function — never filler
- Sword & sorcery: prefer blades, talismans, grimoires, alchemical reagents
- High fantasy: prefer regalia, sigils, sealed weapons, and divine relics${existing}

Output the JSON array only. No prose, no markdown fences, no commentary.`;
}

// ============================================================
// PART 3 — Skills
// ============================================================

function buildSkillsPrompt(input: SkillsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[NO DUPLICATES] Existing skills: ${input.existingNames.join(', ')}`
    : '';

  return `You are a Western fantasy skill / spell / ability generator.

Genre: ${input.genre}
World synopsis: ${input.synopsis}

Generate ${input.count} unique skills, spells, or abilities as a JSON array.

[type — exactly one of]
- "active": deliberately invoked
- "passive": always-on or triggered automatically
- "ultimate": climactic spell with long cooldown or steep cost

[Required fields]
- name: skill or spell name (Latinate, archaic, or invented works well)
- type: enum above
- owner: character class or archetype that wields it (e.g. "Knight-Errant", "Storm-mage", "Inquisitor")
- description: how it is performed and how it appears (2-3 sentences)
- cost: resource consumed (mana, vigor, blood, sanity, faith, etc.)
- cooldown: usage limitation (e.g. "once per moon", "exhausts the caster for a day")
- rank: power tier (e.g. "Master-rank", "Tier-3 incantation", "Forbidden art")

[Western fantasy conventions]
- Sword & sorcery: martial techniques, combat stances, blood pacts
- High fantasy: schools of magic (evocation, abjuration, divination, etc.)
- Grimdark: pacts, costs paid in flesh or memory
- Epic fantasy: oaths, sworn powers, legacy abilities${existing}

Output the JSON array only. No prose, no markdown fences, no commentary.`;
}

// ============================================================
// PART 4 — Magic / power systems
// ============================================================

function buildMagicSystemsPrompt(input: MagicSystemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[NO DUPLICATES] Existing systems: ${input.existingNames.join(', ')}`
    : '';

  return `You are a Western fantasy magic / power system designer.

Genre: ${input.genre}
World synopsis: ${input.synopsis}

Design ${input.count} core magic, divine, or power systems consistent with the world. Output as a JSON array.

[Required fields]
- name: system name (e.g. "Aetheric Weaving", "Stormcalling", "The Nine Circles")
- source: where the energy comes from (ley lines, divine grace, planar resonance, soul, etc.)
- rules: how it is learned and channeled (2-3 sentences)
- limitations: critical costs, side-effects, or weaknesses (1-2 sentences)
- ranks: array of 3-5 ascending tiers

[Western fantasy convention examples for ranks]
- Classical mage progression: ["Apprentice", "Journeyman", "Adept", "Master", "Archmage"]
- Circle-based: ["1st Circle", "2nd Circle", "3rd Circle", "4th Circle", "5th Circle"]
- Divine: ["Initiate", "Acolyte", "Ordained", "Hierophant", "Saint"]
- Sword discipline: ["Trainee", "Squire", "Knight", "Champion", "Legend"]
- Druidic: ["Whisperer", "Speaker", "Shaper", "Voice", "Ancient"]${existing}

Output the JSON array only. No prose, no markdown fences, no commentary.`;
}

// ============================================================
// PART 5 — World design
// ============================================================

function buildWorldDesignPrompt(input: WorldDesignPromptInput): string {
  const hints = input.hints;
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
  const hintBlock = hintParts.length > 0 ? `\n\n[Author hints — incorporate these]\n${hintParts.join('\n')}` : '';

  return `You are a Western fantasy / epic world designer.

Genre: ${input.genre}

Design an original, detailed world consistent with the genre. Fill every field — no empties.
Honor Western fantasy conventions but avoid stale cliché.

[Basic info — required]
- title: a compelling, original title (1 line)
- povCharacter: protagonist name and brief sketch (1-2 sentences)
- setting: where and when the story unfolds (1-2 sentences)
- primaryEmotion: dominant emotional register (one word or short phrase)
- synopsis: full story summary (3-4 sentences)

[Tier 1 — Core]
- corePremise: the single rule that distinguishes this world from reality (2-3 sentences)
- powerStructure: who holds power and how it is preserved (2-3 sentences)
- currentConflict: the central conflict driving the world right now (2-3 sentences)

[Tier 2 — Systems]
- worldHistory: defining historical events that shaped the world (2-3 sentences)
- socialSystem: class, custom, education, justice (2-3 sentences)
- economy: resources, currency, trade, daily livelihoods (2-3 sentences)
- magicTechSystem: core magic or technology — principles and limits (2-3 sentences)
- factionRelations: major faction conflicts and alliances (2-3 sentences)
- survivalEnvironment: geography, climate, hazards (2-3 sentences)

[Tier 3 — Detail]
- culture: rituals, art, customs (1-2 sentences)
- religion: belief and mythology (1-2 sentences)
- education: how knowledge is preserved and passed on (1-2 sentences)
- lawOrder: enforcement, punishment, justice (1-2 sentences)
- taboo: what is absolutely forbidden (1-2 sentences)
- dailyLife: an ordinary day from waking to sleep (1-2 sentences)
- travelComm: travel time between hubs, speed of information (1-2 sentences)
- truthVsBeliefs: what people believe vs what is actually true (1-2 sentences)

[Western fantasy guidance]
- High fantasy: kingdoms, prophecies, ancient orders, sealed evils
- Sword & sorcery: city-states, blood-magic, mercenary creeds, lost ruins
- Grimdark: collapsing institutions, moral ambiguity, costly magic
- Romantic fantasy: courtly intrigue, sworn bonds, dynastic stakes${hintBlock}

Output the JSON object only. No prose, no markdown fences, no commentary.`;
}

// ============================================================
// PART 6 — World simulation (civilizations & relations)
// ============================================================

function buildWorldSimPrompt(input: WorldSimPromptInput): string {
  const ctx = input.worldContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`World premise: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`Power structure: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`Central conflict: ${ctx.currentConflict}`);
  if (ctx?.factionRelations) ctxParts.push(`Known faction relations: ${ctx.factionRelations}`);
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[World framework]\n${ctxParts.join('\n')}\nDesign civilizations and factions that reflect this framework.`
    : '';

  return `You are a Western fantasy civilization and faction simulator.

Genre: ${input.genre}
Synopsis: ${input.synopsis}

Generate 3-4 civilizations / factions and the relationships between them as a JSON object.

[civilizations array — required fields per object]
- name: civilization, kingdom, order, or faction name
- era: the era they belong to (e.g. "Pre-Cataclysm", "Current age", "Twilight of the Crown")
- traits: 3-5 trait keywords as an array of strings

[relations array — required fields per object]
- from: source faction (must match a civilizations.name)
- to: target faction (must match a civilizations.name)
- type: relationship type (e.g. "alliance", "war", "vassalage", "blood-feud", "neutral", "trade pact")

[Western fantasy convention examples]
- Kingdom-vs-empire / kingdom-vs-coalition / kingdom-vs-rebellion
- Holy order vs heretical sect / mage college rivalry
- Free cities vs feudal crowns
- Living kingdom vs ancient sleeping power${ctxBlock}

Output the JSON object only. No prose, no markdown fences, no commentary.`;
}

// ============================================================
// PART 7 — Scene direction
// ============================================================

function buildSceneDirectionPrompt(input: SceneDirectionPromptInput): string {
  const ctx = input.tierContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`World premise: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`Power structure: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`World conflict: ${ctx.currentConflict}`);
  if (ctx?.charProfiles?.length) {
    const charBlock = ctx.charProfiles.map((c) =>
      `  - ${c.name}: desire "${c.desire || '?'}", conflict "${c.conflict || '?'}", arc "${c.changeArc || '?'}", red line "${c.values || '?'}"`,
    ).join('\n');
    ctxParts.push(`Character profiles:\n${charBlock}`);
  }
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[Narrative framework]\n${ctxParts.join('\n')}\n\n[Required rules]
- Hooks must connect to character desires or world conflicts
- Cliffhangers must threaten character values or exploit deficiencies
- Tension devices must escalate toward each character's change arc
- Dialogue tone must reflect each character's core conflict`
    : '';

  return `You are a Western fantasy chapter direction designer.

Synopsis: ${input.synopsis}
Main characters: ${input.characters.join(', ')}

Generate comprehensive chapter direction elements as a JSON object.
Include hooks, tension devices, cliffhangers, emotion targets, dialogue tones, foreshadows, dopamine devices, pacing beats, and tension curve.${ctxBlock}

[Output fields]
- hooks: hook devices array (each: position, hookType, desc) — opening, midpoint, end
- goguma: tension/relief beat array (each: type "tension"|"relief", intensity, desc)
- cliffhanger: chapter-ending hook object (cliffType, desc)
- emotionTargets: emotional beat array (each: emotion, intensity 0-10)
- dialogueTones: per-character tone array (each: character, tone)
- foreshadows: setup-and-payoff array (each: planted, payoff)
- dopamineDevices: reward beat array (each: scale "small"|"medium"|"large", device, desc)
- pacings: pacing-beat array (each: section, percent 0-100, desc)
- tensionCurve: tension curve array (each: position 0-100, level 0-100, label)

Generate 2-4 entries per array. Be specific and faithful to Western fantasy chapter rhythm
(prologue hook, midpoint reversal, chapter-end cliffhanger that promises stakes).

Output the JSON object only. No prose, no markdown fences, no commentary.`;
}

// ============================================================
// PART 8 — Export
// ============================================================

export const EN_FANTASY: CodexDomainPrompts = {
  buildCharactersPrompt,
  buildItemsPrompt,
  buildSkillsPrompt,
  buildMagicSystemsPrompt,
  buildWorldDesignPrompt,
  buildWorldSimPrompt,
  buildSceneDirectionPrompt,
};
