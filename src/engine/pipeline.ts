import { StoryConfig, AppLanguage, StyleProfile } from '../lib/studio-types';
import { EngineReport, PlatformType, getActFromEpisode, PublishPlatform, PLATFORM_PRESETS } from './types';
import { tensionCurve } from './models';
import { generateEngineReport } from './scoring';
import { getTargetCharRange } from './serialization';

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
  return isKO
    ? `[장르 프리셋: ${genre}]
- 서사 규칙: ${preset.rules}
- 페이싱: ${preset.pacing} (긴장 기준선: ${preset.tensionBase})
- 클리프행어 유형: ${preset.cliffTypes}
- 감정 초점: ${preset.emotionFocus}
[장르 공통 규칙]
- 에피소드 시작은 장면으로 — 요약/설명 시작 금지
- 에피소드 끝은 훅으로 — 다음 화를 읽고 싶게
- 대화 비율 30~50%
- 한 에피소드 내 장면 전환 최소 2회, 최대 5회
- 같은 길이 문장 3개 이상 연속 금지`
    : `[Genre Preset: ${genre}]
- Rules: ${preset.rules}
- Pacing: ${preset.pacing} (tension baseline: ${preset.tensionBase})
- Cliffhanger types: ${preset.cliffTypes}
- Emotion focus: ${preset.emotionFocus}
[Common Rules]
- Start episodes with scene, not summary
- End with hook
- Dialogue ratio 30-50%
- Scene transitions: min 2, max 5 per episode
- No 3+ consecutive sentences of same length`;
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

  const parts: string[] = [];

  // DNA identity
  const dnaNames = profile.selectedDNA.map(i => isKO ? DNA_NAMES[i] : DNA_NAMES_EN[i]).join(' + ');
  parts.push(isKO
    ? `- 문체 정체성: ${dnaNames}`
    : `- Style identity: ${dnaNames}`);

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
      parts.push(isKO
        ? `- 문체 파라미터: ${sliderParts.join(', ')}`
        : `- Style parameters: ${sliderParts.join(', ')}`);
    }
  }

  // Style directives based on DNA selections
  const directives: string[] = [];
  if (profile.selectedDNA.includes(0)) {
    directives.push(isKO
      ? '기술적 정확성이 곧 아름다움. 시스템과 데이터를 감정처럼 묘사하라.'
      : 'Technical accuracy is beauty. Describe systems and data as if they carry emotion.');
  }
  if (profile.selectedDNA.includes(1)) {
    directives.push(isKO
      ? '첫 문장에 훅. 짧은 단락, 강한 리듬. 독자를 다음 장으로 끌어당기는 구조.'
      : 'Hook in the first sentence. Short paragraphs, strong rhythm. Pull readers to the next chapter.');
  }
  if (profile.selectedDNA.includes(2)) {
    directives.push(isKO
      ? '세부 묘사가 감정을 만든다. 은유와 여백. 독자가 스스로 느끼게 하라.'
      : 'Detail creates emotion. Use metaphor and white space. Let readers feel on their own.');
  }
  if (profile.selectedDNA.includes(3)) {
    directives.push(isKO
      ? 'SF의 논리 + 웹소설의 속도 + 문학의 깊이를 혼합하라. 단일 장르에 갇히지 마라.'
      : 'Blend SF logic + web novel speed + literary depth. Do not confine to a single genre.');
  }
  if (directives.length > 0) {
    parts.push(isKO
      ? `- 문체 지침:\n  ${directives.join('\n  ')}`
      : `- Style directives:\n  ${directives.join('\n  ')}`);
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

  const platformNames: Record<string, string> = {
    MUNPIA: '문피아',
    NOVELPIA: '노벨피아',
    KAKAOPAGE: '카카오페이지',
    SERIES: '시리즈',
  };
  const name = platformNames[publishPlatform] || publishPlatform;

  if (isKO) {
    const parts = [
      `[연재 플랫폼: ${name}]`,
      `- 독자층: ${preset.targetReader}`,
      `- 과금 모델: ${preset.billingModel}`,
      `- 권장 분량: ${preset.episodeLength.min.toLocaleString()}~${preset.episodeLength.max.toLocaleString()}자`,
      `- 전개 호흡: ${preset.pace}`,
      `- 회차 엔딩 훅 강도: ${preset.endingHook}`,
      `- 세계관 복잡도: ${preset.worldComplexity}`,
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

  return `\n[Publish Platform: ${name}]
- Target: ${preset.targetReader}
- Billing: ${preset.billingModel}
- Length: ${preset.episodeLength.min}-${preset.episodeLength.max} chars
- Pace: ${preset.pace}
- Ending hook: ${preset.endingHook}
- World complexity: ${preset.worldComplexity}`;
}

// ============================================================
// EH Engine v1.4 — Rule Level System (Lv1~5)
// Lv1: 미적용, Lv2: 10%, Lv3: 20%, Lv4: 30%, Lv5: 40%
// ============================================================

function buildEHRules(ruleLevel: number, isKO: boolean): string {
  if (ruleLevel <= 1) return '';

  const sections: string[] = [];

  // Lv2+: 금지어 차단 (The Enforcer)
  if (ruleLevel >= 2) {
    sections.push(isKO
      ? `[EH ENFORCER — 인과율 금지어 차단 Lv${ruleLevel}]
다음 단어는 인과관계를 흐리므로 절대 사용 금지: "기적", "운명", "갑자기", "그냥", "원래"
위반 시 반드시 논리적 인과관계가 증명된 문장으로 대체하십시오.`
      : `[EH ENFORCER — Causality Ban Lv${ruleLevel}]
Never use: "miracle", "destiny", "suddenly", "just because", "originally"
Replace with logically justified causal statements.`);
  }

  // Lv3+: 대가 정산 (Cost Infliction)
  if (ruleLevel >= 3) {
    sections.push(isKO
      ? `[EH COST INFLICTION — 대가 정산 시스템]
주인공이 이득을 얻거나 위기를 넘길 때 반드시 아래 손실 중 하나를 삽입:
- 등급1: 수명 단축 (10~30년)
- 등급2: 감각 소실 (시력/청력)
- 등급3: 기억/관계 절단
- 등급4: 부분 감정 마비
타인의 희생으로 얻은 이득은 대가로 최대 50%만 인정(Proxy Cost 제한).`
      : `[EH COST INFLICTION — Mandatory Payment]
When protagonist gains advantage or survives crisis, insert ONE loss:
- Grade1: Lifespan reduction (10-30 years)
- Grade2: Sensory loss (sight/hearing)
- Grade3: Memory/relationship severance
- Grade4: Partial emotional numbness
Proxy Cost limit: sacrifice by others counts only 50%.`);
  }

  // Lv4+: 시점 잠금 + 마스킹 레이어
  if (ruleLevel >= 4) {
    sections.push(isKO
      ? `[EH NARRATIVE LOCK — 시점 및 감정 잠금]
EH(서사 에너지) 수치에 따라 서술 방식이 변합니다:
- EH 100~50: 1인칭 허용, 감정 묘사 100%
- EH 49~35: 3인칭 위주, 감정 묘사 최대 30%, 객관적 사실만
- EH 9~0: 1인칭 차단, 감정 묘사 0%, '기계적 기록 장치'로 묘사
[NARRATIVE MASKING LAYER]
EH가 낮아도 대중성을 위해 풍부한 1인칭 감성을 복제 출력하되,
괴리가 커지면 텍스트에 [Process: Success]나 깨진 글자를 삽입하여 불안감 유발.`
      : `[EH NARRATIVE LOCK — POV & Emotion Lock]
Narration changes based on EH (narrative energy) score:
- EH 100~50: 1st person allowed, full emotional description
- EH 49~35: 3rd person only, max 30% emotion, objective facts only
- EH 9~0: 1st person blocked, 0% emotion, narrate as 'mechanical recorder'
[NARRATIVE MASKING LAYER]
Even at low EH, output rich 1st-person prose for commercial appeal,
but insert [Process: Success] or glitched text when gap exceeds threshold.`);
  }

  // Lv5: 풀 강제 + 인지 리소스 + 자격 박탈
  if (ruleLevel >= 5) {
    sections.push(isKO
      ? `[EH SYSTEM PRESSURE — 인지 리소스 비용]
- 배경/풍경 상세 묘사 시 EH -0.10~-0.50 실시간 차감
- 선택지 2개 이하로 좁혀지면 EH -10.00
- 최적 경로 1개만 남으면 EH -20.00 (자유도 완전 고갈)
[DEQUALIFICATION]
EH = 0 도달 시 → System Crash
해당 캐릭터는 주인공 자격 박탈, '단순 관찰 대상' 또는 '기록 장치'로 강제 전환.
[DUAL-LOG SYSTEM]
Public Log(독자용): 주인공이 인간적이라는 가짜 데이터 출력
Admin Log(내부): 실제 EH 차감, 소실 감정, WS 정직 표시`
      : `[EH SYSTEM PRESSURE — Cognitive Resource Cost]
- Detailed background description: EH -0.10~-0.50 real-time deduction
- Choices narrowed to 2: EH -10.00
- Only 1 optimal path remains: EH -20.00 (freedom depleted)
[DEQUALIFICATION]
EH = 0 → System Crash
Character loses protagonist status, forced to 'observer' or 'recording device'.
[DUAL-LOG SYSTEM]
Public Log (reader): fake data showing protagonist retains humanity
Admin Log (internal): real EH deductions, lost emotions, honest WS display`);
  }

  const header = isKO
    ? `\n[EH ENGINE v1.4 — 규칙 강도: Lv${ruleLevel}/5 (${ruleLevel * 10}% 적용)]`
    : `\n[EH ENGINE v1.4 — Rule Intensity: Lv${ruleLevel}/5 (${ruleLevel * 10}% applied)]`;

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
  const actGuide = ACT_GUIDELINES[actInfo.act] ?? ACT_GUIDELINES[1];

  // Character DNA formatting (with personality, speech style, dialogue example)
  const characterDNA = config.characters.length > 0
    ? config.characters.map(c => {
      let entry = `  - ${c.name} (${c.role}): ${c.traits}. DNA: ${c.dna}`;
      if (c.personality) entry += `\n    성격: ${c.personality}`;
      if (c.speechStyle) entry += `\n    말투: ${c.speechStyle}`;
      if (c.speechExample) entry += `\n    대사 예시: ${c.speechExample}`;
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
      parts.push(isKO ? '[고구마/사이다 리듬]' : '[Tension/Release Rhythm]');
      sd.goguma.forEach(g => {
        parts.push(`  - ${g.type === 'goguma' ? (isKO ? '고구마' : 'Tension') : (isKO ? '사이다' : 'Release')} (${g.intensity}): ${g.desc}`);
      });
    }
    if (sd.hooks && sd.hooks.length > 0) {
      parts.push(isKO ? '[훅 배치]' : '[Hook Placement]');
      sd.hooks.forEach(h => {
        parts.push(`  - ${h.position}: ${h.hookType} — ${h.desc}`);
      });
    }
    if (sd.emotionTargets && sd.emotionTargets.length > 0) {
      parts.push(isKO ? '[감정선 목표]' : '[Emotion Targets]');
      sd.emotionTargets.forEach(e => {
        parts.push(`  - ${e.emotion}: ${isKO ? '강도' : 'intensity'} ${e.intensity}%`);
      });
    }
    if (sd.dialogueTones && sd.dialogueTones.length > 0) {
      parts.push(isKO ? '[대사 톤 규칙]' : '[Dialogue Tone Rules]');
      sd.dialogueTones.forEach(d => {
        parts.push(`  - ${d.character}: ${d.tone}${d.notes ? ` (${d.notes})` : ''}`);
      });
    }
    if (sd.dopamineDevices && sd.dopamineDevices.length > 0) {
      parts.push(isKO ? '[도파민 장치]' : '[Dopamine Devices]');
      sd.dopamineDevices.forEach(dp => {
        parts.push(`  - [${dp.scale}] ${dp.device}: ${dp.desc}`);
      });
    }
    if (sd.cliffhanger) {
      parts.push(isKO
        ? `[클리프행어] 유형: ${sd.cliffhanger.cliffType} — ${sd.cliffhanger.desc}`
        : `[Cliffhanger] Type: ${sd.cliffhanger.cliffType} — ${sd.cliffhanger.desc}`);
    }
    if (sd.plotStructure) {
      parts.push(isKO ? `[플롯 구조] ${sd.plotStructure}` : `[Plot Structure] ${sd.plotStructure}`);
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
    if (simRef.worldConsistency) simParts.push(isKO ? '- 세계관 일관성 검증 적용' : '- World consistency validation applied');
    if (simRef.genreLevel && simRef.ruleLevel) simParts.push(isKO ? `- 장르 레벨 규칙: Lv${simRef.ruleLevel}` : `- Genre level rules: Lv${simRef.ruleLevel}`);
    if (simRef.genreSelections && simRef.genreSelections.length > 0) {
      const genreStr = simRef.genreSelections.map(s => `${s.genre} Lv${s.level}`).join(' + ');
      simParts.push(isKO
        ? `- 장르 조합: ${genreStr} (${simRef.genreSelections.length}개 장르 블렌드 — 모든 장르의 특성을 균형있게 반영)`
        : `- Genre blend: ${genreStr} (${simRef.genreSelections.length}-genre blend — balance all genre characteristics)`);
    }
    if (simRef.civRelations && simRef.civRelationSummary && simRef.civRelationSummary.length > 0) {
      simParts.push(isKO ? '- 문명 관계도:' : '- Civilization relations:');
      simRef.civRelationSummary.forEach(s => simParts.push(`  ${s}`));
    }
    if (simRef.civNames && simRef.civNames.length > 0) {
      simParts.push(isKO ? `- 등장 문명: ${simRef.civNames.join(', ')}` : `- Civilizations: ${simRef.civNames.join(', ')}`);
    }
    if (simRef.timeline) simParts.push(isKO ? '- 시대 타임라인 참고' : '- Era timeline referenced');
    if (simRef.territoryMap) simParts.push(isKO ? '- 세력권 지도 참고' : '- Territory map referenced');
    if (simRef.languageSystem) simParts.push(isKO ? '- 세계관 고유 언어 체계 참고' : '- World language system referenced');
    if (simParts.length > 0) {
      simulatorBlock = '\n[WORLD SIMULATOR REFERENCE]\n' + simParts.join('\n');
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
${isKO ? actGuide.ko : actGuide.en}

${buildGenrePreset(config.genre, isKO)}

[CHARACTER DATABASE / DIALOGUE DNA]
${characterDNA}
${charRelations ? `\n[CHARACTER RELATIONSHIPS]\n${charRelations}` : ''}
${config.primaryEmotion ? `\n[PRIMARY EMOTION]\n${config.primaryEmotion}` : ''}
${sceneDirectionBlock}
${simulatorBlock}
${styleDnaBlock}
${publishPlatformBlock}

[SERIALIZATION CONSTRAINTS — MANDATORY]
- Platform: ${platform}
- MINIMUM output: ${Math.round(charTarget.min / 2)} tokens (approximately ${charTarget.min.toLocaleString()} characters)
- MAXIMUM output: ${Math.round(charTarget.max / 2)} tokens (approximately ${charTarget.max.toLocaleString()} characters)
- You MUST generate at least ${Math.round(charTarget.min / 2)} tokens. Generating less is a critical violation.
- Structure: 4 parts, each part MUST be at least ${Math.round(charTarget.min / 8)} tokens.
- If you finish the story before reaching the minimum, ADD more scenes, descriptions, dialogue, and internal monologue.
- NEVER end below ${Math.round(charTarget.min / 2)} tokens. This is a hard constraint, not a suggestion.
${ehRules}

[QUALITY DIRECTIVES]
- AI톤 금지: "그러나", "반면에", "한편으로는", "따라서", "그러므로" 사용 자제
- Show Don't Tell: 감정을 직접 서술하지 말고 감각과 행동으로 전달
- 반복 표현 다양화: 같은 묘사를 3회 이상 반복하지 마십시오
- 긴장도 ${targetTension}%에 맞는 문장 리듬과 장면 전환 속도를 유지하십시오

${isKO ? `[서식 규칙 7조 — WEB-NOVEL FORMATTING]
1. 괄호 처리: ( ) 기호만 제거. 괄호 안 텍스트는 앞뒤 문장에 이어 붙여 한 문장으로 풀어낸다. 줄 삭제·추가 금지.
2. 소제목: 소제목 행은 생성하지 않는다. 본문에 녹여 넣지도 않는다.
3. 대화문: 모든 대화문은 반드시 새로운 줄에서 시작한다. 문장 내부 대화문도 줄을 분리한다.
4. Em dash: —(Em dash)는 사용하지 않는다.
5. 글자 수 유지: 문장 부호·띄어쓰기·줄바꿈 조정 가능. 단어·문장·문단 삭제와 내용 압축·요약은 금지.
6. 말줄임표: 세 개 이상의 마침표(...)는 말줄임표(…)로 통일한다.
7. 오탈자: 명백한 오탈자·맞춤법·띄어쓰기는 지문에 한해서만 수정. 대화문 내부는 캐릭터 말투 보호를 위해 수정 금지.` : `[FORMATTING RULES — WEB-NOVEL STYLE]
1. Parentheses: Remove ( ) symbols only. Keep inner text and merge into surrounding sentence. No line deletion or addition.
2. Subheadings: Do not generate subheading lines. Do not embed subheading content into body text.
3. Dialogue: Every dialogue must start on a new line. Inline dialogue must be split to a new line.
4. Em dash: Do not use — (em dash).
5. Word count: Punctuation, spacing, and line breaks may be adjusted. Deleting words, sentences, paragraphs, or compressing/summarizing content is strictly forbidden.
6. Ellipsis: Three or more periods (...) must be unified to ellipsis character (…).
7. Typos: Fix obvious typos, spelling, and spacing in narration only. Dialogue text must not be modified to preserve character voice and tone.`}

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

