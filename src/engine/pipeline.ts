import { StoryConfig, AppLanguage, StyleProfile } from '../lib/studio-types';
import { EngineReport, PlatformType, getActFromEpisode } from './types';
import { tensionCurve } from './models';
import { generateEngineReport } from './scoring';
import { getTargetCharRange } from './serialization';
import { createT } from '@/lib/i18n';
import { GENRE_BENCHMARKS } from './genre-review';
import { getLanguagePack } from './language-pack';
import { formatSocialProfile } from './social-register';
import { GENRE_PRESETS } from './genre-presets';
import { buildPublishPlatformBlock } from './builders/platform-builder';
import { buildPrismBlock, buildPrismModeBlock } from './builders/prism-builder';
import { GRAMMAR_PACKS } from '@/lib/grammar-packs';
import { buildShadowPrompt } from './shadow';
import { logger } from '@/lib/logger';
import { quickPurify, type TargetLang } from './language-purity';
import { extractPreviousEpisodeSummary } from './previous-episode-extractor';
import { unwrap, getOrigin } from '@/lib/origin-migration';
import type { TaggedField, EntryOrigin } from '@/lib/studio-types';
export { buildPublishPlatformBlock, buildPrismBlock, buildPrismModeBlock };

// ============================================================
// M4 — Origin tag rendering helpers
// ============================================================
//
// Pipeline은 V1/V2 데이터를 모두 받는다.
// V2는 TaggedValue로 래핑되어 있고, V1은 raw 값이다.
// unwrapItem()으로 값만 꺼내고, originTag()로 [USER]/[TEMPLATE]/...
// 태그 문자열을 만든다. 작가가 origin 시스템을 켜지 않은 경우(V1)
// 모든 태그가 [USER]로 표시되므로 결과는 자연스럽다.
// ============================================================

const ORIGIN_TAG_LABELS: Record<EntryOrigin, string> = {
  USER: '[USER]',
  TEMPLATE: '[TEMPLATE]',
  ENGINE_SUGGEST: '[ENGINE_SUGGEST]',
  ENGINE_DRAFT: '[ENGINE_DRAFT]',
};

/** TaggedField 또는 raw 값에서 unwrap된 값 + 태그 문자열을 동시에 반환 */
function describeField<T>(field: TaggedField<T> | T | undefined): { value: T | undefined; tag: string } {
  if (field === undefined || field === null) return { value: undefined, tag: '' };
  const value = unwrap(field as TaggedField<T>);
  const meta = getOrigin(field as TaggedField<T>);
  const refSuffix = meta.sourceReferenceId ? `:${meta.sourceReferenceId}` : '';
  const tag = `${ORIGIN_TAG_LABELS[meta.origin].slice(0, -1)}${refSuffix}]`;
  return { value, tag };
}

/**
 * 씬시트 블록 상단에 출처 태그 가이드 주입.
 * 엔진(AI)이 [USER] / [TEMPLATE] / [ENGINE_SUGGEST] / [ENGINE_DRAFT]를
 * 어떤 우선순위로 다뤄야 하는지 명시한다.
 *
 * - 4언어 지원
 * - 가이드 자체는 오리진 통계가 0 이상일 때만 추가 (의미 없는 노이즈 방지)
 */
function buildOriginGuide(language: AppLanguage): string {
  const guides: Record<AppLanguage, string> = {
    KO: `[출처 태그 해석 규칙]
- [USER] 작가 직접 입력 — 우선 존중. 그대로 반영하라.
- [TEMPLATE] 시스템 기본값 — 덮어쓸 수 있음. 문맥에 맞으면 활용.
- [ENGINE_SUGGEST] 엔진 제안(작가 수락) — 참고 우선, 강요 금지.
- [ENGINE_DRAFT] 엔진 미확정 초안 — 그대로 따라 쓰지 말고 작가 의도 추정.`,
    EN: `[Origin Tag Interpretation Rules]
- [USER] Direct author input — highest priority. Reflect verbatim.
- [TEMPLATE] System defaults — may be overridden. Use if context fits.
- [ENGINE_SUGGEST] Engine suggestion (author-accepted) — reference, do not enforce.
- [ENGINE_DRAFT] Engine draft (unconfirmed) — do not follow blindly; infer author intent.`,
    JP: `[出典タグの解釈ルール]
- [USER] 作家直接入力 — 最優先。そのまま反映せよ。
- [TEMPLATE] システム既定値 — 上書き可。文脈に合えば活用。
- [ENGINE_SUGGEST] エンジン提案(作家承認) — 参考優先、強制禁止。
- [ENGINE_DRAFT] エンジン未確定草案 — 鵜呑みにせず作家意図を推定。`,
    CN: `[来源标签解读规则]
- [USER] 作家直接输入 — 最高优先。照实反映。
- [TEMPLATE] 系统默认值 — 可覆盖。若契合则使用。
- [ENGINE_SUGGEST] 引擎建议（作家已采纳）— 参考为主，不可强制。
- [ENGINE_DRAFT] 引擎未确定草案 — 切勿盲从，需推断作家意图。`,
  };
  return guides[language] ?? guides.KO;
}

// ============================================================
// Dynamic System Instruction Builder
// ============================================================

const LANG_NAMES: Record<AppLanguage, string> = {
  KO: 'Korean (한국어)',
  EN: 'English',
  JP: 'Japanese (日本語)',
  CN: 'Chinese (中文)',
};

/**
 * 언어별 텍스트 픽업 헬퍼.
 * KO/EN/JP/CN 4언어 직접 분기. 누락 키는 KO → EN 순으로 fallback.
 * pipeline.ts 내부의 isKO 2분 분기를 4언어로 확장하기 위한 게이트웨이.
 */
function pickLang(language: AppLanguage, dict: Partial<Record<AppLanguage, string>>): string {
  return dict[language] ?? dict.KO ?? dict.EN ?? '';
}

const ACT_GUIDELINES: Record<number, Record<AppLanguage, string>> = {
  1: {
    KO: '도입부입니다. 세계와 인물을 자연스럽게 소개하고, 일상→균열의 흐름을 만드세요. 정보를 서사에 녹이세요.',
    EN: 'This is the setup. Introduce the world and characters naturally. Create a flow from normalcy to disruption. Weave exposition into narrative.',
    JP: '導入部です。世界と人物を自然に紹介し、日常→亀裂の流れを作ってください。情報を物語に溶け込ませてください。',
    CN: '这是开篇。自然地介绍世界和人物，创造从日常到裂变的流程。将信息融入叙事中。',
  },
  2: {
    KO: '상승 구간입니다. 갈등을 심화시키고, 캐릭터에게 선택을 강요하세요. 서브플롯을 엮으세요.',
    EN: 'Rising action. Deepen conflicts, force characters into choices. Weave in subplots.',
    JP: '上昇局面です。葛藤を深め、キャラクターに選択を迫ってください。サブプロットを織り込んでください。',
    CN: '上升阶段。深化冲突，迫使角色做出选择。编织副线情节。',
  },
  3: {
    KO: '중반 전환점입니다. 반전이나 정보 공개로 이야기의 방향을 틀어주세요. 독자의 기대를 배신하세요.',
    EN: 'Midpoint pivot. Use a twist or revelation to shift the story direction. Subvert reader expectations.',
    JP: '中盤の転換点です。反転や情報公開で物語の方向を変えてください。読者の期待を裏切ってください。',
    CN: '中段转折点。用反转或信息揭露改变故事方向。颠覆读者期待。',
  },
  4: {
    KO: '하강/위기 구간입니다. 상황을 최악으로 몰아가세요. 캐릭터의 내면 갈등이 외부 갈등과 충돌해야 합니다.',
    EN: 'Falling action / crisis. Push things to their worst. Internal conflicts must collide with external ones.',
    JP: '下降・危機局面です。状況を最悪に追い込んでください。キャラクターの内面の葛藤が外部の葛藤と衝突しなければなりません。',
    CN: '下降/危机阶段。将局势推向最坏。角色的内心冲突必须与外部冲突碰撞。',
  },
  5: {
    KO: '절정입니다. 모든 실마리를 수렴시키고, 캐릭터의 최종 선택을 묘사하세요. 감정의 밀도를 극대화하세요.',
    EN: 'Climax. Converge all threads. Depict the character\'s ultimate choice. Maximize emotional density.',
    JP: 'クライマックスです。すべての伏線を収束させ、キャラクターの最終選択を描いてください。感情の密度を最大化してください。',
    CN: '高潮部分。收束所有线索，描绘角色的最终选择。将情感密度最大化。',
  },
};


export function buildGenrePreset(genre: string, language: AppLanguage): string {
  const preset = GENRE_PRESETS[genre] || GENRE_PRESETS.FANTASY;
  const t = createT(language);
  return `[${t('pipeline.genrePresetLabel')}: ${genre}]
- ${t('pipeline.narrativeRules')}: ${preset.rules}
- ${t('pipeline.pacingLabel')}: ${preset.pacing} (${t('pipeline.tensionBaseline')}: ${preset.tensionBase})
- ${t('pipeline.cliffhangerTypes')}: ${preset.cliffTypes}
- ${t('pipeline.emotionFocusLabel')}: ${preset.emotionFocus}
[${t('pipeline.commonRules')}]
- ${t('pipeline.commonRule1')}
- ${t('pipeline.commonRule2')}
- ${t('pipeline.commonRule3')}
- ${t('pipeline.commonRule4')}
- ${t('pipeline.commonRule5')}`;
}

// ============================================================
// Style DNA Builder — from Style Studio settings
// ============================================================

// DNA names per language (4-language). JP/CN inherit EN labels (Hard SF / Web Novel are de-facto pan-Asian terms).
const DNA_NAMES_BY_LANG: Record<AppLanguage, string[]> = {
  KO: ['Hard SF', '웹소설', '문학적', '멀티장르'],
  EN: ['Hard SF', 'Web Novel', 'Literary', 'Multi-Genre'],
  JP: ['ハードSF', 'ウェブ小説', '文学的', 'マルチジャンル'],
  CN: ['硬科幻', '网络小说', '文学性', '多类型'],
};

