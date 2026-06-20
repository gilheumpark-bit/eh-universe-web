import type { AppLanguage, StoryConfig } from '../lib/studio-types';
import { formatSocialProfile } from './social-register';
import { pickLang } from './pipeline-prompt-blocks';

interface CharacterPromptBlocks {
  characterDNA: string;
  tier2Block: string;
  tier2DetailBlock: string;
  tier3DetailBlock: string;
  charRelations: string;
}

const MAX_CHARACTERS = 20;

const CHAR_LABELS: Record<string, Record<AppLanguage, string>> = {
  personality: { KO: '성격', EN: 'Personality', JP: '性格', CN: '性格' },
  speechStyle: { KO: '말투', EN: 'Speech style', JP: '口調', CN: '语气' },
  speechExample: { KO: '대사 예시', EN: 'Dialogue example', JP: '台詞例', CN: '台词示例' },
  desire: { KO: '욕망', EN: 'Desire', JP: '欲望', CN: '欲望' },
  deficiency: { KO: '결핍', EN: 'Deficiency', JP: '欠乏', CN: '缺陷' },
  conflict: { KO: '갈등', EN: 'Conflict', JP: '葛藤', CN: '冲突' },
  values: { KO: '가치관/금지선', EN: 'Values / Red lines', JP: '価値観/禁忌', CN: '价值观/底线' },
  changeArc: { KO: '변화 방향', EN: 'Change arc', JP: '変化の方向', CN: '变化方向' },
  strength: { KO: '강점', EN: 'Strength', JP: '強み', CN: '优势' },
  weakness: { KO: '약점', EN: 'Weakness', JP: '弱み', CN: '弱点' },
  backstory: { KO: '과거', EN: 'Backstory', JP: '過去', CN: '过去' },
  appearance: { KO: '외형', EN: 'Appearance', JP: '外見', CN: '外形' },
  failureCost: { KO: '실패 대가', EN: 'Failure cost', JP: '失敗の代償', CN: '失败代价' },
  currentProblem: { KO: '현재 문제', EN: 'Current problem', JP: '現在の問題', CN: '当前问题' },
  emotionStyle: { KO: '감정 스타일', EN: 'Emotion style', JP: '感情表現', CN: '情感风格' },
  relationPattern: { KO: '관계 패턴', EN: 'Relation pattern', JP: '関係パターン', CN: '关系模式' },
  symbol: { KO: '상징', EN: 'Symbol', JP: '象徴', CN: '象征' },
  secret: { KO: '비밀', EN: 'Secret', JP: '秘密', CN: '秘密' },
  externalPerception: { KO: '외부 인식', EN: 'External perception', JP: '外部認識', CN: '外部印象' },
  noCharacters: { KO: '등록된 캐릭터 없음', EN: 'No characters registered', JP: 'キャラクター未登録', CN: '未注册角色' },
};

const REL_LABELS: Record<string, Record<AppLanguage, string>> = {
  lover: { KO: '연인', EN: 'Lover', JP: '恋人', CN: '恋人' },
  rival: { KO: '라이벌', EN: 'Rival', JP: 'ライバル', CN: '对手' },
  friend: { KO: '친구', EN: 'Friend', JP: '友人', CN: '朋友' },
  enemy: { KO: '적', EN: 'Enemy', JP: '敵', CN: '敌人' },
  family: { KO: '가족', EN: 'Family', JP: '家族', CN: '家人' },
  mentor: { KO: '사제', EN: 'Mentor', JP: '師弟', CN: '师徒' },
  subordinate: { KO: '상하', EN: 'Superior-subordinate', JP: '上下', CN: '上下级' },
};

const TIER1_KEYS = ['desire', 'deficiency', 'conflict', 'values', 'changeArc'] as const;
const TIER2_KEYS = ['strength', 'weakness', 'backstory', 'failureCost', 'currentProblem'] as const;
const TIER3_KEYS = ['emotionStyle', 'relationPattern', 'symbol', 'secret', 'externalPerception'] as const;

