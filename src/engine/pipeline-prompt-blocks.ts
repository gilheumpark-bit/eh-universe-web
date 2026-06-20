import type { AppLanguage, StyleProfile } from '../lib/studio-types';
import { createT } from '@/lib/i18n';
import { getLanguagePack } from './language-pack';
import { GENRE_PRESETS } from './genre-presets';

export const LANG_NAMES: Record<AppLanguage, string> = {
  KO: 'Korean (한국어)',
  EN: 'English',
  JP: 'Japanese (日本語)',
  CN: 'Chinese (中文)',
};

export function pickLang(language: AppLanguage, dict: Partial<Record<AppLanguage, string>>): string {
  return dict[language] ?? dict.KO ?? dict.EN ?? '';
}

export const ACT_GUIDELINES: Record<number, Record<AppLanguage, string>> = {
  1: {
    KO: '도입부입니다. 세계와 인물을 자연스럽게 소개하고, 일상→균열의 흐름을 만드십시오. 정보를 서사에 녹이십시오.',
    EN: 'This is the setup. Introduce the world and characters naturally. Create a flow from normalcy to disruption. Weave exposition into narrative.',
    JP: '導入部です。世界と人物を自然に紹介し、日常→亀裂の流れを作ってください。情報を物語に溶け込ませてください。',
    CN: '这是开篇。自然地介绍世界和人物，创造从日常到裂变的流程。将信息融入叙事中。',
  },
  2: {
    KO: '상승 구간입니다. 갈등을 심화시키고, 캐릭터에게 선택을 강요하십시오. 서브플롯을 엮으십시오.',
    EN: 'Rising action. Deepen conflicts, force characters into choices. Weave in subplots.',
    JP: '上昇局面です。葛藤を深め、キャラクターに選択を迫ってください。サブプロットを織り込んでください。',
    CN: '上升阶段。深化冲突，迫使角色做出选择。编织副线情节。',
  },
  3: {
    KO: '중반 전환점입니다. 반전이나 정보 공개로 이야기의 방향을 틀어 주십시오. 독자의 기대를 배신하십시오.',
    EN: 'Midpoint pivot. Use a twist or revelation to shift the story direction. Subvert reader expectations.',
    JP: '中盤の転換点です。反転や情報公開で物語の方向を変えてください。読者の期待を裏切ってください。',
    CN: '中段转折点。用反转或信息揭露改变故事方向。颠覆读者期待。',
  },
  4: {
    KO: '하강/위기 구간입니다. 상황을 최악으로 몰아가십시오. 캐릭터의 내면 갈등이 외부 갈등과 충돌해야 합니다.',
    EN: 'Falling action / crisis. Push things to their worst. Internal conflicts must collide with external ones.',
    JP: '下降・危機局面です。状況を最悪に追い込んでください。キャラクターの内面の葛藤が外部の葛藤と衝突しなければなりません。',
    CN: '下降/危机阶段。将局势推向最坏。角色的内心冲突必须与外部冲突碰撞。',
  },
  5: {
    KO: '절정입니다. 모든 실마리를 수렴시키고, 캐릭터의 최종 선택을 묘사하십시오. 감정의 밀도를 극대화하십시오.',
    EN: 'Climax. Converge all threads. Depict the character\'s ultimate choice. Maximize emotional density.',
    JP: 'クライマックスです。すべての伏線を収束させ、キャラクターの最終選択を描いてください。感情の密度を最大化してください。',
    CN: '高潮部分。收束所有线索，描绘角色的最终选择。将情感密度最大化。',
  },
};

export function buildGenrePreset(genre: string, language: AppLanguage): string {
  const preset = GENRE_PRESETS[genre] || GENRE_PRESETS.FANTASY;
  const translator = createT(language);
  return `[${translator('pipeline.genrePresetLabel')}: ${genre}]
- ${translator('pipeline.narrativeRules')}: ${preset.rules}
- ${translator('pipeline.pacingLabel')}: ${preset.pacing} (${translator('pipeline.tensionBaseline')}: ${preset.tensionBase})
- ${translator('pipeline.cliffhangerTypes')}: ${preset.cliffTypes}
- ${translator('pipeline.emotionFocusLabel')}: ${preset.emotionFocus}
[${translator('pipeline.commonRules')}]
- ${translator('pipeline.commonRule1')}
- ${translator('pipeline.commonRule2')}
- ${translator('pipeline.commonRule3')}
- ${translator('pipeline.commonRule4')}
- ${translator('pipeline.commonRule5')}`;
}

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

  const translator = createT(language);
  const parts: string[] = [];
  const dnaNamesPack = DNA_NAMES_BY_LANG[language] ?? DNA_NAMES_BY_LANG.EN;
  const dnaNames = profile.selectedDNA.map(i => dnaNamesPack[i] ?? DNA_NAMES_BY_LANG.EN[i]).join(' + ');
  parts.push(`- ${translator('pipeline.styleIdentity')}: ${dnaNames}`);

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
      parts.push(`- ${translator('pipeline.styleParams')}: ${sliderParts.join(', ')}`);
    }
  }

  const directives: string[] = [];
  if (profile.selectedDNA.includes(0)) directives.push(translator('pipeline.hardSfDirective'));
  if (profile.selectedDNA.includes(1)) directives.push(translator('pipeline.webNovelDirective'));
  if (profile.selectedDNA.includes(2)) directives.push(translator('pipeline.literaryDirective'));
  if (profile.selectedDNA.includes(3)) directives.push(translator('pipeline.multiGenreDirective'));
  if (directives.length > 0) {
    parts.push(`- ${translator('pipeline.styleDirectives')}:\n  ${directives.join('\n  ')}`);
  }

  return '\n[STYLE DNA — 문체 스튜디오]\n' + parts.join('\n');
}

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
  const label = LANG_PACK_LABELS[language] ?? LANG_PACK_LABELS.EN;
  const parts: string[] = [];

  parts.push(`\n[${label.header}: ${pack.id}]`);
  if (pack.bannedWords.length > 0) {
    parts.push(`- ${label.banned}: ${pack.bannedWords.join(', ')}`);
  }
  if (pack.aiTonePatterns.length > 0) {
    parts.push(`- ${label.aiTone}: ${pack.aiTonePatterns.join(', ')}`);
  }
  parts.push(`- ${label.dialogue}: ${pack.dialogueMarkers.open}...${pack.dialogueMarkers.close}`);
  parts.push(`- ${label.rhythm}: ${pack.sentenceRhythm.minWords}~${pack.sentenceRhythm.maxWords} ${label.wordUnit}`);

  return parts.join('\n');
}

