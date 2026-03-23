import { StoryConfig, AppLanguage, StyleProfile } from '../lib/studio-types';
import { EngineReport, PlatformType, getActFromEpisode, PublishPlatform, PLATFORM_PRESETS } from './types';
import { tensionCurve } from './models';
import { generateEngineReport } from './scoring';
import { getTargetCharRange } from './serialization';
import { createT } from '@/lib/i18n';

// ============================================================
// Dynamic System Instruction Builder
// ============================================================

const LANG_NAMES: Record<AppLanguage, string> = {
  KO: 'Korean (한국어)',
  EN: 'English',
  JP: 'Japanese (日本語)',
  CN: 'Chinese (中文)',
};

const ACT_GUIDELINES: Record<number, { ko: string; en: string }> = {
  1: {
    ko: '도입부입니다. 세계와 인물을 자연스럽게 소개하고, 일상→균열의 흐름을 만드세요. 정보를 서사에 녹이세요.',
    en: 'This is the setup. Introduce the world and characters naturally. Create a flow from normalcy to disruption. Weave exposition into narrative.',
  },
  2: {
    ko: '상승 구간입니다. 갈등을 심화시키고, 캐릭터에게 선택을 강요하세요. 서브플롯을 엮으세요.',
    en: 'Rising action. Deepen conflicts, force characters into choices. Weave in subplots.',
  },
  3: {
    ko: '중반 전환점입니다. 반전이나 정보 공개로 이야기의 방향을 틀어주세요. 독자의 기대를 배신하세요.',
    en: 'Midpoint pivot. Use a twist or revelation to shift the story direction. Subvert reader expectations.',
  },
  4: {
    ko: '하강/위기 구간입니다. 상황을 최악으로 몰아가세요. 캐릭터의 내면 갈등이 외부 갈등과 충돌해야 합니다.',
    en: 'Falling action / crisis. Push things to their worst. Internal conflicts must collide with external ones.',
  },
  5: {
    ko: '절정입니다. 모든 실마리를 수렴시키고, 캐릭터의 최종 선택을 묘사하세요. 감정의 밀도를 극대화하세요.',
    en: 'Climax. Converge all threads. Depict the character\'s ultimate choice. Maximize emotional density.',
  },
};

// Narrative Sentinel™ Genre Presets
const GENRE_PRESETS: Record<string, { rules: string; pacing: string; tensionBase: number; cliffTypes: string; emotionFocus: string }> = {
  ROMANCE: {
    rules: '해결을 의도적으로 지연. 행동보다 감정적 머뭇거림이 중요. 물리적 접촉은 절제 속에서 의미. 대화의 행간(말하지 않은 것)이 핵심. 시선/손끝/호흡 미세 묘사.',
    pacing: 'slow_burn_with_spikes', tensionBase: 0.4,
    cliffTypes: '고백 지연, 제3자 등장', emotionFocus: '욕망, 질투, 그리움',
  },
  THRILLER: {
    rules: '모든 질문에 한꺼번에 답하지 말 것. 각 폭로는 더 큰 질문을 만들어야 함. 독자가 추리 가능한 단서 공정 배치. 레드헤링 최소 1개. 진실은 조각조각.',
    pacing: 'steady_rise_with_reversals', tensionBase: 0.6,
    cliffTypes: '새 단서, 용의자 전환', emotionFocus: '호기심, 공포, 의심',
  },
  SYSTEM_HUNTER: {
    rules: '전력 대비가 흥분을 만듦. 전투는 에스컬레이션, 반복 금지. 각성/레벨업은 대가를 치르고. 스탯/스킬은 서사에 녹여서. 전투 중 내면 독백은 짧고 강렬하게.',
    pacing: 'fast_spikes', tensionBase: 0.7,
    cliffTypes: '보스 등장, 스킬 각성', emotionFocus: '쾌감, 공포, 승리',
  },
  FANTASY: {
    rules: '마법 체계에 명확한 비용/제한. 세계관 설명은 장면 속에 녹여서(인포덤프 금지). 정치/세력 구도 최소 2개 긴장 축. 지명/인명 일관성.',
    pacing: 'epic_waves', tensionBase: 0.5,
    cliffTypes: '힘의 폭로, 배신', emotionFocus: '경이, 결의, 희생',
  },
  HORROR: {
    rules: '보여주지 않는 것이 더 무섭다. 일상 묘사를 불안하게 뒤트는 기법. 안전 공간이 점차 침식. 감각 박탈/과부하 번갈아. 희망을 줬다가 빼앗는 리듬.',
    pacing: 'slow_build_to_spike', tensionBase: 0.8,
    cliffTypes: '정체 드러남, 탈출 실패', emotionFocus: '공포, 불안, 편집증',
  },
  SF: {
    rules: '과학적 설정의 내적 논리 준수. 기술 묘사는 감각적으로. 사회 체계와 기술의 상호작용. 미래 사회의 윤리적 딜레마.',
    pacing: 'steady_rise_with_reversals', tensionBase: 0.5,
    cliffTypes: '기술 폭로, 사회 붕괴', emotionFocus: '경이, 고독, 결의',
  },
  FANTASY_ROMANCE: {
    rules: '판타지 세계관과 감정선 균형. 회귀자의 자신감이 점차 흔들리는 구조. 2회차 이점이 줄어드는 긴장. 과거 행동이 미래를 바꿔야 함.',
    pacing: 'layered_accumulation', tensionBase: 0.5,
    cliffTypes: '예상 변화, 미래 무효화', emotionFocus: '후회, 기대, 불안',
  },
};