type StoryCharacter = StoryConfig['characters'][number];

function characterLabel(key: string, language: AppLanguage): string {
  return CHAR_LABELS[key]?.[language] ?? CHAR_LABELS[key]?.EN ?? key;
}

function hasAnyField(character: StoryCharacter, keys: readonly string[]): boolean {
  return keys.some(key => Boolean((character as unknown as Record<string, unknown>)[key]));
}

function dispatchCharacterTruncation(total: number): void {
  if (total <= MAX_CHARACTERS || typeof window === 'undefined') return;
  const dropped = total - MAX_CHARACTERS;
  window.dispatchEvent(new CustomEvent('noa:character-truncated', {
    detail: { total, included: MAX_CHARACTERS, dropped },
  }));
}

function buildMainCharacterBlock(
  config: StoryConfig,
  injectedCharacters: StoryCharacter[],
  language: AppLanguage,
): string {
  if (injectedCharacters.length === 0) {
    return `  ${characterLabel('noCharacters', language)}`;
  }

  const prefix = config.characters.length > MAX_CHARACTERS
    ? `  [NOTE: Showing top ${MAX_CHARACTERS} of ${config.characters.length} characters]\n`
    : '';

  return prefix + injectedCharacters.map(character => {
    let entry = `  - ${character.name} (${character.role}): ${character.traits}. DNA: ${character.dna}`;
    if (character.appearance) entry += `\n    ${characterLabel('appearance', language)}: ${character.appearance}`;
    if (character.personality) entry += `\n    ${characterLabel('personality', language)}: ${character.personality}`;
    if (character.speechStyle) entry += `\n    ${characterLabel('speechStyle', language)}: ${character.speechStyle}`;
    if (character.speechExample) entry += `\n    ${characterLabel('speechExample', language)}: ${character.speechExample}`;
    if (character.desire) entry += `\n    ${characterLabel('desire', language)}: ${character.desire}`;
    if (character.deficiency) entry += `\n    ${characterLabel('deficiency', language)}: ${character.deficiency}`;
    if (character.conflict) entry += `\n    ${characterLabel('conflict', language)}: ${character.conflict}`;
    if (character.values) entry += `\n    ${characterLabel('values', language)}: ${character.values}`;
    if (character.changeArc) entry += `\n    ${characterLabel('changeArc', language)}: ${character.changeArc}`;
    if (character.socialProfile) {
      entry += `\n    ${formatSocialProfile(character.socialProfile, character.name, language)}`;
    }
    return entry;
  }).join('\n');
}

function buildTier2DetailBlock(injectedCharacters: StoryCharacter[], language: AppLanguage): string {
  const tier2DetailCharacters = injectedCharacters.filter(character => hasAnyField(character, TIER2_KEYS));
  if (tier2DetailCharacters.length === 0) return '';

  return `\n[CHARACTERS — ${pickLang(language, { KO: '심층 설정 (Tier 2)', EN: 'Deep Profile (Tier 2)', JP: '深層設定 (Tier 2)', CN: '深度设定 (Tier 2)' })}]\n` +
    tier2DetailCharacters.map(character => {
      const parts: string[] = [`  - ${character.name}`];
      if (character.strength) parts.push(`    ${characterLabel('strength', language)}: ${character.strength}`);
      if (character.weakness) parts.push(`    ${characterLabel('weakness', language)}: ${character.weakness}`);
      if (character.backstory) parts.push(`    ${characterLabel('backstory', language)}: ${character.backstory}`);
      if (character.failureCost) parts.push(`    ${characterLabel('failureCost', language)}: ${character.failureCost}`);
      if (character.currentProblem) parts.push(`    ${characterLabel('currentProblem', language)}: ${character.currentProblem}`);
      return parts.join('\n');
    }).join('\n');
}