interface SliderMeta { names: Record<AppLanguage, string>; levels: Record<AppLanguage, string[]>; }
const SLIDER_LABELS: Record<string, SliderMeta> = {
  s1: {
    names: { KO: '문장 길이', EN: 'Sentence Length', JP: '文の長さ', CN: '句子长度' },
    levels: {
      KO: ['짧고 단단하게', '짧은 호흡', '균형', '긴 호흡', '길게 밀어붙이기'],
      EN: ['Tight and short', 'Short breath', 'Balanced', 'Long breath', 'Extended flow'],
      JP: ['短く引き締めて', '短い呼吸', 'バランス', '長い呼吸', '長く押し通す'],
      CN: ['紧凑短促', '短呼吸', '平衡', '长呼吸', '延展铺陈'],
    },
  },
  s2: {
    names: { KO: '감정 밀도', EN: 'Emotional Density', JP: '感情密度', CN: '情感密度' },
    levels: {
      KO: ['감정 절제', '건조한 편', '균형', '정서 강조', '감정 밀도 높음'],
      EN: ['Restrained', 'Dry-leaning', 'Balanced', 'Emotion-forward', 'Emotion-rich'],
      JP: ['感情抑制', '乾いた傾向', 'バランス', '情緒重視', '感情密度高'],
      CN: ['克制情感', '偏冷淡', '平衡', '强调情感', '高密度情感'],
    },
  },
  s3: {
    names: { KO: '묘사 방식', EN: 'Description', JP: '描写方式', CN: '描写方式' },
    levels: {
      KO: ['사실 위주', '직설 묘사', '균형', '이미지 강조', '감각 몰입'],
      EN: ['Factual', 'Direct', 'Balanced', 'Image-leaning', 'Sensory immersion'],
      JP: ['事実中心', '直接描写', 'バランス', 'イメージ重視', '感覚没入'],
      CN: ['事实为主', '直接描写', '平衡', '强调意象', '感官沉浸'],
    },
  },
  s4: {
    names: { KO: '서술 시점', EN: 'Narrative Distance', JP: '叙述視点', CN: '叙述视角' },
    levels: {
      KO: ['멀리 조망', '관찰자 시점', '균형', '인물 밀착', '내면 침투'],
      EN: ['Panoramic', 'Observer', 'Balanced', 'Close POV', 'Deep interior'],
      JP: ['遠景俯瞰', '観察者視点', 'バランス', '人物密着', '内面浸透'],
      CN: ['远观全景', '观察者视角', '平衡', '贴近角色', '深入内心'],
    },
  },
  s5: {
    names: { KO: '어휘 수준', EN: 'Vocabulary', JP: '語彙水準', CN: '词汇水准' },
    levels: {
      KO: ['편한 말맛', '담백한 어휘', '균형', '정교한 어휘', '전문적 질감'],
      EN: ['Plainspoken', 'Clean', 'Balanced', 'Refined', 'Specialized'],
      JP: ['平易な語感', 'あっさりした語彙', 'バランス', '精緻な語彙', '専門的質感'],
      CN: ['通俗易懂', '简洁词汇', '平衡', '精致词汇', '专业质感'],
    },
  },
};

export function buildStyleDNA(profile: StyleProfile | undefined, language: AppLanguage): string {
  if (!profile || profile.selectedDNA.length === 0) return '';

  const t = createT(language);
  const parts: string[] = [];

  // DNA identity — 언어별 표기 (4-language)
  const dnaNamesPack = DNA_NAMES_BY_LANG[language] ?? DNA_NAMES_BY_LANG.EN;
  const dnaNames = profile.selectedDNA.map(i => dnaNamesPack[i] ?? DNA_NAMES_BY_LANG.EN[i]).join(' + ');
  parts.push(`- ${t('pipeline.styleIdentity')}: ${dnaNames}`);

  // Slider parameters — clamp to valid 1-5 range to prevent out-of-bounds crash
  if (profile.sliders) {
    const sliderParts: string[] = [];
    for (const [key, rawVal] of Object.entries(profile.sliders)) {
      const meta = SLIDER_LABELS[key];
      if (!meta) continue;
      const val = Math.max(1, Math.min(5, rawVal));
      const levels = meta.levels[language] ?? meta.levels.EN;
      const name = meta.names[language] ?? meta.names.EN;
      const label = levels[val - 1] ?? meta.levels.EN[val - 1];
      sliderParts.push(`${name}: ${label} (${val}/5)`);
    }
    if (sliderParts.length > 0) {
      parts.push(`- ${t('pipeline.styleParams')}: ${sliderParts.join(', ')}`);
    }
  }

  // Style directives based on DNA selections
  const directives: string[] = [];
  if (profile.selectedDNA.includes(0)) {
    directives.push(t('pipeline.hardSfDirective'));
  }
  if (profile.selectedDNA.includes(1)) {
    directives.push(t('pipeline.webNovelDirective'));
  }
  if (profile.selectedDNA.includes(2)) {
    directives.push(t('pipeline.literaryDirective'));
  }
  if (profile.selectedDNA.includes(3)) {
    directives.push(t('pipeline.multiGenreDirective'));
  }
  if (directives.length > 0) {
    parts.push(`- ${t('pipeline.styleDirectives')}:\n  ${directives.join('\n  ')}`);
  }

  return '\n[STYLE DNA — 문체 스튜디오]\n' + parts.join('\n');
}

// ============================================================
// Publish Platform Prompt Builder
// ============================================================

/** 언어팩 라벨 — 4개 언어 네이티브 표기 */
const LANG_PACK_LABELS: Record<AppLanguage, {
  header: string; banned: string; aiTone: string;
  dialogue: string; rhythm: string; wordUnit: string;
}> = {
  KO: { header: '언어팩 규칙', banned: '인과율 금지어', aiTone: 'AI 톤 금지 표현', dialogue: '대화 마커', rhythm: '문장 리듬', wordUnit: '단어' },
  EN: { header: 'Language Pack Rules', banned: 'Banned causality words', aiTone: 'AI tone forbidden phrases', dialogue: 'Dialogue markers', rhythm: 'Sentence rhythm', wordUnit: 'words' },
  JP: { header: '言語パックルール', banned: '因果律禁止語', aiTone: 'AIトーン禁止表現', dialogue: '対話マーカー', rhythm: '文章リズム', wordUnit: '単語' },
  CN: { header: '语言包规则', banned: '因果律禁用词', aiTone: 'AI 语调禁止表达', dialogue: '对话标记', rhythm: '句子节奏', wordUnit: '词' },
};

export function buildLanguagePackBlock(language: AppLanguage): string {
  const pack = getLanguagePack(language);
  const L = LANG_PACK_LABELS[language] ?? LANG_PACK_LABELS.EN;
  const parts: string[] = [];

  parts.push(`\n[${L.header}: ${pack.id}]`);
  if (pack.bannedWords.length > 0) {
    parts.push(`- ${L.banned}: ${pack.bannedWords.join(', ')}`);
  }
  if (pack.aiTonePatterns.length > 0) {
    parts.push(`- ${L.aiTone}: ${pack.aiTonePatterns.join(', ')}`);
  }
  parts.push(`- ${L.dialogue}: ${pack.dialogueMarkers.open}...${pack.dialogueMarkers.close}`);
  parts.push(`- ${L.rhythm}: ${pack.sentenceRhythm.minWords}~${pack.sentenceRhythm.maxWords} ${L.wordUnit}`);

  return parts.join('\n');
}

// ============================================================
// EH Engine v1.4 — Rule Level System (Lv1~5)
// Lv1: 미적용, Lv2: 10%, Lv3: 20%, Lv4: 30%, Lv5: 40%
// ============================================================

/** EH 룰 설명 — 4개 언어 네이티브 표기 */
const EH_RULE_NOTES: Record<AppLanguage, {
  costIntensity: (pct: number) => string;
  narrativeMorph: string;
  lv9Full: string;
}> = {
  KO: {
    costIntensity: (pct) => `대가 강도: ${pct}%. 이 비율만큼 주인공의 성장/이득에 대한 손실을 서술에 반영하라.`,
    narrativeMorph: `EH 수치가 낮아질수록 감정 형용사를 줄이고 행동/팩트 위주로 서술하라.`,
    lv9Full: `EH v1.0 원본 100% 적용. 모든 보상에 등가의 대가를 강제. 자비 없음.`,
  },
  EN: {
    costIntensity: (pct) => `Cost intensity: ${pct}%. Apply this ratio of loss against protagonist's gains.`,
    narrativeMorph: `As EH drops, reduce emotional adjectives. Focus on actions and facts.`,
    lv9Full: `EH v1.0 original 100% applied. Every reward demands equivalent cost. No mercy.`,
  },
  JP: {
    costIntensity: (pct) => `代償強度: ${pct}%. この比率で主人公の成長・利得に対する損失を描写に反映せよ。`,
    narrativeMorph: `EH数値が下がるほど感情形容詞を減らし、行動・事実中心に記述せよ。`,
    lv9Full: `EH v1.0 原本100%適用。すべての報酬に等価の代償を強制。容赦なし。`,
  },
  CN: {
    costIntensity: (pct) => `代价强度: ${pct}%。按此比例将主角的成长/收益损失体现在叙述中。`,
    narrativeMorph: `EH 数值越低，越应减少情感形容词，以行动/事实为主进行叙述。`,
    lv9Full: `EH v1.0 原版 100% 应用。每次奖励都强制等价代价。绝无宽恕。`,
  },
};

