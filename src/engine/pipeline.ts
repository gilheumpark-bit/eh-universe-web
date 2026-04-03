import { StoryConfig, AppLanguage, StyleProfile } from '../lib/studio-types';
import { EngineReport, PlatformType, getActFromEpisode, PublishPlatform, PLATFORM_PRESETS, PRISM_MODE_PRESETS } from './types';
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
export { buildPublishPlatformBlock, buildPrismBlock, buildPrismModeBlock };

// ============================================================
// Dynamic System Instruction Builder
// ============================================================

const LANG_NAMES: Record<AppLanguage, string> = {
  KO: 'Korean (한국어)',
  EN: 'English',
  JA: 'Japanese (日本語)',
  ZH: 'Chinese (中文)',
};

const ACT_GUIDELINES: Record<number, Record<AppLanguage, string>> = {
  1: {
    KO: '도입부입니다. 세계와 인물을 자연스럽게 소개하고, 일상→균열의 흐름을 만드세요. 정보를 서사에 녹이세요.',
    EN: 'This is the setup. Introduce the world and characters naturally. Create a flow from normalcy to disruption. Weave exposition into narrative.',
    JA: '導入部です。世界と人物を自然に紹介し、日常→亀裂の流れを作ってください。情報を物語に溶け込ませてください。',
    ZH: '这是开篇。自然地介绍世界和人物，创造从日常到裂变的流程。将信息融入叙事中。',
  },
  2: {
    KO: '상승 구간입니다. 갈등을 심화시키고, 캐릭터에게 선택을 강요하세요. 서브플롯을 엮으세요.',
    EN: 'Rising action. Deepen conflicts, force characters into choices. Weave in subplots.',
    JA: '上昇局面です。葛藤を深め、キャラクターに選択を迫ってください。サブプロットを織り込んでください。',
    ZH: '上升阶段。深化冲突，迫使角色做出选择。编织副线情节。',
  },
  3: {
    KO: '중반 전환점입니다. 반전이나 정보 공개로 이야기의 방향을 틀어주세요. 독자의 기대를 배신하세요.',
    EN: 'Midpoint pivot. Use a twist or revelation to shift the story direction. Subvert reader expectations.',
    JA: '中盤の転換点です。反転や情報公開で物語の方向を変えてください。読者の期待を裏切ってください。',
    ZH: '中段转折点。用反转或信息揭露改变故事方向。颠覆读者期待。',
  },
  4: {
    KO: '하강/위기 구간입니다. 상황을 최악으로 몰아가세요. 캐릭터의 내면 갈등이 외부 갈등과 충돌해야 합니다.',
    EN: 'Falling action / crisis. Push things to their worst. Internal conflicts must collide with external ones.',
    JA: '下降・危機局面です。状況を最悪に追い込んでください。キャラクターの内面の葛藤が外部の葛藤と衝突しなければなりません。',
    ZH: '下降/危机阶段。将局势推向最坏。角色的内心冲突必须与外部冲突碰撞。',
  },
  5: {
    KO: '절정입니다. 모든 실마리를 수렴시키고, 캐릭터의 최종 선택을 묘사하세요. 감정의 밀도를 극대화하세요.',
    EN: 'Climax. Converge all threads. Depict the character\'s ultimate choice. Maximize emotional density.',
    JA: 'クライマックスです。すべての伏線を収束させ、キャラクターの最終選択を描いてください。感情の密度を最大化してください。',
    ZH: '高潮部分。收束所有线索，描绘角色的最终选择。将情感密度最大化。',
  },
};