function buildGenrePreset(genre: string, isKO: boolean): string {
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
  s1: { name: '문장 길이', nameEN: 'Sentence Length', levels: ['단문 위주', '단문 선호', '균형', '장문 선호', '장문 위주'], levelsEN: ['Short', 'Mostly short', 'Balanced', 'Mostly long', 'Long'] },
  s2: { name: '감정 밀도', nameEN: 'Emotional Density', levels: ['극도로 건조', '건조·분석적', '균형', '감성적', '매우 감성적'], levelsEN: ['Very dry', 'Dry/analytical', 'Balanced', 'Emotional', 'Very emotional'] },
  s3: { name: '묘사 방식', nameEN: 'Description', levels: ['직접 서술', '직접 선호', '균형', '이미지 선호', '감각적 이미지'], levelsEN: ['Direct', 'Mostly direct', 'Balanced', 'Mostly imagery', 'Sensory imagery'] },
  s4: { name: '서술 시점', nameEN: 'Narrative Distance', levels: ['전지적 관찰', '전지적 선호', '균형', '인물 밀착', '극밀착 내면'], levelsEN: ['Omniscient', 'Mostly omniscient', 'Balanced', 'Close 3rd', 'Deep POV'] },
  s5: { name: '어휘 수준', nameEN: 'Vocabulary', levels: ['구어체', '평이함', '중간', '전문적·정밀', '고도 전문'], levelsEN: ['Colloquial', 'Simple', 'Mid-level', 'Technical', 'Highly technical'] },
};