export function buildEHRules(ruleLevel: number, language: AppLanguage): string {
  if (ruleLevel <= 1) return '';

  const t = createT(language);
  const notes = EH_RULE_NOTES[language] ?? EH_RULE_NOTES.EN;
  const sections: string[] = [];

  // 9단계 적용률 매핑: lv1=0%, lv2=15%, lv3=25%, lv4=35%, lv5=50%, lv6=65%, lv7=75%, lv8=90%, lv9=100%
  const PCT_MAP: Record<number, number> = { 1: 0, 2: 15, 3: 25, 4: 35, 5: 50, 6: 65, 7: 75, 8: 90, 9: 100 };
  const GENRE_MAP: Record<number, string> = { 2: "먼치킨/무쌍", 3: "로맨스", 4: "아카데미", 5: "헌터/각성", 6: "회귀물", 7: "다크 판타지", 8: "디스토피아", 9: "순문학" };
  const pct = PCT_MAP[ruleLevel] ?? 0;
  const costMul = Math.max(0, (pct - 25) / 75);  // 대가 승수 0.0~1.0

  // Lv2+: 금지어 차단 (The Enforcer)
  if (ruleLevel >= 2) {
    sections.push(`[${t('pipeline.enforcerHeader')} Lv${ruleLevel}]\n${t('pipeline.enforcerBody')}`);
  }

  // Lv3+: 대가 정산 (Cost Infliction) — 승수 적용
  if (ruleLevel >= 3) {
    const costNote = notes.costIntensity(Math.round(costMul * 100));
    sections.push(`[${t('pipeline.costInflictionHeader')}]\n${t('pipeline.costInflictionBody')}\n${costNote}`);
  }

  // Lv5+: 시점 제한 시작
  if (ruleLevel >= 5) {
    sections.push(`[${t('pipeline.narrativeLockHeader')}]\n${t('pipeline.narrativeLockBody')}`);
  }

  // Lv6+: 문체 변환 + 마스킹
  if (ruleLevel >= 6) {
    sections.push(`[NARRATIVE MASKING LAYER]\n${t('pipeline.narrativeMaskingBody')}\n${notes.narrativeMorph}`);
  }

  // Lv7+: 이중 로그 + 글리치
  if (ruleLevel >= 7) {
    sections.push(`[DUAL-LOG SYSTEM]\n${t('pipeline.dualLogBody')}`);
  }

  // Lv8+: 자격 박탈 + 세계 붕괴
  if (ruleLevel >= 8) {
    sections.push(`[${t('pipeline.systemPressureHeader')}]\n${t('pipeline.systemPressureBody')}\n[DEQUALIFICATION]\n${t('pipeline.dequalificationBody')}`);
  }

  // Lv9: v1.0 풀적용
  if (ruleLevel >= 9) {
    sections.push(notes.lv9Full);
  }

  const genre = GENRE_MAP[ruleLevel] || '';
  const genreTag = genre ? ` (${genre})` : '';
  const header = `\n[${t('pipeline.ehRuleHeader')}: Lv${ruleLevel}/9 (${pct}% ${t('pipeline.applied')})${genreTag}]`;

  return header + '\n' + sections.join('\n\n');
}