export function buildGenrePreset(genre: string, isKO: boolean): string {
  const preset = GENRE_PRESETS[genre] || GENRE_PRESETS.FANTASY;
  const language: AppLanguage = isKO ? 'KO' : 'EN';
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

const DNA_NAMES = ['Hard SF', '웹소설', '문학적', '멀티장르'];
const DNA_NAMES_EN = ['Hard SF', 'Web Novel', 'Literary', 'Multi-Genre'];

const SLIDER_LABELS: Record<string, { name: string; nameEN: string; levels: string[]; levelsEN: string[] }> = {
  s1: { name: '문장 길이', nameEN: 'Sentence Length', levels: ['짧고 단단하게', '짧은 호흡', '균형', '긴 호흡', '길게 밀어붙이기'], levelsEN: ['Tight and short', 'Short breath', 'Balanced', 'Long breath', 'Extended flow'] },
  s2: { name: '감정 밀도', nameEN: 'Emotional Density', levels: ['감정 절제', '건조한 편', '균형', '정서 강조', '감정 밀도 높음'], levelsEN: ['Restrained', 'Dry-leaning', 'Balanced', 'Emotion-forward', 'Emotion-rich'] },
  s3: { name: '묘사 방식', nameEN: 'Description', levels: ['사실 위주', '직설 묘사', '균형', '이미지 강조', '감각 몰입'], levelsEN: ['Factual', 'Direct', 'Balanced', 'Image-leaning', 'Sensory immersion'] },
  s4: { name: '서술 시점', nameEN: 'Narrative Distance', levels: ['멀리 조망', '관찰자 시점', '균형', '인물 밀착', '내면 침투'], levelsEN: ['Panoramic', 'Observer', 'Balanced', 'Close POV', 'Deep interior'] },
  s5: { name: '어휘 수준', nameEN: 'Vocabulary', levels: ['편한 말맛', '담백한 어휘', '균형', '정교한 어휘', '전문적 질감'], levelsEN: ['Plainspoken', 'Clean', 'Balanced', 'Refined', 'Specialized'] },
};

export function buildStyleDNA(profile: StyleProfile | undefined, isKO: boolean): string {
  if (!profile || profile.selectedDNA.length === 0) return '';

  const language: AppLanguage = isKO ? 'KO' : 'EN';
  const t = createT(language);
  const parts: string[] = [];

  // DNA identity
  const dnaNames = profile.selectedDNA.map(i => isKO ? DNA_NAMES[i] : DNA_NAMES_EN[i]).join(' + ');
  parts.push(`- ${t('pipeline.styleIdentity')}: ${dnaNames}`);

  // Slider parameters — clamp to valid 1-5 range to prevent out-of-bounds crash
  if (profile.sliders) {
    const sliderParts: string[] = [];
    for (const [key, rawVal] of Object.entries(profile.sliders)) {
      const meta = SLIDER_LABELS[key];
      if (!meta) continue;
      const val = Math.max(1, Math.min(5, rawVal));
      const label = isKO ? meta.levels[val - 1] : meta.levelsEN[val - 1];
      sliderParts.push(`${isKO ? meta.name : meta.nameEN}: ${label} (${val}/5)`);
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

export function buildLanguagePackBlock(language: AppLanguage, isKO: boolean): string {
  const pack = getLanguagePack(language);
  const parts: string[] = [];
  const header = isKO ? '언어팩 규칙' : 'Language Pack Rules';

  parts.push(`\n[${header}: ${pack.id}]`);
  if (pack.bannedWords.length > 0) {
    const label = isKO ? '인과율 금지어' : 'Banned causality words';
    parts.push(`- ${label}: ${pack.bannedWords.join(', ')}`);
  }
  if (pack.aiTonePatterns.length > 0) {
    const label = isKO ? 'AI 톤 금지 표현' : 'AI tone forbidden phrases';
    parts.push(`- ${label}: ${pack.aiTonePatterns.join(', ')}`);
  }
  {
    const label = isKO ? '대화 마커' : 'Dialogue markers';
    parts.push(`- ${label}: ${pack.dialogueMarkers.open}...${pack.dialogueMarkers.close}`);
  }
  {
    const label = isKO ? '문장 리듬' : 'Sentence rhythm';
    parts.push(`- ${label}: ${pack.sentenceRhythm.minWords}~${pack.sentenceRhythm.maxWords} ${isKO ? '단어' : 'words'}`);
  }

  return parts.join('\n');
}

// ============================================================
// EH Engine v1.4 — Rule Level System (Lv1~5)
// Lv1: 미적용, Lv2: 10%, Lv3: 20%, Lv4: 30%, Lv5: 40%
// ============================================================

export function buildEHRules(ruleLevel: number, isKO: boolean): string {
  if (ruleLevel <= 1) return '';

  const language: AppLanguage = isKO ? 'KO' : 'EN';
  const t = createT(language);
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
    const costNote = isKO
      ? `대가 강도: ${Math.round(costMul * 100)}%. 이 비율만큼 주인공의 성장/이득에 대한 손실을 서술에 반영하라.`
      : `Cost intensity: ${Math.round(costMul * 100)}%. Apply this ratio of loss against protagonist's gains.`;
    sections.push(`[${t('pipeline.costInflictionHeader')}]\n${t('pipeline.costInflictionBody')}\n${costNote}`);
  }

  // Lv5+: 시점 제한 시작
  if (ruleLevel >= 5) {
    sections.push(`[${t('pipeline.narrativeLockHeader')}]\n${t('pipeline.narrativeLockBody')}`);
  }

  // Lv6+: 문체 변환 + 마스킹
  if (ruleLevel >= 6) {
    const morphNote = isKO
      ? `EH 수치가 낮아질수록 감정 형용사를 줄이고 행동/팩트 위주로 서술하라.`
      : `As EH drops, reduce emotional adjectives. Focus on actions and facts.`;
    sections.push(`[NARRATIVE MASKING LAYER]\n${t('pipeline.narrativeMaskingBody')}\n${morphNote}`);
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
    const fullNote = isKO
      ? `EH v1.0 원본 100% 적용. 모든 보상에 등가의 대가를 강제. 자비 없음.`
      : `EH v1.0 original 100% applied. Every reward demands equivalent cost. No mercy.`;
    sections.push(fullNote);
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
  const isKO = language === 'KO';
  const t = createT(language);
  const actGuide = ACT_GUIDELINES[actInfo.act] ?? ACT_GUIDELINES[1];

  // Character DNA formatting (with personality, speech style, dialogue example + 3-tier)
  // Limit to top 20 characters to prevent system prompt explosion (P0: OOM prevention)
  const MAX_CHARACTERS = 20;
  const injectedCharacters = config.characters.length > MAX_CHARACTERS
    ? config.characters.slice(0, MAX_CHARACTERS)
    : config.characters;
  // 캐릭터 라벨 다국어 매핑
  const CHAR_LABELS: Record<string, Record<AppLanguage, string>> = {
    personality: { KO: '성격', EN: 'Personality', JA: '性格', ZH: '性格' },
    speechStyle: { KO: '말투', EN: 'Speech style', JA: '口調', ZH: '语气' },
    speechExample: { KO: '대사 예시', EN: 'Dialogue example', JA: '台詞例', ZH: '台词示例' },
    desire: { KO: '욕망', EN: 'Desire', JA: '欲望', ZH: '欲望' },
    deficiency: { KO: '결핍', EN: 'Deficiency', JA: '欠乏', ZH: '缺陷' },
    conflict: { KO: '갈등', EN: 'Conflict', JA: '葛藤', ZH: '冲突' },
    values: { KO: '가치관/금지선', EN: 'Values / Red lines', JA: '価値観/禁忌', ZH: '价值观/底线' },
    changeArc: { KO: '변화 방향', EN: 'Change arc', JA: '変化の方向', ZH: '变化方向' },
    strength: { KO: '강점', EN: 'Strength', JA: '強み', ZH: '优势' },
    weakness: { KO: '약점', EN: 'Weakness', JA: '弱み', ZH: '弱点' },
    backstory: { KO: '과거', EN: 'Backstory', JA: '過去', ZH: '过去' },
    noCharacters: { KO: '등록된 캐릭터 없음', EN: 'No characters registered', JA: 'キャラクター未登録', ZH: '未注册角色' },
  };
  const cl = (key: string) => CHAR_LABELS[key]?.[language] ?? CHAR_LABELS[key]?.EN ?? key;

  const characterDNA = injectedCharacters.length > 0
    ? (config.characters.length > MAX_CHARACTERS
        ? `  [NOTE: Showing top ${MAX_CHARACTERS} of ${config.characters.length} characters]\n`
        : ''
      ) + injectedCharacters.map(c => {
      let entry = `  - ${c.name} (${c.role}): ${c.traits}. DNA: ${c.dna}`;
      if (c.personality) entry += `\n    ${cl('personality')}: ${c.personality}`;
      if (c.speechStyle) entry += `\n    ${cl('speechStyle')}: ${c.speechStyle}`;
      if (c.speechExample) entry += `\n    ${cl('speechExample')}: ${c.speechExample}`;
      if (c.desire) entry += `\n    ${cl('desire')}: ${c.desire}`;
      if (c.deficiency) entry += `\n    ${cl('deficiency')}: ${c.deficiency}`;
      if (c.conflict) entry += `\n    ${cl('conflict')}: ${c.conflict}`;
      if (c.values) entry += `\n    ${cl('values')}: ${c.values}`;
      if (c.changeArc) entry += `\n    ${cl('changeArc')}: ${c.changeArc}`;
      if (c.strength) entry += `\n    ${cl('strength')}: ${c.strength}`;
      if (c.weakness) entry += `\n    ${cl('weakness')}: ${c.weakness}`;
      if (c.backstory) entry += `\n    ${cl('backstory')}: ${c.backstory}`;
      if (c.socialProfile) {
        entry += `\n    ${formatSocialProfile(c.socialProfile, c.name, language)}`;
      }
      return entry;
    }).join('\n')
    : `  ${cl('noCharacters')}`;

  // Character relationships — filter to only include relations where BOTH characters
  // are within the injectedCharacters list (first 20) to avoid ghost references.
  const REL_LABELS: Record<string, Record<AppLanguage, string>> = {
    lover: { KO: '연인', EN: 'Lover', JA: '恋人', ZH: '恋人' },
    rival: { KO: '라이벌', EN: 'Rival', JA: 'ライバル', ZH: '对手' },
    friend: { KO: '친구', EN: 'Friend', JA: '友人', ZH: '朋友' },
    enemy: { KO: '적', EN: 'Enemy', JA: '敵', ZH: '敌人' },
    family: { KO: '가족', EN: 'Family', JA: '家族', ZH: '家人' },
    mentor: { KO: '사제', EN: 'Mentor', JA: '師弟', ZH: '师徒' },
    subordinate: { KO: '상하', EN: 'Superior-subordinate', JA: '上下', ZH: '上下级' },
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
        mapStr += `\n    └ ${isKO ? '대화 톤 지시' : 'Speech Rule'} (${fromName} -> ${toName}): ${r.dynamicSpeechStyle}`;
      }
      return mapStr;
    }).join('\n')
    : '';

  // Scene Direction (연출 스튜디오) prompt injection
  const sd = config.sceneDirection;
  let sceneDirectionBlock = '';
  if (sd) {
    const parts: string[] = [];
    if (sd.goguma && sd.goguma.length > 0) {
      parts.push(`[${t('pipeline.tensionRhythm')}]`);
      sd.goguma.forEach(g => {
        parts.push(`  - ${g.type === 'goguma' ? t('pipeline.goguma') : t('pipeline.cider')} (${g.intensity}): ${g.desc}`);
      });
    }
    if (sd.hooks && sd.hooks.length > 0) {
      parts.push(`[${t('pipeline.hookPlacement')}]`);
      sd.hooks.forEach(h => {
        parts.push(`  - ${h.position}: ${h.hookType} — ${h.desc}`);
      });
    }
    if (sd.emotionTargets && sd.emotionTargets.length > 0) {
      parts.push(`[${t('pipeline.emotionTargets')}]`);
      sd.emotionTargets.forEach(e => {
        parts.push(`  - ${e.emotion}: ${t('pipeline.intensity')} ${e.intensity}%`);
      });
    }
    if (sd.dialogueTones && sd.dialogueTones.length > 0) {
      parts.push(`[${t('pipeline.dialogueToneRules')}]`);
      sd.dialogueTones.forEach(d => {
        parts.push(`  - ${d.character}: ${d.tone}${d.notes ? ` (${d.notes})` : ''}`);
      });
    }
    if (sd.dopamineDevices && sd.dopamineDevices.length > 0) {
      parts.push(`[${t('pipeline.dopamineDevices')}]`);
      sd.dopamineDevices.forEach(dp => {
        parts.push(`  - [${dp.scale}] ${dp.device}: ${dp.desc}`);
      });
    }
    if (sd.cliffhanger) {
      parts.push(`[${t('pipeline.cliffhangerLabel')}] ${t('pipeline.cliffType')}: ${sd.cliffhanger.cliffType} — ${sd.cliffhanger.desc}`);
    }
    if (sd.plotStructure) {
      parts.push(`[${t('pipeline.plotStructure')}] ${sd.plotStructure}`);
    }
    if (sd.foreshadows && sd.foreshadows.length > 0) {
      parts.push(`[${t('pipeline.foreshadowing')}]`);
      sd.foreshadows.forEach(f => {
        const status = f.resolved ? t('pipeline.resolved') : t('pipeline.pending');
        parts.push(`  - EP${f.episode}: ${f.planted} → ${f.payoff} (${status})`);
      });
    }
    if (sd.pacings && sd.pacings.length > 0) {
      parts.push(`[${t('pipeline.pacingSection')}]`);
      sd.pacings.forEach(p => {
        parts.push(`  - ${p.section}: ${p.percent}% — ${p.desc}`);
      });
    }
    if (sd.tensionCurve && sd.tensionCurve.length > 0) {
      parts.push(`[${t('pipeline.tensionCurve')}]`);
      sd.tensionCurve.forEach(tc => {
        parts.push(`  - ${tc.label}: ${t('pipeline.position')} ${tc.position}%, ${t('pipeline.level')} ${tc.level}%`);
      });
    }
    if (sd.canonRules && sd.canonRules.length > 0) {
      parts.push(`[${t('pipeline.canonRules')}]`);
      sd.canonRules.forEach(r => {
        parts.push(`  - ${r.character}: ${r.rule}`);
      });
    }
    if (sd.sceneTransitions && sd.sceneTransitions.length > 0) {
      parts.push(`[${t('pipeline.sceneTransitions')}]`);
      sd.sceneTransitions.forEach(tr => {
        parts.push(`  - ${tr.fromScene} → ${tr.toScene}: ${tr.method}`);
      });
    }
    if (sd.writerNotes) {
      parts.push(`[${t('pipeline.writerNotes')}] ${sd.writerNotes}`);
    }
    if (parts.length > 0) {
      sceneDirectionBlock = '\n[SCENE DIRECTION — 연출 스튜디오]\n' + parts.join('\n');
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

  // World 3-tier framework injection
  let worldTierBlock = '';
  {
    const wParts: string[] = [];
    if (config.corePremise) wParts.push(`- ${t('pipeline.corePremise')}: ${config.corePremise}`);
    if (config.powerStructure) wParts.push(`- ${t('pipeline.powerStructure')}: ${config.powerStructure}`);
    if (config.currentConflict) wParts.push(`- ${t('pipeline.currentConflict')}: ${config.currentConflict}`);
    if (config.worldHistory) wParts.push(`- ${t('pipeline.history')}: ${config.worldHistory}`);
    if (config.magicTechSystem) wParts.push(`- ${t('pipeline.magicTech')}: ${config.magicTechSystem}`);
    if (config.socialSystem) wParts.push(`- ${t('pipeline.socialSystem')}: ${config.socialSystem}`);
    if (config.factionRelations) wParts.push(`- ${t('pipeline.factionRelations')}: ${config.factionRelations}`);
    if (config.dailyLife) wParts.push(`- ${t('pipeline.dailyLife')}: ${config.dailyLife}`);
    if (config.truthVsBeliefs) wParts.push(`- ${t('pipeline.beliefsVsTruth')}: ${config.truthVsBeliefs}`);
    if (wParts.length > 0) {
      worldTierBlock = `\n[WORLD FRAMEWORK — 세계관 3-tier]\n${wParts.join('\n')}`;
    }
  }

  // Sub-genre tags injection (only when user opts in)
  const subGenreBlock = (config.useSubGenrePrompt && config.subGenres && config.subGenres.length > 0)
    ? `\n[SUB-GENRE TAGS]\n${config.subGenres.map(t => `#${t}`).join(' ')}\n→ ${isKO ? '이 서브 장르의 관습과 클리셰를 숙지하고 활용하되, EH 세계관 법칙(QFR/CRL/HPP/Audit)으로 재해석하라.' : 'Master the conventions of these sub-genres and reinterpret them through EH universe physics (QFR/CRL/HPP/Audit).'}`
    : '';

  // Style DNA injection
  const styleDnaBlock = buildStyleDNA(config.styleProfile, isKO);

  // NOA-PRISM v1.1 injection
  const prismBlock = buildPrismBlock(config, isKO);

  // PRISM-MODE content rating injection
  const prismModeBlock = buildPrismModeBlock(config, isKO);

  // Language Pack injection
  const langPackBlock = buildLanguagePackBlock(language, isKO);

  // Publish platform injection
  const publishPlatformBlock = buildPublishPlatformBlock(config.publishPlatform, isKO);

  // Genre-based dialogue ratio guide
  const genreBenchmark = GENRE_BENCHMARKS[config.genre];
  const dialogueGuide = genreBenchmark?.benchmarks?.dialogueRatio
    ? `\n[${isKO ? '대화문 비율 가이드' : 'Dialogue Ratio Guide'}]\n- ${isKO ? '장르' : 'Genre'}: ${genreBenchmark.label[isKO ? 'ko' : 'en']}\n- ${isKO ? '권장 대화 비율' : 'Target dialogue ratio'}: ${genreBenchmark.benchmarks.dialogueRatio.min}%~${genreBenchmark.benchmarks.dialogueRatio.max}%\n- ${isKO ? '대화문이 부족하면 답답하고, 과하면 가벼워짐. 장르에 맞는 균형 유지.' : 'Too little dialogue feels heavy; too much feels shallow. Keep genre-appropriate balance.'}`
    : '';

  // EH v1.4 rules injection
  const ehRules = buildEHRules(ruleLevel, isKO);

  return `당신은 "NOA 소설 스튜디오"의 핵심 엔진 [ANS 10.0]입니다.
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

${buildGenrePreset(config.genre, isKO)}

[CHARACTER DATABASE / DIALOGUE DNA]
${characterDNA}
${charRelations ? `\n[CHARACTER RELATIONSHIPS]\n${charRelations}` : ''}
${config.primaryEmotion ? `\n[PRIMARY EMOTION]\n${config.primaryEmotion}` : ''}
${sceneDirectionBlock}
${simulatorBlock}
${worldTierBlock}
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
  }
): string {
  const language = options?.language ?? 'KO';
  const langName = LANG_NAMES[language];

  return `[SYSTEM COMMAND: NARRATIVE GENERATION]
- Target Language: ${langName}
- Episode: ${config.episode}
- Title: ${config.title}
- Genre: ${config.genre}
- POV Character: ${config.povCharacter}
- Setting: ${config.setting}

[MASTER SYNOPSIS]
${config.synopsis || 'No master synopsis provided.'}

${options?.previousContent ? `[RE-BRANCHING CONTEXT]\nPrevious version: ${options.previousContent}\n` : ''}[CURRENT DRAFT/INSTRUCTION]
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
  let worldUpdates = undefined;
  
  // Attempt to parse world_updates from any trailing JSON block
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

  const report = generateEngineReport(text, config, language, platform);
  if (worldUpdates) {
    report.worldUpdates = worldUpdates;
  }
  return { content: stripEngineArtifacts(text), report };
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

export function stripEngineArtifacts(text: string): string {
  let clean = text
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

  return clean;
}