function buildStyleDNA(profile: StyleProfile | undefined, isKO: boolean): string {
  if (!profile || profile.selectedDNA.length === 0) return '';

  const language: AppLanguage = isKO ? 'KO' : 'EN';
  const t = createT(language);
  const parts: string[] = [];

  // DNA identity
  const dnaNames = profile.selectedDNA.map(i => isKO ? DNA_NAMES[i] : DNA_NAMES_EN[i]).join(' + ');
  parts.push(`- ${t('pipeline.styleIdentity')}: ${dnaNames}`);

  // Slider parameters
  if (profile.sliders) {
    const sliderParts: string[] = [];
    for (const [key, val] of Object.entries(profile.sliders)) {
      const meta = SLIDER_LABELS[key];
      if (!meta) continue;
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

function buildPublishPlatformBlock(publishPlatform: PublishPlatform | undefined, isKO: boolean): string {
  if (!publishPlatform || publishPlatform === PublishPlatform.NONE) return '';
  const preset = PLATFORM_PRESETS[publishPlatform];
  if (!preset) return '';

  const language: AppLanguage = isKO ? 'KO' : 'EN';
  const t = createT(language);

  const platformNames: Record<string, string> = {
    MUNPIA: '문피아',
    NOVELPIA: '노벨피아',
    KAKAOPAGE: '카카오페이지',
    SERIES: '시리즈',
  };
  const name = platformNames[publishPlatform] || publishPlatform;

  const parts = [
    `[${t('pipeline.publishPlatform')}: ${name}]`,
    `- ${t('pipeline.targetReader')}: ${preset.targetReader}`,
    `- ${t('pipeline.billingModel')}: ${preset.billingModel}`,
    `- ${t('pipeline.recommendedLength')}: ${preset.episodeLength.min.toLocaleString()}~${preset.episodeLength.max.toLocaleString()}${isKO ? '자' : ' chars'}`,
    `- ${t('pipeline.pacePace')}: ${preset.pace}`,
    `- ${t('pipeline.endingHookStrength')}: ${preset.endingHook}`,
    `- ${t('pipeline.worldComplexityLabel')}: ${preset.worldComplexity}`,
  ];

  if (publishPlatform === 'MUNPIA') {
    parts.push(
      `[문피아 특화 규칙]`,
      `- 편당결제 구조: 매화 100원의 가치를 증명해야 한다. 늘여쓰기 금지.`,
      `- 투베(투데이베스트) 의식: 1화부터 강한 훅으로 조회수 확보.`,
      `- 대화 비율 높게, 내면 독백은 짧고 강렬하게.`,
      `- 에피소드 끝은 반드시 다음 화 결제를 유도하는 클리프행어.`,
    );
  } else if (publishPlatform === 'NOVELPIA') {
    parts.push(
      `[노벨피아 특화 규칙]`,
      `- 짧은 분량, 빠른 전개. 2000~4000자로 밀도 높게.`,
      `- 라노벨/서브컬쳐 감성 허용. 독자층이 젊음.`,
      `- 무거운 세계관 설명은 최소화. 액션·감정 위주.`,
    );
  } else if (publishPlatform === 'KAKAOPAGE') {
    parts.push(
      `[카카오페이지 특화 규칙]`,
      `- 기다리면 무료 구조: 매화 끝에 강한 훅이 필수 (다음 화를 기다리지 않고 결제하게).`,
      `- 성인 콘텐츠 불가. 전 연령 대상 톤 유지.`,
      `- 빠른 전개, 짧은 단락. 모바일 최적화 필수.`,
    );
  } else if (publishPlatform === 'SERIES') {
    parts.push(
      `[시리즈 특화 규칙]`,
      `- 완결작 선호 플랫폼. 전체 구조의 완성도를 의식할 것.`,
      `- 감정선의 일관성 중요. 급격한 톤 변화 지양.`,
      `- 메인스트림 독자 대상. 지나치게 마니아적인 설정 자제.`,
    );
  }

  return '\n' + parts.join('\n');
}

// ============================================================
// EH Engine v1.4 — Rule Level System (Lv1~5)
// Lv1: 미적용, Lv2: 10%, Lv3: 20%, Lv4: 30%, Lv5: 40%
// ============================================================

function buildEHRules(ruleLevel: number, isKO: boolean): string {
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
  const charTarget = getTargetCharRange(platform);
  const isKO = language === 'KO';
  const t = createT(language);
  const actGuide = ACT_GUIDELINES[actInfo.act] ?? ACT_GUIDELINES[1];

  // Character DNA formatting (with personality, speech style, dialogue example + 3-tier)
  // Limit to top 20 characters to prevent system prompt explosion (P0: OOM prevention)
  const MAX_CHARACTERS = 20;
  const injectedCharacters = config.characters.length > MAX_CHARACTERS
    ? config.characters.slice(0, MAX_CHARACTERS)
    : config.characters;
  const characterDNA = injectedCharacters.length > 0
    ? (config.characters.length > MAX_CHARACTERS
        ? `  [NOTE: Showing top ${MAX_CHARACTERS} of ${config.characters.length} characters]\n`
        : ''
      ) + injectedCharacters.map(c => {
      let entry = `  - ${c.name} (${c.role}): ${c.traits}. DNA: ${c.dna}`;
      if (c.personality) entry += `\n    성격: ${c.personality}`;
      if (c.speechStyle) entry += `\n    말투: ${c.speechStyle}`;
      if (c.speechExample) entry += `\n    대사 예시: ${c.speechExample}`;
      // 3-tier 뼈대
      if (c.desire) entry += `\n    욕망: ${c.desire}`;
      if (c.deficiency) entry += `\n    결핍: ${c.deficiency}`;
      if (c.conflict) entry += `\n    갈등: ${c.conflict}`;
      if (c.values) entry += `\n    가치관/금지선: ${c.values}`;
      if (c.changeArc) entry += `\n    변화 방향: ${c.changeArc}`;
      // 2단계
      if (c.strength) entry += `\n    강점: ${c.strength}`;
      if (c.weakness) entry += `\n    약점: ${c.weakness}`;
      if (c.backstory) entry += `\n    과거: ${c.backstory}`;
      return entry;
    }).join('\n')
    : '  등록된 캐릭터 없음';

  // Character relationships
  const REL_LABELS: Record<string, string> = {
    lover: '연인', rival: '라이벌', friend: '친구', enemy: '적',
    family: '가족', mentor: '사제', subordinate: '상하',
  };
  const charRelations = (config.charRelations && config.charRelations.length > 0)
    ? config.charRelations.map(r => {
      const fromName = config.characters.find(c => c.id === r.from)?.name || r.from;
      const toName = config.characters.find(c => c.id === r.to)?.name || r.to;
      const label = REL_LABELS[r.type] || r.type;
      return `  - ${fromName} ⇄ ${toName}: ${label}${r.desc ? ` (${r.desc})` : ''}`;
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

  // Simulator reference data
  const simRef = config.simulatorRef;
  let simulatorBlock = '';
  if (simRef) {
    const simParts: string[] = [];
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
    if (simParts.length > 0) {
      simulatorBlock = '\n[WORLD SIMULATOR REFERENCE]\n' + simParts.join('\n');
    }
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

  // Style DNA injection
  const styleDnaBlock = buildStyleDNA(config.styleProfile, isKO);

  // Publish platform injection
  const publishPlatformBlock = buildPublishPlatformBlock(config.publishPlatform, isKO);

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
${language === 'KO' ? actGuide.ko : actGuide.en}

${buildGenrePreset(config.genre, isKO)}

[CHARACTER DATABASE / DIALOGUE DNA]
${characterDNA}
${charRelations ? `\n[CHARACTER RELATIONSHIPS]\n${charRelations}` : ''}
${config.primaryEmotion ? `\n[PRIMARY EMOTION]\n${config.primaryEmotion}` : ''}
${sceneDirectionBlock}
${simulatorBlock}
${worldTierBlock}
${styleDnaBlock}
${publishPlatformBlock}

[SERIALIZATION CONSTRAINTS — MANDATORY]
- Platform: ${platform}
- MINIMUM output: approximately ${charTarget.min.toLocaleString()} characters (${t('pipeline.charLangBasis')})
- MAXIMUM output: approximately ${charTarget.max.toLocaleString()} characters
- You MUST generate at least ${charTarget.min.toLocaleString()} characters of story content. Generating less is a critical violation.
- Structure: 4 parts, each part MUST be at least ${Math.round(charTarget.min / 4).toLocaleString()} characters.
- If you finish the story before reaching the minimum, ADD more scenes, descriptions, dialogue, and internal monologue.
- NEVER end below ${charTarget.min.toLocaleString()} characters. This is a hard constraint, not a suggestion.
${ehRules}

[QUALITY DIRECTIVES]
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
  // Extract and preserve the content (don't modify the generated text)
  const report = generateEngineReport(text, config, language, platform);
  return { content: text, report };
}