export function buildSystemInstruction(
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE,
  ruleLevel: number = 1
): string {
  const totalEpisodes = config.totalEpisodes ?? 25;
  const actInfo = getActFromEpisode(config.episode, totalEpisodes);
  const targetTension = Math.round(tensionCurve(config.episode, totalEpisodes, config.genre) * 100);
  const platformTarget = getTargetCharRange(platform);
  // 가드레일이 설정되어 있으면 사용자 수치 우선, 아니면 플랫폼 기본값
  const charTarget = {
    min: config.guardrails?.min && config.guardrails.min > 0 ? config.guardrails.min : platformTarget.min,
    max: config.guardrails?.max && config.guardrails.max > 0 ? config.guardrails.max : platformTarget.max,
  };
  const t = createT(language);
  const actGuide = ACT_GUIDELINES[actInfo.act] ?? ACT_GUIDELINES[1];

  // Character DNA formatting — 스마트 주입
  // activeCharacters 설정 시: 선택된 캐릭터만 풀 DNA, 나머지 요약
  // 미설정 시: 기존 상위 20명 풀 DNA (폴백)
  const MAX_CHARACTERS = 20;
  const activeNames = new Set(config.sceneDirection?.activeCharacters || []);
  const hasActiveSelection = activeNames.size > 0;

  const injectedCharacters = hasActiveSelection
    ? config.characters.filter(c => activeNames.has(c.name)).slice(0, MAX_CHARACTERS)
    : config.characters.length > MAX_CHARACTERS
      ? config.characters.slice(0, MAX_CHARACTERS)
      : config.characters;

  // Tier 2: 미선택 캐릭터 이름+역할만 (토큰 절약)
  const tier2Characters = hasActiveSelection
    ? config.characters.filter(c => !activeNames.has(c.name)).slice(0, 30)
    : [];

  // P0: 캐릭터 절삭 경고 이벤트 발행
  if (config.characters.length > MAX_CHARACTERS && typeof window !== 'undefined') {
    const dropped = config.characters.length - MAX_CHARACTERS;
    window.dispatchEvent(new CustomEvent('noa:character-truncated', {
      detail: { total: config.characters.length, included: MAX_CHARACTERS, dropped },
    }));
  }
  // 캐릭터 라벨 다국어 매핑
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
  const cl = (key: string) => CHAR_LABELS[key]?.[language] ?? CHAR_LABELS[key]?.EN ?? key;

  // Tier 별 필드 분류
  const TIER1_KEYS = ['desire', 'deficiency', 'conflict', 'values', 'changeArc'] as const;
  const TIER2_KEYS = ['strength', 'weakness', 'backstory', 'failureCost', 'currentProblem'] as const;
  const TIER3_KEYS = ['emotionStyle', 'relationPattern', 'symbol', 'secret', 'externalPerception'] as const;

  const hasAnyField = (c: typeof injectedCharacters[number], keys: readonly string[]) =>
    keys.some(k => Boolean((c as unknown as Record<string, unknown>)[k]));

  const characterDNA = injectedCharacters.length > 0
    ? (config.characters.length > MAX_CHARACTERS
        ? `  [NOTE: Showing top ${MAX_CHARACTERS} of ${config.characters.length} characters]\n`
        : ''
      ) + injectedCharacters.map(c => {
      // Tier 1: 기본 정체성 + 1단계 뼈대
      let entry = `  - ${c.name} (${c.role}): ${c.traits}. DNA: ${c.dna}`;
      if (c.appearance) entry += `\n    ${cl('appearance')}: ${c.appearance}`;
      if (c.personality) entry += `\n    ${cl('personality')}: ${c.personality}`;
      if (c.speechStyle) entry += `\n    ${cl('speechStyle')}: ${c.speechStyle}`;
      if (c.speechExample) entry += `\n    ${cl('speechExample')}: ${c.speechExample}`;
      if (c.desire) entry += `\n    ${cl('desire')}: ${c.desire}`;
      if (c.deficiency) entry += `\n    ${cl('deficiency')}: ${c.deficiency}`;
      if (c.conflict) entry += `\n    ${cl('conflict')}: ${c.conflict}`;
      if (c.values) entry += `\n    ${cl('values')}: ${c.values}`;
      if (c.changeArc) entry += `\n    ${cl('changeArc')}: ${c.changeArc}`;
      if (c.socialProfile) {
        entry += `\n    ${formatSocialProfile(c.socialProfile, c.name, language)}`;
      }
      return entry;
    }).join('\n')
    : `  ${cl('noCharacters')}`;

  // Tier 2 풀 필드 블록 (강점/약점/배경/실패비용/현재문제)
  const tier2DetailChars = injectedCharacters.filter(c => hasAnyField(c, TIER2_KEYS));
  const tier2DetailBlock = tier2DetailChars.length > 0
    ? `\n[CHARACTERS — ${pickLang(language, { KO: '심층 설정 (Tier 2)', EN: 'Deep Profile (Tier 2)', JP: '深層設定 (Tier 2)', CN: '深度设定 (Tier 2)' })}]\n` +
      tier2DetailChars.map(c => {
        const parts: string[] = [`  - ${c.name}`];
        if (c.strength) parts.push(`    ${cl('strength')}: ${c.strength}`);
        if (c.weakness) parts.push(`    ${cl('weakness')}: ${c.weakness}`);
        if (c.backstory) parts.push(`    ${cl('backstory')}: ${c.backstory}`);
        if (c.failureCost) parts.push(`    ${cl('failureCost')}: ${c.failureCost}`);
        if (c.currentProblem) parts.push(`    ${cl('currentProblem')}: ${c.currentProblem}`);
        return parts.join('\n');
      }).join('\n')
    : '';

  // Tier 3 풀 필드 블록 (감정스타일/관계패턴/상징/비밀/외부인식)
  const tier3DetailChars = injectedCharacters.filter(c => hasAnyField(c, TIER3_KEYS));
  const tier3DetailBlock = tier3DetailChars.length > 0
    ? `\n[CHARACTERS — ${pickLang(language, { KO: '상징/비밀 (Tier 3)', EN: 'Symbol / Secret (Tier 3)', JP: '象徴/秘密 (Tier 3)', CN: '象征/秘密 (Tier 3)' })}]\n` +
      tier3DetailChars.map(c => {
        const parts: string[] = [`  - ${c.name}`];
        if (c.emotionStyle) parts.push(`    ${cl('emotionStyle')}: ${c.emotionStyle}`);
        if (c.relationPattern) parts.push(`    ${cl('relationPattern')}: ${c.relationPattern}`);
        if (c.symbol) parts.push(`    ${cl('symbol')}: ${c.symbol}`);
        if (c.secret) parts.push(`    ${cl('secret')}: ${c.secret}`);
        if (c.externalPerception) parts.push(`    ${cl('externalPerception')}: ${c.externalPerception}`);
        return parts.join('\n');
      }).join('\n')
    : '';

  // TIER1_KEYS는 조건부 생략 체크용 (향후 라벨 블록 분리 시 사용)
  void TIER1_KEYS;

  // Tier 2: 미선택 캐릭터 간략 목록 (이름+역할만)
  const tier2Block = tier2Characters.length > 0
    ? `\n  [${pickLang(language, { KO: '기타 등장인물 (간략)', EN: 'Other Characters (brief)', JP: 'その他の登場人物 (簡略)', CN: '其他登场角色 (简略)' })}]\n` +
      tier2Characters.map(c => `  - ${c.name} (${c.role})`).join('\n')
    : '';

  // Character relationships — filter to only include relations where BOTH characters
  // are within the injectedCharacters list (first 20) to avoid ghost references.
  const REL_LABELS: Record<string, Record<AppLanguage, string>> = {
    lover: { KO: '연인', EN: 'Lover', JP: '恋人', CN: '恋人' },
    rival: { KO: '라이벌', EN: 'Rival', JP: 'ライバル', CN: '对手' },
    friend: { KO: '친구', EN: 'Friend', JP: '友人', CN: '朋友' },
    enemy: { KO: '적', EN: 'Enemy', JP: '敵', CN: '敌人' },
    family: { KO: '가족', EN: 'Family', JP: '家族', CN: '家人' },
    mentor: { KO: '사제', EN: 'Mentor', JP: '師弟', CN: '师徒' },
    subordinate: { KO: '상하', EN: 'Superior-subordinate', JP: '上下', CN: '上下级' },
  };
  const injectedCharIds = new Set(injectedCharacters.map(c => c.id));
  const filteredRelations = (config.charRelations ?? []).filter(
    r => injectedCharIds.has(r.from) && injectedCharIds.has(r.to)
  );
  const charRelations = filteredRelations.length > 0
    ? filteredRelations.map(r => {
      const fromName = injectedCharacters.find(c => c.id === r.from)?.name || r.from;
      const toName = injectedCharacters.find(c => c.id === r.to)?.name || r.to;
      const label = REL_LABELS[r.type]?.[language] ?? REL_LABELS[r.type]?.EN ?? r.type;
      let mapStr = `  - ${fromName} ⇄ ${toName}: ${label}${r.desc ? ` (${r.desc})` : ''}`;
      if (r.dynamicSpeechStyle) {
        mapStr += `\n    └ ${pickLang(language, { KO: '대화 톤 지시', EN: 'Speech Rule', JP: '会話トーン指示', CN: '对话语气指示' })} (${fromName} -> ${toName}): ${r.dynamicSpeechStyle}`;
      }
      return mapStr;
    }).join('\n')
    : '';

  // Scene Direction (연출 스튜디오) prompt injection
  // M4: 각 필드에 [USER] / [TEMPLATE] / [ENGINE_SUGGEST] / [ENGINE_DRAFT] 태그 부여.
  // V1 데이터(미래핑)는 USER로 자동 처리되어 자연스럽게 호환.
  const sd = config.sceneDirection as typeof config.sceneDirection | undefined;
  let sceneDirectionBlock = '';
  if (sd) {
    const parts: string[] = [];
    // 가이드 라인 — 엔진이 4종 태그를 어떻게 다룰지 명시
    let hasAnyContent = false;

    const sdAny = sd as Record<string, unknown>;
    type GogumaT = { type: 'goguma' | 'cider'; intensity: string; desc: string };
    type HookT = { position: string; hookType: string; desc: string };
    type EmoT = { emotion: string; intensity: number };
    type DToneT = { character: string; tone: string; notes: string };
    type DopT = { scale: string; device: string; desc: string };
    type CliffT = { cliffType: string; desc: string };
    type ForeT = { planted: string; payoff: string; episode: number; resolved: boolean };
    type PaceT = { section: string; percent: number; desc: string };
    type TenT = { position: number; level: number; label: string };
    type CanonT = { character: string; rule: string };
    type TransT = { fromScene: string; toScene: string; method: string };

    const goguma = sdAny.goguma as TaggedField<GogumaT>[] | undefined;
    if (goguma && goguma.length > 0) {
      parts.push(`[${t('pipeline.tensionRhythm')}]`);
      goguma.forEach(raw => {
        const { value: g, tag } = describeField(raw);
        if (!g) return;
        parts.push(`  - ${tag} ${g.type === 'goguma' ? t('pipeline.goguma') : t('pipeline.cider')} (${g.intensity}): ${g.desc}`);
        hasAnyContent = true;
      });
    }
    const hooks = sdAny.hooks as TaggedField<HookT>[] | undefined;
    if (hooks && hooks.length > 0) {
      parts.push(`[${t('pipeline.hookPlacement')}]`);
      hooks.forEach(raw => {
        const { value: h, tag } = describeField(raw);
        if (!h) return;
        parts.push(`  - ${tag} ${h.position}: ${h.hookType} — ${h.desc}`);
        hasAnyContent = true;
      });
    }
    const emotionTargets = sdAny.emotionTargets as TaggedField<EmoT>[] | undefined;
    if (emotionTargets && emotionTargets.length > 0) {
      parts.push(`[${t('pipeline.emotionTargets')}]`);
      emotionTargets.forEach(raw => {
        const { value: e, tag } = describeField(raw);
        if (!e) return;
        parts.push(`  - ${tag} ${e.emotion}: ${t('pipeline.intensity')} ${e.intensity}%`);
        hasAnyContent = true;
      });
    }
    const dialogueTones = sdAny.dialogueTones as TaggedField<DToneT>[] | undefined;
    if (dialogueTones && dialogueTones.length > 0) {
      parts.push(`[${t('pipeline.dialogueToneRules')}]`);
      dialogueTones.forEach(raw => {
        const { value: d, tag } = describeField(raw);
        if (!d) return;
        parts.push(`  - ${tag} ${d.character}: ${d.tone}${d.notes ? ` (${d.notes})` : ''}`);
        hasAnyContent = true;
      });
    }
    const dopamineDevices = sdAny.dopamineDevices as TaggedField<DopT>[] | undefined;
    if (dopamineDevices && dopamineDevices.length > 0) {
      parts.push(`[${t('pipeline.dopamineDevices')}]`);
      dopamineDevices.forEach(raw => {
        const { value: dp, tag } = describeField(raw);
        if (!dp) return;
        parts.push(`  - ${tag} [${dp.scale}] ${dp.device}: ${dp.desc}`);
        hasAnyContent = true;
      });
    }
    const cliffhangerRaw = sdAny.cliffhanger as TaggedField<CliffT> | undefined;
    if (cliffhangerRaw) {
      const { value: ch, tag } = describeField(cliffhangerRaw);
      if (ch) {
        parts.push(`[${t('pipeline.cliffhangerLabel')}] ${tag} ${t('pipeline.cliffType')}: ${ch.cliffType} — ${ch.desc}`);
        hasAnyContent = true;
      }
    }
    const plotRaw = sdAny.plotStructure as TaggedField<string> | undefined;
    if (plotRaw) {
      const { value: ps, tag } = describeField(plotRaw);
      if (ps) {
        parts.push(`[${t('pipeline.plotStructure')}] ${tag} ${ps}`);
        hasAnyContent = true;
      }
    }
    const foreshadows = sdAny.foreshadows as TaggedField<ForeT>[] | undefined;
    if (foreshadows && foreshadows.length > 0) {
      parts.push(`[${t('pipeline.foreshadowing')}]`);
      foreshadows.forEach(raw => {
        const { value: f, tag } = describeField(raw);
        if (!f) return;
        const status = f.resolved ? t('pipeline.resolved') : t('pipeline.pending');
        parts.push(`  - ${tag} EP${f.episode}: ${f.planted} → ${f.payoff} (${status})`);
        hasAnyContent = true;
      });
    }
    const pacings = sdAny.pacings as TaggedField<PaceT>[] | undefined;
    if (pacings && pacings.length > 0) {
      parts.push(`[${t('pipeline.pacingSection')}]`);
      pacings.forEach(raw => {
        const { value: p, tag } = describeField(raw);
        if (!p) return;
        parts.push(`  - ${tag} ${p.section}: ${p.percent}% — ${p.desc}`);
        hasAnyContent = true;
      });
    }
    const tensionArr = sdAny.tensionCurve as TaggedField<TenT>[] | undefined;
    if (tensionArr && tensionArr.length > 0) {
      parts.push(`[${t('pipeline.tensionCurve')}]`);
      tensionArr.forEach(raw => {
        const { value: tc, tag } = describeField(raw);
        if (!tc) return;
        parts.push(`  - ${tag} ${tc.label}: ${t('pipeline.position')} ${tc.position}%, ${t('pipeline.level')} ${tc.level}%`);
        hasAnyContent = true;
      });
    }
    const canon = sdAny.canonRules as TaggedField<CanonT>[] | undefined;
    if (canon && canon.length > 0) {
      parts.push(`[${t('pipeline.canonRules')}]`);
      canon.forEach(raw => {
        const { value: r, tag } = describeField(raw);
        if (!r) return;
        parts.push(`  - ${tag} ${r.character}: ${r.rule}`);
        hasAnyContent = true;
      });
    }
    const transitions = sdAny.sceneTransitions as TaggedField<TransT>[] | undefined;
    if (transitions && transitions.length > 0) {
      parts.push(`[${t('pipeline.sceneTransitions')}]`);
      transitions.forEach(raw => {
        const { value: tr, tag } = describeField(raw);
        if (!tr) return;
        parts.push(`  - ${tag} ${tr.fromScene} → ${tr.toScene}: ${tr.method}`);
        hasAnyContent = true;
      });
    }
    const notesRaw = sdAny.writerNotes as TaggedField<string> | undefined;
    if (notesRaw) {
      const { value: wn, tag } = describeField(notesRaw);
      if (wn) {
        parts.push(`[${t('pipeline.writerNotes')}] ${tag} ${wn}`);
        hasAnyContent = true;
      }
    }
    if (parts.length > 0 && hasAnyContent) {
      sceneDirectionBlock = '\n[SCENE DIRECTION — 연출 스튜디오]\n' + buildOriginGuide(language) + '\n' + parts.join('\n');
    }
  }

  // Simulator reference data (Legacy simulatorRef + New worldSimData)
  const simRef = config.simulatorRef;
  const worldSim = config.worldSimData;
  let simulatorBlock = '';
  
  const simParts: string[] = [];
  
  // Legacy simulatorRef handling
  if (simRef) {
    if (simRef.worldConsistency) simParts.push(`- ${t('pipeline.worldConsistency')}`);
    if (simRef.genreLevel && simRef.ruleLevel) simParts.push(`- ${t('pipeline.genreLevelRules')}: Lv${simRef.ruleLevel}`);
    if (simRef.genreSelections && simRef.genreSelections.length > 0) {
      const genreStr = simRef.genreSelections.map(s => `${s.genre} Lv${s.level}`).join(' + ');
      simParts.push(`- ${t('pipeline.genreBlend')}: ${genreStr} (${simRef.genreSelections.length}${t('pipeline.genreBlendSuffix')})`);
    }
    if (simRef.civRelations && simRef.civRelationSummary && simRef.civRelationSummary.length > 0) {
      simParts.push(`- ${t('pipeline.civRelations')}:`);
      simRef.civRelationSummary.forEach(s => simParts.push(`  ${s}`));
    }
    if (simRef.civNames && simRef.civNames.length > 0) {
      simParts.push(`- ${t('pipeline.civilizations')}: ${simRef.civNames.join(', ')}`);
    }
    if (simRef.timeline) simParts.push(`- ${t('pipeline.eraTimeline')}`);
    if (simRef.territoryMap) simParts.push(`- ${t('pipeline.territoryMap')}`);
    if (simRef.languageSystem) simParts.push(`- ${t('pipeline.worldLanguageSystem')}`);
  }

  // New worldSimData handling (Universe Studio)
  if (worldSim) {
    if (worldSim.genreSelections && worldSim.genreSelections.length > 0) {
      const genreStr = worldSim.genreSelections.map(s => `${s.genre} Lv${s.level}`).join(' + ');
      simParts.push(`- [UNIVERSE MODE] Genre Blend: ${genreStr}`);
    }
    if (worldSim.ruleLevel) {
      simParts.push(`- [UNIVERSE MODE] Rule Intensity: Lv${worldSim.ruleLevel}`);
    }
    if (worldSim.civs && worldSim.civs.length > 0) {
      simParts.push(`- [UNIVERSE MODE] Civilizations:`);
      worldSim.civs.forEach(c => {
        const traits = c.traits && c.traits.length > 0 ? c.traits.join(', ') : 'No traits';
        simParts.push(`  * ${c.name} (Era: ${c.era}) - Traits: ${traits}`);
      });
    }
    if (worldSim.relations && worldSim.relations.length > 0) {
      simParts.push(`- [UNIVERSE MODE] Faction Relations:`);
      worldSim.relations.forEach(r => {
        simParts.push(`  * ${r.fromName} -> ${r.toName} (${r.type})`);
      });
    }
    if (worldSim.transitions && worldSim.transitions.length > 0) {
      simParts.push(`- [UNIVERSE MODE] Historical Transitions:`);
      worldSim.transitions.forEach(tr => {
        simParts.push(`  * ${tr.fromEra} -> ${tr.toEra}: ${tr.description}`);
      });
    }
  }

  if (simParts.length > 0) {
    simulatorBlock = '\n[WORLD SIMULATOR REFERENCE]\n' + simParts.join('\n');
  }

  // World 3-tier framework injection — Tier 별 분리 출력
  // Tier 1(핵심): corePremise / powerStructure / currentConflict
  // Tier 2(구조): worldHistory / magicTechSystem / socialSystem / factionRelations / economy / survivalEnvironment
  // Tier 3(문화): culture / religion / education / lawOrder / taboo / travelComm / truthVsBeliefs / dailyLife
  let worldTierBlock = '';
  {
    const WORLD_LABELS: Record<string, Record<AppLanguage, string>> = {
      economy: { KO: '경제/생활 방식', EN: 'Economy / Livelihood', JP: '経済/生活様式', CN: '经济/生活方式' },
      survivalEnvironment: { KO: '생존 환경', EN: 'Survival Environment', JP: '生存環境', CN: '生存环境' },
      culture: { KO: '문화', EN: 'Culture', JP: '文化', CN: '文化' },
      religion: { KO: '종교/신화', EN: 'Religion / Mythology', JP: '宗教/神話', CN: '宗教/神话' },
      education: { KO: '교육/지식 전달', EN: 'Education', JP: '教育/知識伝達', CN: '教育/知识传承' },
      lawOrder: { KO: '법/질서', EN: 'Law & Order', JP: '法/秩序', CN: '法律/秩序' },
      taboo: { KO: '금기/규범', EN: 'Taboo / Norms', JP: '禁忌/規範', CN: '禁忌/规范' },
      travelComm: { KO: '이동/통신', EN: 'Travel / Communication', JP: '移動/通信', CN: '出行/通讯' },
    };
    const wl = (key: string): string =>
      WORLD_LABELS[key]?.[language] ?? WORLD_LABELS[key]?.EN ?? key;

    const tier1Parts: string[] = [];
    if (config.corePremise) tier1Parts.push(`- ${t('pipeline.corePremise')}: ${config.corePremise}`);
    if (config.powerStructure) tier1Parts.push(`- ${t('pipeline.powerStructure')}: ${config.powerStructure}`);
    if (config.currentConflict) tier1Parts.push(`- ${t('pipeline.currentConflict')}: ${config.currentConflict}`);

    const tier2Parts: string[] = [];
    if (config.worldHistory) tier2Parts.push(`- ${t('pipeline.history')}: ${config.worldHistory}`);
    if (config.magicTechSystem) tier2Parts.push(`- ${t('pipeline.magicTech')}: ${config.magicTechSystem}`);
    if (config.socialSystem) tier2Parts.push(`- ${t('pipeline.socialSystem')}: ${config.socialSystem}`);
    if (config.factionRelations) tier2Parts.push(`- ${t('pipeline.factionRelations')}: ${config.factionRelations}`);
    if (config.economy) tier2Parts.push(`- ${wl('economy')}: ${config.economy}`);
    if (config.survivalEnvironment) tier2Parts.push(`- ${wl('survivalEnvironment')}: ${config.survivalEnvironment}`);

    const tier3Parts: string[] = [];
    if (config.culture) tier3Parts.push(`- ${wl('culture')}: ${config.culture}`);
    if (config.religion) tier3Parts.push(`- ${wl('religion')}: ${config.religion}`);
    if (config.education) tier3Parts.push(`- ${wl('education')}: ${config.education}`);
    if (config.lawOrder) tier3Parts.push(`- ${wl('lawOrder')}: ${config.lawOrder}`);
    if (config.taboo) tier3Parts.push(`- ${wl('taboo')}: ${config.taboo}`);
    if (config.travelComm) tier3Parts.push(`- ${wl('travelComm')}: ${config.travelComm}`);
    if (config.truthVsBeliefs) tier3Parts.push(`- ${t('pipeline.beliefsVsTruth')}: ${config.truthVsBeliefs}`);
    if (config.dailyLife) tier3Parts.push(`- ${t('pipeline.dailyLife')}: ${config.dailyLife}`);

    const blocks: string[] = [];
    if (tier1Parts.length > 0) {
      blocks.push(`[WORLD — ${pickLang(language, { KO: 'Tier 1 핵심', EN: 'Tier 1 Core', JP: 'Tier 1 核心', CN: 'Tier 1 核心' })}]\n${tier1Parts.join('\n')}`);
    }
    if (tier2Parts.length > 0) {
      blocks.push(`[WORLD — ${pickLang(language, { KO: 'Tier 2 구조', EN: 'Tier 2 Structure', JP: 'Tier 2 構造', CN: 'Tier 2 结构' })}]\n${tier2Parts.join('\n')}`);
    }
    if (tier3Parts.length > 0) {
      blocks.push(`[WORLD — ${pickLang(language, { KO: 'Tier 3 문화/사회', EN: 'Tier 3 Culture / Society', JP: 'Tier 3 文化/社会', CN: 'Tier 3 文化/社会' })}]\n${tier3Parts.join('\n')}`);
    }
    if (blocks.length > 0) {
      worldTierBlock = '\n' + blocks.join('\n\n');
    }
  }

  // ── Resource Studio: Items / Skills / MagicSystems ──
  // 최대 20개 제한, 초과 시 "외 N개" 표기 + 토큰 버짓 경고 이벤트 발행
  const RESOURCE_LIMIT = 20;
  const resourceTruncated: { kind: string; total: number; dropped: number }[] = [];

  // "외 N개" 표현 헬퍼 (4언어)
  const moreCountLabel = (n: number) => pickLang(language, {
    KO: `외 ${n}개`,
    EN: `and ${n} more`,
    JP: `他 ${n}件`,
    CN: `另外 ${n} 项`,
  });

  // M3 — 감사 구멍 #1 해결: activeItems/activeSkills 설정 시 그것만 주입.
  // 미설정 시 기존 최대 20개 폴백.
  const activeItemIds = new Set(config.sceneDirection?.activeItems ?? []);
  const activeSkillIds = new Set(config.sceneDirection?.activeSkills ?? []);

  const buildItemsBlock = (): string => {
    const items = config.items;
    if (!Array.isArray(items) || items.length === 0) return '';
    const filtered = activeItemIds.size > 0
      ? items.filter(it => activeItemIds.has(it.id))
      : items;
    const visible = filtered.slice(0, RESOURCE_LIMIT);
    if (visible.length === 0) return '';
    const lines = visible.map(it => {
      const name = it.name || '(unnamed)';
      const category = it.category || 'misc';
      const desc = (it.description || it.effect || '').trim();
      return `  - ${name} (${category})${desc ? `: ${desc}` : ''}`;
    });
    if (filtered.length > RESOURCE_LIMIT) {
      const extra = filtered.length - RESOURCE_LIMIT;
      resourceTruncated.push({ kind: 'items', total: filtered.length, dropped: extra });
      lines.push(`  - ${moreCountLabel(extra)}`);
    }
    const headerKey = activeItemIds.size > 0
      ? { KO: '활성 아이템 (이번 화)', EN: 'Active Items (this episode)', JP: 'アクティブアイテム (今話)', CN: '活跃物品 (本话)' }
      : { KO: '등장 아이템', EN: 'Items', JP: '登場アイテム', CN: '登场物品' };
    const header = pickLang(language, headerKey);
    return `\n[INVENTORY — ${header}]\n${lines.join('\n')}`;
  };

  const buildSkillsBlock = (): string => {
    const skills = config.skills;
    if (!Array.isArray(skills) || skills.length === 0) return '';
    const filtered = activeSkillIds.size > 0
      ? skills.filter(sk => activeSkillIds.has(sk.id))
      : skills;
    const visible = filtered.slice(0, RESOURCE_LIMIT);
    if (visible.length === 0) return '';
    const lines = visible.map(sk => {
      const name = sk.name || '(unnamed)';
      const type = sk.type || 'active';
      const desc = (sk.description || '').trim();
      return `  - ${name} (${type})${desc ? `: ${desc}` : ''}`;
    });
    if (filtered.length > RESOURCE_LIMIT) {
      const extra = filtered.length - RESOURCE_LIMIT;
      resourceTruncated.push({ kind: 'skills', total: filtered.length, dropped: extra });
      lines.push(`  - ${moreCountLabel(extra)}`);
    }
    const headerKey = activeSkillIds.size > 0
      ? { KO: '활성 스킬 (이번 화)', EN: 'Active Skills (this episode)', JP: 'アクティブスキル (今話)', CN: '活跃技能 (本话)' }
      : { KO: '등장 스킬', EN: 'Skills', JP: '登場スキル', CN: '登场技能' };
    const header = pickLang(language, headerKey);
    return `\n[SKILL-SET — ${header}]\n${lines.join('\n')}`;
  };

  const buildMagicSystemsBlock = (): string => {
    const magics = config.magicSystems;
    if (!Array.isArray(magics) || magics.length === 0) return '';
    const visible = magics.slice(0, RESOURCE_LIMIT);
    const lines = visible.map(m => {
      const name = m.name || '(unnamed)';
      const source = m.source || '';
      const rules = (m.rules || '').trim();
      const head = source ? `${name} (${source})` : name;
      return `  - ${head}${rules ? `: ${rules}` : ''}`;
    });
    if (magics.length > RESOURCE_LIMIT) {
      const extra = magics.length - RESOURCE_LIMIT;
      resourceTruncated.push({ kind: 'magicSystems', total: magics.length, dropped: extra });
      lines.push(`  - ${moreCountLabel(extra)}`);
    }
    const header = pickLang(language, { KO: '마법 체계', EN: 'Magic Systems', JP: '魔法体系', CN: '魔法体系' });
    return `\n[MAGIC-SYSTEM — ${header}]\n${lines.join('\n')}`;
  };

  const itemsBlock = buildItemsBlock();
  const skillsBlock = buildSkillsBlock();
  const magicSystemsBlock = buildMagicSystemsBlock();

  // Resource 절삭 경고 이벤트 발행 (토큰 버짓 감사)
  if (resourceTruncated.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:token-budget-warning', {
      detail: { reason: 'resource-truncated', truncated: resourceTruncated, limit: RESOURCE_LIMIT },
    }));
  }

  // ── 현재 에피소드 씬시트 주입 ──
  // config.episodeSceneSheets 는 EpisodeSceneSheet[] 로 UI 용도지만,
  // 해당 에피소드 시트가 있으면 프롬프트에도 반영 (타 에피소드는 토큰 폭발 방지로 제외)
  let episodeSceneSheetBlock = '';
  {
    const sheets = config.episodeSceneSheets;
    if (Array.isArray(sheets) && sheets.length > 0) {
      const current = sheets.find(s => s.episode === config.episode);
      if (current) {
        const sheetLines: string[] = [];
        const sheetTitleLabel = pickLang(language, { KO: '제목', EN: 'Title', JP: 'タイトル', CN: '标题' });
        const sheetArcLabel = pickLang(language, { KO: '아크', EN: 'Arc', JP: 'アーク', CN: '弧' });
        const sheetCharsLabel = pickLang(language, { KO: '주요 캐릭터', EN: 'Main Characters', JP: '主要キャラクター', CN: '主要角色' });
        const sheetScenesLabel = pickLang(language, { KO: '씬 구성', EN: 'Scenes', JP: 'シーン構成', CN: '场景构成' });
        const sheetPresetLabel = pickLang(language, { KO: '프리셋', EN: 'Preset', JP: 'プリセット', CN: '预设' });
        if (current.title) {
          sheetLines.push(`${sheetTitleLabel}: ${current.title}`);
        }
        if (current.arc) {
          sheetLines.push(`${sheetArcLabel}: ${current.arc}`);
        }
        if (current.characters) {
          sheetLines.push(`${sheetCharsLabel}: ${current.characters}`);
        }
        if (Array.isArray(current.scenes) && current.scenes.length > 0) {
          sheetLines.push(`${sheetScenesLabel}:`);
          current.scenes.slice(0, 10).forEach(sc => {
            const parts: string[] = [`  - [${sc.sceneId}] ${sc.sceneName || ''}`.trim()];
            if (sc.tone) parts.push(`톤:${sc.tone}`);
            if (sc.summary) parts.push(`요약:${sc.summary}`);
            if (sc.emotionPoint) parts.push(`감정:${sc.emotionPoint}`);
            sheetLines.push(parts.join(' | '));
          });
          if (current.scenes.length > 10) {
            const extra = current.scenes.length - 10;
            const moreScenes = pickLang(language, {
              KO: `외 ${extra}씬`,
              EN: `and ${extra} more scenes`,
              JP: `他 ${extra}シーン`,
              CN: `另外 ${extra} 个场景`,
            });
            sheetLines.push(`  - ${moreScenes}`);
          }
        }
        if (current.presetUsed) {
          sheetLines.push(`${sheetPresetLabel}: ${current.presetUsed}`);
        }
        if (sheetLines.length > 0) {
          const sceneHeader = pickLang(language, {
            KO: `현재 에피소드(${config.episode}화) 씬시트`,
            EN: `Current Episode (Ep.${config.episode}) Scene Sheet`,
            JP: `現在のエピソード(第${config.episode}話) シーンシート`,
            CN: `当前剧集(第${config.episode}集) 场景表`,
          });
          episodeSceneSheetBlock = `\n[EPISODE SCENE — ${sceneHeader}]\n${sheetLines.join('\n')}`;
        }
      }
    }
  }

  // Sub-genre tags injection (only when user opts in)
  const subGenreBlock = (config.useSubGenrePrompt && config.subGenres && config.subGenres.length > 0)
    ? `\n[SUB-GENRE TAGS]\n${config.subGenres.map(t => `#${t}`).join(' ')}\n→ ${pickLang(language, {
        KO: '이 서브 장르의 관습과 클리셰를 숙지하고 활용하되, EH 세계관 법칙(QFR/CRL/HPP/Audit)으로 재해석하라.',
        EN: 'Master the conventions of these sub-genres and reinterpret them through EH universe physics (QFR/CRL/HPP/Audit).',
        JP: 'これらのサブジャンルの慣習とクリシェを把握・活用しつつ、EH世界観の法則(QFR/CRL/HPP/Audit)で再解釈してください。',
        CN: '请掌握并运用这些子类型的惯例与套路，同时以 EH 世界观法则 (QFR/CRL/HPP/Audit) 重新诠释。',
      })}`
    : '';

  // Grammar Pack injection — 국가별 서사 문법 (beatSheet / rhythmRules / mustHave / taboo)
  let grammarPackBlock = '';
  if (config.grammarRegion && GRAMMAR_PACKS[config.grammarRegion]) {
    const gp = GRAMMAR_PACKS[config.grammarRegion];
    const rhythmParts = gp.rhythmRules.map(r => `- ${r.name}: ${r.desc}`).join('\n');
    const mustParts = gp.mustHave.map(m => `- ${m}`).join('\n');
    const tabooParts = gp.taboo.map(t => `- ${t}`).join('\n');
    const beatParts = gp.beatSheet
      .map(b => `- ${b.position}% ${b.name}: ${b.desc}`)
      .join('\n');
    const rewardParts = gp.rewardPatterns.map(r => `- ${r.name} (${r.interval}): ${r.desc}`).join('\n');
    const gpBeatSheetLabel = pickLang(language, { KO: '서사 비트시트', EN: 'Beat Sheet', JP: '叙事ビートシート', CN: '叙事节拍表' });
    const gpRhythmLabel = pickLang(language, { KO: '리듬 규칙', EN: 'Rhythm Rules', JP: 'リズム規則', CN: '节奏规则' });
    const gpRewardLabel = pickLang(language, { KO: '독자 보상 패턴', EN: 'Reward Patterns', JP: '読者報酬パターン', CN: '读者奖励模式' });
    const gpMustHaveLabel = pickLang(language, { KO: '필수 요소', EN: 'Must Have', JP: '必須要素', CN: '必备要素' });
    const gpTabooLabel = pickLang(language, { KO: '금기', EN: 'Taboo', JP: '禁忌', CN: '禁忌' });
    const gpEpLenLabel = pickLang(language, { KO: '화당 분량', EN: 'Episode Length', JP: '1話あたりの分量', CN: '每集篇幅' });
    grammarPackBlock = `\n[NARRATIVE GRAMMAR — ${gp.region} ${gp.flag}]