function buildTier3DetailBlock(injectedCharacters: StoryCharacter[], language: AppLanguage): string {
  const tier3DetailCharacters = injectedCharacters.filter(character => hasAnyField(character, TIER3_KEYS));
  if (tier3DetailCharacters.length === 0) return '';

  return `\n[CHARACTERS — ${pickLang(language, { KO: '상징/비밀 (Tier 3)', EN: 'Symbol / Secret (Tier 3)', JP: '象徴/秘密 (Tier 3)', CN: '象征/秘密 (Tier 3)' })}]\n` +
    tier3DetailCharacters.map(character => {
      const parts: string[] = [`  - ${character.name}`];
      if (character.emotionStyle) parts.push(`    ${characterLabel('emotionStyle', language)}: ${character.emotionStyle}`);
      if (character.relationPattern) parts.push(`    ${characterLabel('relationPattern', language)}: ${character.relationPattern}`);
      if (character.symbol) parts.push(`    ${characterLabel('symbol', language)}: ${character.symbol}`);
      if (character.secret) parts.push(`    ${characterLabel('secret', language)}: ${character.secret}`);
      if (character.externalPerception) parts.push(`    ${characterLabel('externalPerception', language)}: ${character.externalPerception}`);
      return parts.join('\n');
    }).join('\n');
}

function buildTier2CharacterList(tier2Characters: StoryCharacter[], language: AppLanguage): string {
  if (tier2Characters.length === 0) return '';

  return `\n  [${pickLang(language, { KO: '기타 등장인물 (간략)', EN: 'Other Characters (brief)', JP: 'その他の登場人物 (簡略)', CN: '其他登场角色 (简略)' })}]\n` +
    tier2Characters.map(character => `  - ${character.name} (${character.role})`).join('\n');
}

function buildCharacterRelations(
  config: StoryConfig,
  injectedCharacters: StoryCharacter[],
  language: AppLanguage,
): string {
  const injectedCharacterIds = new Set(injectedCharacters.map(character => character.id));
  const filteredRelations = (config.charRelations ?? []).filter(
    relation => injectedCharacterIds.has(relation.from) && injectedCharacterIds.has(relation.to),
  );

  if (filteredRelations.length === 0) return '';

  return filteredRelations.map(relation => {
    const fromName = injectedCharacters.find(character => character.id === relation.from)?.name || relation.from;
    const toName = injectedCharacters.find(character => character.id === relation.to)?.name || relation.to;
    const label = REL_LABELS[relation.type]?.[language] ?? REL_LABELS[relation.type]?.EN ?? relation.type;
    let mapStr = `  - ${fromName} ⇄ ${toName}: ${label}${relation.desc ? ` (${relation.desc})` : ''}`;
    if (relation.dynamicSpeechStyle) {
      mapStr += `\n    └ ${pickLang(language, { KO: '대화 톤 지시', EN: 'Speech Rule', JP: '会話トーン指示', CN: '对话语气指示' })} (${fromName} -> ${toName}): ${relation.dynamicSpeechStyle}`;
    }
    return mapStr;
  }).join('\n');
}

export function buildCharacterPromptBlocks(config: StoryConfig, language: AppLanguage): CharacterPromptBlocks {
  const activeNames = new Set(config.sceneDirection?.activeCharacters || []);
  const hasActiveSelection = activeNames.size > 0;

  const injectedCharacters = hasActiveSelection
    ? config.characters.filter(character => activeNames.has(character.name)).slice(0, MAX_CHARACTERS)
    : config.characters.length > MAX_CHARACTERS
      ? config.characters.slice(0, MAX_CHARACTERS)
      : config.characters;

  const tier2Characters = hasActiveSelection
    ? config.characters.filter(character => !activeNames.has(character.name)).slice(0, 30)
    : [];

  dispatchCharacterTruncation(config.characters.length);
  void TIER1_KEYS;

  return {
    characterDNA: buildMainCharacterBlock(config, injectedCharacters, language),
    tier2Block: buildTier2CharacterList(tier2Characters, language),
    tier2DetailBlock: buildTier2DetailBlock(injectedCharacters, language),
    tier3DetailBlock: buildTier3DetailBlock(injectedCharacters, language),
    charRelations: buildCharacterRelations(config, injectedCharacters, language),
  };
}