const EH_RULE_NOTES: Record<AppLanguage, {
  costIntensity: (pct: number) => string;
  narrativeMorph: string;
  lv9Full: string;
}> = {
  KO: {
    costIntensity: (pct) => `대가 강도: ${pct}%. 이 비율만큼 주인공의 성장/이득에 대한 손실을 서술에 반영하라.`,
    narrativeMorph: 'EH 수치가 낮아질수록 감정 형용사를 줄이고 행동/팩트 위주로 서술하라.',
    lv9Full: 'EH v1.0 원본 100% 적용. 모든 보상에 등가의 대가를 강제. 자비 없음.',
  },
  EN: {
    costIntensity: (pct) => `Cost intensity: ${pct}%. Apply this ratio of loss against protagonist's gains.`,
    narrativeMorph: 'As EH drops, reduce emotional adjectives. Focus on actions and facts.',
    lv9Full: 'EH v1.0 original 100% applied. Every reward demands equivalent cost. No mercy.',
  },
  JP: {
    costIntensity: (pct) => `代償強度: ${pct}%. この比率で主人公の成長・利得に対する損失を描写に反映せよ。`,
    narrativeMorph: 'EH数値が下がるほど感情形容詞を減らし、行動・事実中心に記述せよ。',
    lv9Full: 'EH v1.0 原本100%適用。すべての報酬に等価の代償を強制。容赦なし。',
  },
  CN: {
    costIntensity: (pct) => `代价强度: ${pct}%。按此比例将主角的成长/收益损失体现在叙述中。`,
    narrativeMorph: 'EH 数值越低，越应减少情感形容词，以行动/事实为主进行叙述。',
    lv9Full: 'EH v1.0 原版 100% 应用。每次奖励都强制等价代价。绝无宽恕。',
  },
};

export function buildEHRules(ruleLevel: number, language: AppLanguage): string {
  if (ruleLevel <= 1) return '';

  const translator = createT(language);
  const notes = EH_RULE_NOTES[language] ?? EH_RULE_NOTES.EN;
  const sections: string[] = [];
  const pctMap: Record<number, number> = { 1: 0, 2: 15, 3: 25, 4: 35, 5: 50, 6: 65, 7: 75, 8: 90, 9: 100 };
  const genreMap: Record<number, string> = { 2: "먼치킨/무쌍", 3: "로맨스", 4: "아카데미", 5: "헌터/각성", 6: "회귀물", 7: "다크 판타지", 8: "디스토피아", 9: "순문학" };
  const pct = pctMap[ruleLevel] ?? 0;
  const costMul = Math.max(0, (pct - 25) / 75);

  if (ruleLevel >= 2) {
    sections.push(`[${translator('pipeline.enforcerHeader')} Lv${ruleLevel}]\n${translator('pipeline.enforcerBody')}`);
  }
  if (ruleLevel >= 3) {
    const costNote = notes.costIntensity(Math.round(costMul * 100));
    sections.push(`[${translator('pipeline.costInflictionHeader')}]\n${translator('pipeline.costInflictionBody')}\n${costNote}`);
  }
  if (ruleLevel >= 5) {
    sections.push(`[${translator('pipeline.narrativeLockHeader')}]\n${translator('pipeline.narrativeLockBody')}`);
  }
  if (ruleLevel >= 6) {
    sections.push(`[NARRATIVE MASKING LAYER]\n${translator('pipeline.narrativeMaskingBody')}\n${notes.narrativeMorph}`);
  }
  if (ruleLevel >= 7) {
    sections.push(`[DUAL-LOG SYSTEM]\n${translator('pipeline.dualLogBody')}`);
  }
  if (ruleLevel >= 8) {
    sections.push(`[${translator('pipeline.systemPressureHeader')}]\n${translator('pipeline.systemPressureBody')}\n[DEQUALIFICATION]\n${translator('pipeline.dequalificationBody')}`);
  }
  if (ruleLevel >= 9) {
    sections.push(notes.lv9Full);
  }

  const genre = genreMap[ruleLevel] || '';
  const genreTag = genre ? ` (${genre})` : '';
  const header = `\n[${translator('pipeline.ehRuleHeader')}: Lv${ruleLevel}/9 (${pct}% ${translator('pipeline.applied')})${genreTag}]`;
  return header + '\n' + sections.join('\n\n');
}