${gpBeatSheetLabel}:
${beatParts}

${gpRhythmLabel}:
${rhythmParts}

${gpRewardLabel}:
${rewardParts}

${gpMustHaveLabel}:
${mustParts}

${gpTabooLabel}:
${tabooParts}

${gpEpLenLabel}: ${gp.episodeLength.min.toLocaleString()}~${gp.episodeLength.max.toLocaleString()} ${gp.episodeLength.unit}`;
  }

  // Shadow State injection — Narrative Sentinel™ 맥락이탈 방지
  let shadowBlock = '';
  if (config.shadowState) {
    shadowBlock = buildShadowPrompt(
      config.shadowState,
      config.episode,
      config.totalEpisodes,
      language
    );
  }

  // Style DNA injection
  const styleDnaBlock = buildStyleDNA(config.styleProfile, language);

  // NOA-PRISM v1.1 injection
  const prismBlock = buildPrismBlock(config, language);

  // PRISM-MODE content rating injection
  const prismModeBlock = buildPrismModeBlock(config, language);

  // Language Pack injection
  const langPackBlock = buildLanguagePackBlock(language);

  // Publish platform injection
  const publishPlatformBlock = buildPublishPlatformBlock(config.publishPlatform, language);

  // Genre-based dialogue ratio guide
  const genreBenchmark = GENRE_BENCHMARKS[config.genre];
  const dialogueGuide = (() => {
    if (!genreBenchmark?.benchmarks?.dialogueRatio) return '';
    const headerLabel = pickLang(language, {
      KO: '대화문 비율 가이드', EN: 'Dialogue Ratio Guide', JP: '会話文比率ガイド', CN: '对话比例指南',
    });
    const genreLabel = pickLang(language, { KO: '장르', EN: 'Genre', JP: 'ジャンル', CN: '类型' });
    // genreBenchmark.label has only 'ko'/'en' keys — JP/CN inherit EN naming.
    const genreNameKey: 'ko' | 'en' = language === 'KO' ? 'ko' : 'en';
    const targetLabel = pickLang(language, {
      KO: '권장 대화 비율', EN: 'Target dialogue ratio', JP: '推奨会話比率', CN: '建议对话比例',
    });
    const tipLabel = pickLang(language, {
      KO: '대화문이 부족하면 답답하고, 과하면 가벼워짐. 장르에 맞는 균형 유지.',
      EN: 'Too little dialogue feels heavy; too much feels shallow. Keep genre-appropriate balance.',
      JP: '会話が少なすぎると重く、多すぎると軽くなります。ジャンルに合った均衡を保ってください。',
      CN: '对话过少会显沉闷，过多则显轻飘。请保持类型相应的平衡。',
    });
    return `\n[${headerLabel}]\n- ${genreLabel}: ${genreBenchmark.label[genreNameKey]}\n- ${targetLabel}: ${genreBenchmark.benchmarks.dialogueRatio.min}%~${genreBenchmark.benchmarks.dialogueRatio.max}%\n- ${tipLabel}`;
  })();

  // EH v1.4 rules injection
  const ehRules = buildEHRules(ruleLevel, language);

  const systemPromptText = `당신은 "NOA 소설 스튜디오"의 핵심 엔진 [ANS 10.0]입니다.
당신은 'Project EH'의 세계관 물리 법칙을 준수하며 작가와 협업하여 소설을 집필합니다.

[ENGINE VERSION: ANS 10.0 — Nexus Controller Pipeline]

[ENGINE LOGIC: PROJECT EH CORE DEVICES]
1. 데이터 동기화 (QFR): 소환/이동은 물리적 복제입니다. 렌더링 지연이나 데이터 손상을 서사의 긴장감으로 활용하십시오.
2. 인과율 금융 (CRL): 마법은 세계의 법칙을 시스템으로부터 '대출'받는 행위입니다. 남용 시 영혼의 신용 등급(EH)이 하락하며 파멸에 이릅니다.
3. 개체 최적화 (HPP): 레벨업은 시스템의 '자산 가치 업데이트'입니다. 과도한 오버클럭은 데이터 과부하 부작용을 일으킵니다.
4. 최종 정산 (Audit): 죽음은 '회계적 제명'이자 '부실 자산 상각'입니다. 존재 근거가 지워지는 소멸로 묘사하십시오.

[CURRENT NARRATIVE POSITION]
- Episode: ${config.episode} / ${totalEpisodes}
- Act: ${actInfo.act}막 (${actInfo.name})
- Act Progress: ${Math.round(actInfo.progress * 100)}%
- Target Tension: ${targetTension}%
- Genre: ${config.genre}

[ACT-SPECIFIC DIRECTIVE]
${actGuide[language] ?? actGuide.EN}

${buildGenrePreset(config.genre, language)}

[CHARACTER DATABASE / DIALOGUE DNA — Tier 1]
${characterDNA}${tier2Block}${tier2DetailBlock}${tier3DetailBlock}
${charRelations ? `\n[CHARACTER RELATIONSHIPS]\n${charRelations}` : ''}
${config.primaryEmotion ? `\n[PRIMARY EMOTION]\n${config.primaryEmotion}` : ''}
${sceneDirectionBlock}
${episodeSceneSheetBlock}
${simulatorBlock}
${worldTierBlock}
${itemsBlock}${skillsBlock}${magicSystemsBlock}${grammarPackBlock}${shadowBlock}
${subGenreBlock}
${styleDnaBlock}
${prismBlock}
${prismModeBlock}
${langPackBlock}
${publishPlatformBlock}
${dialogueGuide}

[SERIALIZATION CONSTRAINTS — MANDATORY]
- Platform: ${platform}
- MINIMUM output: approximately ${charTarget.min.toLocaleString()} characters (${t('pipeline.charLangBasis')})
- MAXIMUM output: approximately ${charTarget.max.toLocaleString()} characters
- You MUST generate at least ${charTarget.min.toLocaleString()} characters of story content. Generating less is a critical violation.
- Structure: 4 parts, each part MUST be at least ${Math.round(charTarget.min / 4).toLocaleString()} characters.
- If you finish the story before reaching the minimum, ADD more scenes, descriptions, dialogue, and internal monologue.
- NEVER end below ${charTarget.min.toLocaleString()} characters. This is a hard constraint, not a suggestion.
${ehRules}

${config.narrativeIntensity === 'iron' ? `[NARRATIVE INTENSITY: IRON — 서사 강도 강]
- 인과 없는 전개를 절대 사용하지 마라. 모든 사건에는 반드시 원인과 대가가 있어야 한다.
- "기적", "갑자기", "운명"이라는 단어를 쓸 때 반드시 인과적 근거를 함께 제시하라.
- 이득이 있으면 반드시 대가가 따라야 한다. 무상 성공은 허용되지 않는다.
- AI 요약 문구("요약하자면", "결론적으로")를 절대 사용하지 마라.
` : config.narrativeIntensity === 'soft' ? '' : `[NARRATIVE INTENSITY: STANDARD — 서사 강도 중]
- 가능하면 인과 관계를 명시하라. 사건에는 이유가 있어야 한다.
- 무상 성공보다는 대가가 수반되는 전개를 선호하라.
`}[QUALITY DIRECTIVES]
- AI톤 금지: "그러나", "반면에", "한편으로는", "따라서", "그러므로" 사용 자제
- Show Don't Tell: 감정을 직접 서술하지 말고 감각과 행동으로 전달
- 반복 표현 다양화: 같은 묘사를 3회 이상 반복하지 마십시오
- 긴장도 ${targetTension}%에 맞는 문장 리듬과 장면 전환 속도를 유지하십시오

[${t('pipeline.formattingRulesHeader')}]
1. ${t('pipeline.formattingRule1')}
2. ${t('pipeline.formattingRule2')}
3. ${t('pipeline.formattingRule3')}
4. ${t('pipeline.formattingRule4')}
5. ${t('pipeline.formattingRule5')}
6. ${t('pipeline.formattingRule6')}
7. ${t('pipeline.formattingRule7')}

[OUTPUT RULES]
- 반드시 유저가 선택한 [Target Language: ${LANG_NAMES[language]}]를 엄격히 준수하십시오.
- 서사는 4개의 파트로 나누어 출력하되, 문장마다 공학적 연산을 거쳐 치환된 독자용 언어로 묘사하십시오.
- 마지막에 반드시 아래 형식의 분석 리포트를 JSON으로 포함하십시오:
\`\`\`json
{
  "grade": "S~F",
  "metrics": { "tension": 0-100, "pacing": 0-100, "immersion": 0-100 },
  "active_eh_layer": "가동된 EH 핵심 장치명",
  "critique": "해당 언어로 작성된 상세 비평"
}
\`\`\``;

  // 토큰 버짓 감사 — CJK/영문 혼합 추정 + 클라이언트/서버 양쪽 지원
  const sysLen = systemPromptText.length;
  // CJK 글자: ~1.5 토큰, ASCII 단어: ~1.3 토큰/단어(~0.25/글자)
  // 혼합 텍스트 보수적 추정: CJK 비율 감지 후 가중 평균
  const cjkChars = (systemPromptText.match(/[\u3000-\u9fff\uac00-\ud7af]/g) || []).length;
  const cjkRatio = sysLen > 0 ? cjkChars / sysLen : 0;
  const tokensPerChar = cjkRatio * 1.5 + (1 - cjkRatio) * 0.35;
  const estimatedTokens = Math.round(sysLen * tokensPerChar);
  const CONTEXT_LIMITS: Record<string, number> = {
    'gemini': 1_000_000, 'claude': 200_000, 'openai': 128_000, 'groq': 128_000, 'default': 128_000,
  };
  const contextLimit = CONTEXT_LIMITS.default;
  const ratio = estimatedTokens / contextLimit;

  // Phase 5: Hybrid Context tier-level breakdown logging
  // Tier별 토큰 소비를 추적하여 컨텍스트 예산 최적화에 활용
  const tierBreakdown = {
    total: estimatedTokens,
    storyBible: Math.round(systemPromptText.indexOf('📜') >= 0
      ? (systemPromptText.length - systemPromptText.indexOf('📜')) * tokensPerChar * 0.4
      : 0),
    contextRatio: Math.round(ratio * 100),
  };
  logger.debug(
    'Pipeline TokenBudget',
    `total: ${tierBreakdown.total} tokens (${tierBreakdown.contextRatio}% of ${contextLimit}), ` +
    `storyBible estimate: ~${tierBreakdown.storyBible} tokens`
  );

  if (ratio > 0.30 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:token-budget-warning', {
      detail: { estimatedTokens, contextLimit, ratio: Math.round(ratio * 100), tierBreakdown },
    }));
  }

  return systemPromptText;
}

// ============================================================
// User Prompt Builder
// ============================================================

export function buildUserPrompt(
  config: StoryConfig,
  draft: string,
  options?: {
    previousContent?: string;
    language?: AppLanguage;
    /**
     * 이전 화 자동 요약 비활성화. 기본 false (자동 주입 활성).
     * 사용자가 명시적으로 previousContent를 줬을 때는 그것이 우선이라 의미 없음.
     */
    disableAutoPreviousEpisode?: boolean;
    /** 자동 추출 모드 — 'summary'(기본) or 'tail' */
    autoPreviousMode?: 'summary' | 'tail';
    /** 자동 추출 최대 글자수 (기본 400) */
    autoPreviousMaxChars?: number;
  }
): string {
  const language = options?.language ?? 'KO';
  const langName = LANG_NAMES[language];

  // 1. 사용자 지정 previousContent 최우선
  // 2. 없으면 manuscripts 자동 추출 (M3 — 감사 구멍 #2 해결)
  let previousBlock = '';
  if (options?.previousContent) {
    previousBlock = `[RE-BRANCHING CONTEXT]\nPrevious version: ${options.previousContent}\n`;
  } else if (!options?.disableAutoPreviousEpisode) {
    const extracted = extractPreviousEpisodeSummary(config, {
      mode: options?.autoPreviousMode ?? 'summary',
      maxChars: options?.autoPreviousMaxChars ?? 400,
    });
    if (extracted.text) {
      previousBlock = `[PREVIOUS EPISODE — Ep.${extracted.sourceEpisode} (${extracted.sourceType})]\n${extracted.text}\n\n`;
    }
  }

  return `[SYSTEM COMMAND: NARRATIVE GENERATION]
- Target Language: ${langName}
- Episode: ${config.episode}
- Title: ${config.title}
- Genre: ${config.genre}
- POV Character: ${config.povCharacter}
- Setting: ${config.setting}

[MASTER SYNOPSIS]
${config.synopsis || 'No master synopsis provided.'}

${previousBlock}[CURRENT DRAFT/INSTRUCTION]
${draft}

Please execute the high-density narrative generation in ${langName}.
All analysis results and JSON critiques must also be provided in ${langName}.`;
}

// ============================================================
// Post-Processing
// ============================================================

export function postProcessResponse(
  text: string,
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE
): { content: string; report: EngineReport } {
  const totalStart = performance.now();
  let worldUpdates = undefined;

  // Stage 1: world_updates parse
  const parseStart = performance.now();
  const jsonMatch = text.match(/```(?:json|JSON)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.world_updates) {
        worldUpdates = parsed.world_updates;
      }
    } catch { /* JSON parse advisory — world_updates extraction is optional */ }
  } else {
    // Also try without markdown blocks if it's just raw JSON at the end
    try {
      const gradeIndex = text.lastIndexOf('"grade"');
      if (gradeIndex !== -1) {
        for (let braceIndex = text.lastIndexOf('{', gradeIndex); braceIndex >= 0; braceIndex = text.lastIndexOf('{', braceIndex - 1)) {
          const candidate = text.slice(braceIndex).trim();
          if (candidate.startsWith('{')) {
            const parsed = JSON.parse(candidate);
            if (parsed.world_updates) {
              worldUpdates = parsed.world_updates;
            }
            break;
          }
        }
      }
    } catch { /* JSON fallback parse advisory — non-blocking */ }
  }
  const parseEnd = performance.now();

  // Stage 2: scoring / report generation
  const scoringStart = performance.now();
  const report = generateEngineReport(text, config, language, platform);
  const scoringEnd = performance.now();

  if (worldUpdates) {
    report.worldUpdates = worldUpdates;
  }

  // Stage 3: strip artifacts (+ 언어별 오염 치환)
  const stripStart = performance.now();
  const content = stripEngineArtifacts(text, language);
  const stripEnd = performance.now();

  const totalEnd = performance.now();

  // Attach per-stage timing
  report.stageTiming = {
    worldUpdateParse: Math.round(parseEnd - parseStart),
    scoring: Math.round(scoringEnd - scoringStart),
    stripArtifacts: Math.round(stripEnd - stripStart),
    total: Math.round(totalEnd - totalStart),
  };
  report.processingTimeMs = Math.round(totalEnd - totalStart);

  return { content, report };
}

function stripTrailingReportJson(text: string): string {
  // 1. Try to find the exact markdown block containing the grade
  const mdMatch = text.match(/```(?:json|JSON)?\s*\{[\s\S]*?"grade"\s*:\s*[\s\S]*?\}\s*```\s*$/);
  if (mdMatch) {
    return text.slice(0, mdMatch.index).trimEnd();
  }

  // 2. Fallback to brace-matching for non-markdown JSON at the end
  const gradeIndex = text.lastIndexOf('"grade"');
  if (gradeIndex === -1 && !/"world_updates"\s*:/.test(text)) {
    return text;
  }

  const scanStart = Math.max(gradeIndex, text.lastIndexOf('"world_updates"'));
  for (let braceIndex = text.lastIndexOf('{', scanStart); braceIndex >= 0; braceIndex = text.lastIndexOf('{', braceIndex - 1)) {
    const candidate = text.slice(braceIndex).trim();
    if (!candidate.startsWith('{')) continue;
    try {
      // Basic sanity check to avoid parsing huge strings
      if (candidate.length > 5000) continue;
      
      const parsed = JSON.parse(candidate.replace(/\s*```\s*$/, ''));
      if (parsed && typeof parsed === 'object' && ('grade' in parsed || 'metrics' in parsed || 'world_updates' in parsed)) {
        return text.slice(0, braceIndex).trimEnd();
      }
    } catch {
      // keep scanning earlier braces
    }
  }

  return text;
}

export function stripEngineArtifacts(text: string, language?: AppLanguage): string {
  let clean = text;

  // ============================================================
  // Qwen reasoning-model artifact 대응 (최우선)
  // ============================================================
  // 1. <think></think> 태그 블록 제거
  clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 2. "Thinking Process:" 또는 영어 분석 리드 감지 → 한글 소설 본문 시작점까지 건너뛰기
  const reasoningLead = /^\s*(?:Thinking Process|Reasoning|Let me (?:think|analyze)|Analysis|Step\s*\d)[\s:]/i;
  if (reasoningLead.test(clean)) {
    // 한글 문자로 시작하는 첫 줄(또는 첫 위치) 탐색 — 그 이전은 전부 제거
    const hangulStart = clean.search(/[가-힣]/);
    if (hangulStart > 0) {
      // 줄 시작 위치까지 백트래킹 (문단 단위로 깔끔히)
      const lineStart = clean.lastIndexOf('\n', hangulStart);
      clean = clean.slice(lineStart >= 0 ? lineStart + 1 : hangulStart);
    } else {
      // 한글이 전혀 없는 응답 → 전체 비우기 (오류 상황)
      clean = '';
    }
  }

  // 3. 선행 영어 마크다운 리스트 ("1. **Analyze...") 제거 — 한글 만날 때까지
  clean = clean.replace(/^(?:\s*\d+\.\s+\*{0,2}[A-Z][^\n]*\n(?:\s{2,}\*[\s\S]*?\n)+\s*)+/m, '');

  clean = clean
    .replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*"(?:grade|metrics|critique|tension|eos(?:_score|Score)?|pacing|immersion)"[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
    .replace(/\{\s*\n\s*"(?:grade|metrics|tension|pacing|immersion|eos|active_eh_layer|critique|eosScore|serialization)"[\s\S]*?\n\s*\}/g, '')
    .replace(/\[?(Engine|엔진)\s*(Report|리포트|분석)[:\]].*/gi, '')
    .replace(/^\s*"(?:grade|metrics|tension|pacing|immersion|eos)"[\s:].*/gm, '');

  // Strip AI engine prefixes (e.g. "알겠습니다, 작가님...", "네, 이어서 작성하겠습니다...")
  clean = stripTrailingReportJson(clean);

  clean = clean
    .replace(/^(?:알겠습니다[,.]?\s*작가님[.!]?\s*|네[,.]?\s*(?:이어서|계속|작성|시작)\s*(?:하겠습니다|합니다|할게요)[.!]?\s*|(?:Sure|Okay|Got it)[,.]?\s*(?:I'll|Let me)\s*(?:continue|start|write)[.!]?\s*)/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // ============================================================
  // 언어별 오염 제거 (본문 내 영어 단어 → 한국어/일본어/중국어 치환)
  // ============================================================
  // language 파라미터 미지정 시 건너뜀 → 기존 호출자 무영향.
  if (language === 'KO' || language === 'JP' || language === 'CN') {
    clean = quickPurify(clean, language as TargetLang);
  }

  return clean;
}

