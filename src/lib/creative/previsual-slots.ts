// ============================================================
// previsual-slots — 프리비주얼 4종 + 매체 변환 슬롯 엔진 (Wave E5)
// 사양 (산식·분류 출처 — 발명 금지, 그대로 따름):
//   - claude/_도구/07_IP_자산화/_프리비주얼_웹툰용_전환_프로토콜.md
//       §2.5 정보 위계(배경>인물>대사) / §6 프리비주얼 4 Visual Bible
//       (World·Character·Location·Scene-to-Prompt)
//   - claude/_도구/07_IP_자산화/_AI_매체_변환_표준.md
//       §1 이미지 32 슬롯(Core4·Visual6·Lighting5·Color5·Quality4·Advanced8)
//       §2 영상 51 = 이미지 32 + 특화 19(Motion5·Sequence4·Audio6·Coherence4)
//       §3 음성(Speaker4·Text3·Emotion3·Prosody5·Nonverbal5·Context3 = 23 —
//          헤더 표기 "24개"와 테이블 열거 합 23의 사양 내부 불일치는
//          VOICE_SLOT_TOTAL 주석에 표기·날조 금지)
//       §4 Tier 시스템 / §6 슬롯 → 프롬프트 변환 룰(골격)
//   - claude/_도구/07_IP_자산화/_소설_AI영상_제작_파이프라인.md
//       (슬롯 재료는 위 표준 §1-§3 재사용 — 본 모듈은 슬롯/골격 layer까지만)
//   - claude/_도구/07_IP_자산화/_spoiler_classification.md §1·§3·§8
//       (E3 spoiler-guard 연동 — Confidential/Restricted 노출 차단 플래그)
// 순수 TS. React/DOM/fetch 0. 실제 이미지·영상·음성 생성 호출 0 —
// 슬롯 명세 + 프롬프트 골격만 산출한다.
// [정직] 슬롯 분류·기본값·골격 = 사양 그대로(고신뢰). 단 LLM 자동 추론
// 영역(Tier 2 값 채움)은 본 모듈이 수행하지 않고 'unfilled'로 표기한다.
// 자동 추정이 개입하는 게이트 집계의 confidence 0.6 (0.55-0.65 한계 명시).
// ============================================================

import {
  classifySpoiler,
  canExposeInMedia,
  type SpoilerLevel,
  type MediaTarget,
  type ExposureJudgment,
  type SpoilerEntry,
} from './spoiler-guard';

// ============================================================
// PART 1 — 타입 정의 (입력 scene/config · 프리비주얼 4종 · 슬롯 엔진)
// ============================================================

/** 프리비주얼 4종 키 (프로토콜 §6 — World/Character/Location/Scene-to-Prompt). */
export type PrevisualKind = 'world' | 'character' | 'location' | 'sceneToPrompt';

/** 슬롯 Tier 라벨 — 매체 변환 표준 §1-§4 표기 그대로 (범위형 '1-2'·'2-3' 포함). */
export type SlotTierLabel = '1' | '1-2' | '2' | '2-3' | '3';

/** 슬롯 값 출처: scene 입력 / 사양 default / 미채움(작가 입력·자동 추론 대기). */
export type SlotValueSource = 'scene' | 'default' | 'unfilled';

/** 슬롯 엔진이 다루는 매체 3종 (표준 §1-§3). */
export type SlotMedium = 'image' | 'video' | 'voice';

/** 캐릭터 입력 — Character Visual Bible 7항목 (프로토콜 §6) + 비밀 슬롯 등급. */
export interface PrevisualCharacterInput {
  name?: string;
  apparentAge?: string;
  silhouette?: string;
  eyes?: string;
  costume?: string;
  anchorProp?: string;
  color?: string;
  negative?: string;
  /**
   * 비밀 슬롯 등급 (_spoiler_classification.md §6).
   * 미지정 = Public 취급 — Visual Bible 항목(외형·복장)은 사양 §6에서
   * Public 영역으로 명시된 필드이기 때문 (비밀 슬롯만 별도 등급 부여).
   */
  classification?: string | null;
  /** 공개 회차 (§2.1 publicAtEpisode). */
  publicAtEpisode?: number | null;
}

/** 참조 fact 입력 — E3 SpoilerEntry 필드 통과 + 식별자/공개 회차. */
export interface PrevisualFactRef extends SpoilerEntry {
  id?: string;
  label?: string;
  publicAtEpisode?: number | null;
}

/** buildPrevisualSlots 입력 (씬시트/작품 config 추출분 — 전부 선택). */
export interface PrevisualSceneInput {
  workId?: string;
  /** 현재 작성·변환 중 회차 (스포일러 회차 게이트 기준, §3.1). */
  episode?: number | null;
  /** Scene-to-Prompt: shotId·panelType·visualFocus (프로토콜 §6). */
  shotId?: string;
  panelType?: string;
  visualFocus?: string;
  /** 이미지 Core 4 (표준 §1.1 Tier 1): subject·action·setting·mood. */
  subject?: string;
  action?: string;
  setting?: string;
  mood?: string;
  /** 대사 (영상 Audio dialogue + 음성 text 슬롯, 표준 §2.3·§3.2). */
  dialogue?: string;
  /** 감정 (Scene-to-Prompt emotion 필드). */
  emotion?: string;
  /** World Visual Bible: palette·primarySymbols·forbidden (프로토콜 §6). */
  palette?: string[];
  primarySymbols?: string[];
  forbidden?: string[];
  /** Location Visual Bible: 반복 장소 (프로토콜 §6 — 3-5개 권장). */
  locations?: string[];
  /** Character Visual Bible 입력. */
  characters?: PrevisualCharacterInput[];
  /** 매체 변환 시 참조하는 세계관 fact (스포일러 게이트 대상). */
  facts?: PrevisualFactRef[];
}

/** World Visual Bible — 색·상징·금지 고정 (프로토콜 §6). */
export interface WorldVisualBible {
  kind: 'world';
  palette: string[];
  primarySymbols: string[];
  forbidden: string[];
}

/** 캐릭터 1명의 노출 차단 플래그 (E3 canExposeInMedia 'cover' 게이트 결과). */
export interface SpoilerExposureFlag {
  level: SpoilerLevel;
  /** true = 슬롯 노출 차단 (Confidential / Restricted 미도달 / 미상 등급). */
  blocked: boolean;
  judgment: ExposureJudgment;
  reason: string;
}

/** Character Visual Bible — 캐릭별 그림 고정값 7항목 (프로토콜 §6). */
export interface CharacterVisualBible {
  kind: 'character';
  name: string | null;
  apparentAge: string | null;
  silhouette: string | null;
  eyes: string | null;
  costume: string | null;
  anchorProp: string | null;
  color: string | null;
  negative: string | null;
  /** 표지·캐릭 일러 게이트 (§3.4 — Restricted·Confidential 차단). */
  exposure: SpoilerExposureFlag;
}

/** Location Visual Bible — 반복 장소 3-5개 (프로토콜 §6). */
export interface LocationVisualBible {
  kind: 'location';
  locations: string[];
  /** 사양 권장 범위 그대로 (3-5개). */
  recommendedRange: { min: number; max: number };
  withinRecommended: boolean;
}

/** Scene-to-Prompt — 씬시트 → 컷 프롬프트 골격 (프로토콜 §6 필드 그대로). */
export interface SceneToPromptBible {
  kind: 'sceneToPrompt';
  shotId: string | null;
  panelType: string | null;
  visualFocus: string | null;
  dialogue: string | null;
  emotion: string | null;
  /** 프롬프트 코어 골격 — 미채움 슬롯은 [slot] 플레이스홀더 유지. */
  promptCore: string;
  negative: string;
  /** 정보 위계 배경>인물>대사 (프로토콜 §2.5 — 변환 사고 순서). */
  infoHierarchy: readonly ['background', 'character', 'dialogue'];
}

/** 슬롯 1개 명세. */
export interface SlotSpec {
  name: string;
  /** 소속 카테고리의 Tier 라벨 (사양 표기 그대로). */
  tier: SlotTierLabel;
  /** 채워진 값. unfilled면 null (작가 입력 또는 Tier 자동 추론 대기). */
  value: string | null;
  source: SlotValueSource;
}

/** 슬롯 카테고리 (사양 §1-§3 분류 그대로). */
export interface SlotCategoryPlan {
  category: string;
  tier: SlotTierLabel;
  slots: SlotSpec[];
}

/** 매체 1개의 슬롯 plan + 프롬프트 골격. */
export interface MediumSlotPlan {
  medium: SlotMedium;
  /** 사양 슬롯 총수: image 32 / video 51 / voice 23 (열거 기준). */
  totalSlots: number;
  categories: SlotCategoryPlan[];
  /** §6 변환 룰 골격 — 채워진 슬롯만 치환, 나머지 [slot] 유지. */
  promptSkeleton: string;
}

/** fact 1건의 매체별 노출 차단 플래그. */
export interface FactExposureFlag extends SpoilerExposureFlag {
  id: string;
  label: string | null;
}

/** 매체 1개의 스포일러 게이트 집계 (§8 spoilerGate). */
export interface MediumSpoilerGate {
  medium: MediaTarget;
  /**
   * 집계: 1건이라도 BLOCKED → BLOCKED / 아니면 WARNING 존재 시 WARNING / 그 외 PASS.
   * [추정 표명] §8은 개별 판정만 명시·집계 규칙은 직접 명시 X — 보수 방향
   * (가장 나쁜 판정 우선)으로 해석. confidence 0.6.
   */
  judgment: ExposureJudgment;
  flags: FactExposureFlag[];
}

/** buildPrevisualSlots 결과. */
export interface PrevisualSlotsResult {
  /** 프리비주얼 4종 (프로토콜 §6). */
  previsual: {
    world: WorldVisualBible;
    character: CharacterVisualBible[];
    location: LocationVisualBible;
    sceneToPrompt: SceneToPromptBible;
  };
  /** 슬롯 엔진 — 이미지 32 / 영상 51 / 음성 23 (표준 §1-§3 열거 그대로). */
  slotEngine: {
    image: MediumSlotPlan;
    video: MediumSlotPlan;
    voice: MediumSlotPlan;
  };
  /** E3 spoiler-guard 연동 게이트 (음성 매체 = E3 MediaTarget 'audio'). */
  spoilerGate: {
    image: MediumSpoilerGate;
    video: MediumSpoilerGate;
    audio: MediumSpoilerGate;
  };
  /** 자동 추정(게이트 집계·골격 치환) 한계 표명 — 0.55-0.65 대역. */
  confidence: number;
}

// ============================================================
// PART 2 — 슬롯 카탈로그 상수 (사양 §1-§3 분류·기본값 그대로)
// ============================================================

/** 프리비주얼 4종 키 목록 (테스트·외부 검증용). */
export const PREVISUAL_KINDS: readonly PrevisualKind[] = Object.freeze([
  'world',
  'character',
  'location',
  'sceneToPrompt',
]);

/** 정보 위계 — 배경 > 인물 > 대사 (프로토콜 §2.5). */
export const INFO_HIERARCHY = Object.freeze([
  'background',
  'character',
  'dialogue',
] as const);

/** 사양 슬롯 총수 (표준 §1-§3). */
export const IMAGE_SLOT_TOTAL = 32;
export const VIDEO_SLOT_TOTAL = 51;
/**
 * [정직 — 사양 내부 불일치 표기] 표준 §3 헤더는 "음성 슬롯 (24개)"로 표기하나
 * §3.1-§3.6 테이블 열거 합 = 4+3+3+5+5+3 = 23. 발명 금지 원칙에 따라 24번째
 * 슬롯을 날조하지 않고 열거된 23개를 그대로 구현한다 (불일치 해소는 사양 문서 영역).
 */
export const VOICE_SLOT_TOTAL = 23;

/** 자동 추정 confidence (0.55-0.65 한계 — 정직 표명). */
export const PREVISUAL_AUTO_CONFIDENCE = 0.6;

interface SlotDef {
  name: string;
  /** 사양에 굵게 명시된 default만 (없으면 unfilled). */
  defaultValue?: string;
}

interface SlotCatalogCategory {
  category: string;
  tier: SlotTierLabel;
  slots: readonly SlotDef[];
}

// 표준 §1 이미지 32 슬롯 — 6 카테고리.
const IMAGE_SLOT_CATALOG: readonly SlotCatalogCategory[] = Object.freeze([
  {
    category: 'Core',
    tier: '1',
    slots: [{ name: 'subject' }, { name: 'action' }, { name: 'setting' }, { name: 'mood' }],
  },
  {
    category: 'Visual',
    tier: '2',
    slots: [
      { name: 'style' },
      { name: 'composition' },
      { name: 'cameraAngle' },
      { name: 'cameraDistance' },
      { name: 'cameraLens' },
      { name: 'depthOfField' },
    ],
  },
  {
    category: 'Lighting',
    tier: '2-3',
    slots: [
      { name: 'lightingStyle' },
      { name: 'lightingDirection' },
      { name: 'lightingIntensity' },
      { name: 'colorTemperature' },
      { name: 'timeOfDay' },
    ],
  },
  {
    category: 'Color',
    tier: '2-3',
    slots: [
      { name: 'colorPalette' },
      { name: 'dominantColor' },
      { name: 'accentColor' },
      { name: 'saturation' },
      { name: 'contrast' },
    ],
  },
  {
    category: 'Quality',
    tier: '3',
    slots: [
      { name: 'resolution', defaultValue: '1024' },
      { name: 'aspectRatio', defaultValue: '16:9' },
      { name: 'detailLevel', defaultValue: 'high' },
      { name: 'renderQuality', defaultValue: 'production' },
    ],
  },
  {
    category: 'Advanced',
    tier: '3',
    slots: [
      { name: 'referenceImage' },
      { name: 'loraId' },
      { name: 'controlNet' },
      {
        name: 'negativePrompt',
        defaultValue: 'blurry, lowres, deformed, text, watermark, jpeg artifacts',
      },
      { name: 'seed', defaultValue: 'random' },
      { name: 'cfgScale', defaultValue: '7.5' },
      { name: 'sampler', defaultValue: 'DPM++ 2M Karras' },
      { name: 'steps', defaultValue: '30' },
    ],
  },
]);

// 표준 §2 영상 특화 19 슬롯 — 4 카테고리 (이미지 32 위에 추가 = 51).
const VIDEO_EXTRA_SLOT_CATALOG: readonly SlotCatalogCategory[] = Object.freeze([
  {
    category: 'Motion',
    tier: '1-2',
    slots: [
      { name: 'duration', defaultValue: '5' },
      { name: 'cameraMotion' },
      { name: 'cameraSpeed', defaultValue: 'medium' },
      { name: 'subjectMotion' },
      { name: 'subjectSpeed', defaultValue: 'normal' },
    ],
  },
  {
    category: 'Sequence',
    tier: '2',
    slots: [
      { name: 'multiShot' },
      { name: 'shotTransitions' },
      { name: 'pacing', defaultValue: 'medium' },
      { name: 'keyframes' },
    ],
  },
  {
    category: 'Audio',
    tier: '2-3',
    slots: [
      { name: 'bgmMood' },
      { name: 'bgmGenre' },
      { name: 'sfx' },
      { name: 'dialogue' },
      { name: 'ambientSound' },
      { name: 'soundMix', defaultValue: 'balanced' },
    ],
  },
  {
    category: 'Coherence',
    tier: '3',
    slots: [
      { name: 'subjectConsistency', defaultValue: 'on' },
      { name: 'temporalCoherence', defaultValue: 'on' },
      { name: 'styleConsistency', defaultValue: 'on' },
      { name: 'emotionArc' },
    ],
  },
]);

// 표준 §3 음성 24 슬롯 — 6 카테고리.
const VOICE_SLOT_CATALOG: readonly SlotCatalogCategory[] = Object.freeze([
  {
    category: 'Speaker',
    tier: '1',
    slots: [
      { name: 'voiceId' },
      { name: 'voiceProfile' },
      { name: 'voiceCharacter' },
      { name: 'accent' },
    ],
  },
  {
    category: 'Text',
    tier: '1',
    slots: [{ name: 'text' }, { name: 'language' }, { name: 'ssmlTags' }],
  },
  {
    category: 'Emotion',
    tier: '1-2',
    slots: [{ name: 'tone' }, { name: 'emotionIntensity' }, { name: 'urgency' }],
  },
  {
    category: 'Prosody',
    tier: '2-3',
    slots: [
      { name: 'speed', defaultValue: '1.0x' },
      { name: 'pitch', defaultValue: 'medium' },
      { name: 'pitchVariation', defaultValue: 'dynamic' },
      { name: 'emphasis' },
      { name: 'rhythm', defaultValue: 'steady' },
    ],
  },
  {
    category: 'Nonverbal',
    tier: '3',
    slots: [
      { name: 'laughType' },
      { name: 'sigh' },
      { name: 'gasp' },
      { name: 'breath', defaultValue: 'normal' },
      { name: 'silence' },
    ],
  },
  {
    category: 'Context',
    tier: '3',
    slots: [
      { name: 'backgroundSound', defaultValue: 'silent' },
      { name: 'audioEnvironment', defaultValue: 'room' },
      { name: 'speakerDistance', defaultValue: 'close mic' },
    ],
  },
]);

// §6.1 이미지 프롬프트 골격 (사양 템플릿 그대로).
const IMAGE_PROMPT_SKELETON = [
  '[subject] [action] in [setting], [mood] mood,',
  '[style] style, [composition] composition, [cameraAngle] camera angle,',
  '[cameraLens] lens, [depthOfField] depth of field,',
  '[lightingStyle] lighting from [lightingDirection], [colorTemperature],',
  '[colorPalette] palette with [dominantColor] dominant and [accentColor] accent,',
  '[saturation] saturation, [contrast] contrast',
  '--ar [aspectRatio] --q [detailLevel] --s [renderQuality]',
  '',
  'Negative: blurry, lowres, deformed, text, watermark, jpeg artifacts',
].join('\n');

// §6.2 영상 프롬프트 골격 (Veo 네이티브 오디오 — 사양 템플릿 그대로).
const VIDEO_PROMPT_SKELETON = [
  '{scene: [subject] [action] in [setting]}',
  '{mood: [mood], pacing: [pacing], duration: [duration]s, aspectRatio: [aspectRatio]}',
  '{visual: [style], [composition], [colorPalette], [dominantColor]/[accentColor], [contrast]}',
  '{camera: [cameraMotion] [cameraSpeed], [cameraLens], [cameraAngle], [depthOfField]}',
  '{shots: [multiShot] cuts with [shotTransitions], keyframes: [keyframes]}',
  '{lighting: [lightingStyle] from [lightingDirection], [colorTemperature], [timeOfDay]}',
  '{audio: BGM [bgmMood] [bgmGenre], SFX [sfx], ambient [ambientSound],',
  '        dialogue: voice [voiceId] saying "[dialogue]" with [tone] at [emotionIntensity]/100,',
  '        mix: [soundMix]}',
  '{coherence: subject [subjectConsistency], temporal [temporalCoherence], style [styleConsistency], emotion arc: [emotionArc]}',
].join('\n');

// §6.3 음성 프롬프트 골격 (사양 템플릿 그대로).
const VOICE_PROMPT_SKELETON = [
  'voice_id: [voiceId]',
  'profile: [voiceProfile], character: [voiceCharacter], accent: [accent]',
  'text: "[text]"',
  'language: [language]',
  'emotion: [tone] at [emotionIntensity]/100, urgency: [urgency]',
  'prosody: speed [speed], pitch [pitch] [pitchVariation], rhythm [rhythm], emphasis: [emphasis]',
  'nonverbal: breath [breath], pauses: [silence], laugh: [laughType], sigh: [sigh], gasp: [gasp]',
  'context: env [audioEnvironment], distance [speakerDistance], bg [backgroundSound]',
  'ssml: [ssmlTags]',
].join('\n');

// ============================================================
// PART 3 — 내부 유틸 (입력 정규화 · scene 값 채움 맵)
// ============================================================

/** 비어 있지 않은 trim 문자열만 통과. 그 외 undefined. */
function asTrimmedString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/** 문자열 배열 정규화 — 비배열/비문자/공백 항목 제거. */
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    const s = asTrimmedString(item);
    if (s !== undefined) out.push(s);
  }
  return out;
}

/** 유효 회차 번호(0 이상 유한수)만 통과. */
function asEpisodeNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;
}

/** null/비객체 입력 방어 후 안전 scene 객체 반환. */
function normalizeScene(scene: PrevisualSceneInput | null | undefined): PrevisualSceneInput {
  return scene != null && typeof scene === 'object' ? scene : {};
}

type SceneFillMap = Record<string, (s: PrevisualSceneInput) => string | undefined>;

// scene → 슬롯 직결 매핑 (사양 §7 본 시스템 슬롯 매핑 중 기계 대응 가능분만).
// Tier 2 자동 추론(mood→lighting 등)은 LLM 영역 — 본 모듈은 채우지 않는다.
const IMAGE_FILL: SceneFillMap = {
  subject: (s) => asTrimmedString(s.subject),
  action: (s) => asTrimmedString(s.action),
  setting: (s) => asTrimmedString(s.setting),
  mood: (s) => asTrimmedString(s.mood),
};

const VIDEO_FILL: SceneFillMap = {
  ...IMAGE_FILL,
  dialogue: (s) => asTrimmedString(s.dialogue),
};

const VOICE_FILL: SceneFillMap = {
  text: (s) => asTrimmedString(s.dialogue),
};

/** [slotName] 플레이스홀더를 값으로 치환 (regex escape 회피 — split/join). */
function substituteSkeleton(skeleton: string, filled: ReadonlyMap<string, string>): string {
  let out = skeleton;
  for (const [name, value] of filled) {
    out = out.split(`[${name}]`).join(value);
  }
  return out;
}

// ============================================================
// PART 4 — 프리비주얼 4종 빌더 (프로토콜 §6)
// ============================================================

function buildWorldBible(scene: PrevisualSceneInput): WorldVisualBible {
  return {
    kind: 'world',
    palette: asStringArray(scene.palette),
    primarySymbols: asStringArray(scene.primarySymbols),
    forbidden: asStringArray(scene.forbidden),
  };
}

function buildCharacterBibles(
  scene: PrevisualSceneInput,
  currentEpisode: number | undefined,
): CharacterVisualBible[] {
  const inputs = Array.isArray(scene.characters) ? scene.characters : [];
  const out: CharacterVisualBible[] = [];
  for (const raw of inputs) {
    if (raw == null || typeof raw !== 'object') continue;
    // 등급: 명시 시 E3 classifySpoiler / 미지정 시 Public.
    // (Visual Bible 외형 필드 = _spoiler_classification.md §6 Public 영역.
    //  비밀 슬롯을 섞어 보낼 때만 작성자가 classification을 명시한다.)
    const explicit = asTrimmedString(raw.classification);
    const level: SpoilerLevel =
      explicit !== undefined ? classifySpoiler({ classification: explicit }) : 'Public';
    // 캐릭 일러 게이트 = E3 MediaTarget 'cover' (§3.4 표지·캐릭 일러).
    const decision = canExposeInMedia(level, 'cover', {
      currentEpisode: currentEpisode ?? null,
      publicAtEpisode: asEpisodeNumber(raw.publicAtEpisode) ?? null,
    });
    out.push({
      kind: 'character',
      name: asTrimmedString(raw.name) ?? null,
      apparentAge: asTrimmedString(raw.apparentAge) ?? null,
      silhouette: asTrimmedString(raw.silhouette) ?? null,
      eyes: asTrimmedString(raw.eyes) ?? null,
      costume: asTrimmedString(raw.costume) ?? null,
      anchorProp: asTrimmedString(raw.anchorProp) ?? null,
      color: asTrimmedString(raw.color) ?? null,
      negative: asTrimmedString(raw.negative) ?? null,
      exposure: {
        level: decision.level,
        blocked: !decision.allowed,
        judgment: decision.judgment,
        reason: decision.reason,
      },
    });
  }
  return out;
}

const LOCATION_RECOMMENDED_MIN = 3;
const LOCATION_RECOMMENDED_MAX = 5;

function buildLocationBible(scene: PrevisualSceneInput): LocationVisualBible {
  const locations = asStringArray(scene.locations);
  return {
    kind: 'location',
    locations,
    recommendedRange: { min: LOCATION_RECOMMENDED_MIN, max: LOCATION_RECOMMENDED_MAX },
    withinRecommended:
      locations.length >= LOCATION_RECOMMENDED_MIN && locations.length <= LOCATION_RECOMMENDED_MAX,
  };
}

// 프롬프트 코어 골격 = §6.1 첫 줄 (미채움 슬롯은 플레이스홀더 유지).
const PROMPT_CORE_SKELETON = '[subject] [action] in [setting], [mood] mood';
const AUTO_NEGATIVE_PROMPT = 'blurry, lowres, deformed, text, watermark, jpeg artifacts';

function buildSceneToPrompt(scene: PrevisualSceneInput): SceneToPromptBible {
  const filled = new Map<string, string>();
  for (const name of ['subject', 'action', 'setting', 'mood'] as const) {
    const v = asTrimmedString(scene[name]);
    if (v !== undefined) filled.set(name, v);
  }
  return {
    kind: 'sceneToPrompt',
    shotId: asTrimmedString(scene.shotId) ?? null,
    panelType: asTrimmedString(scene.panelType) ?? null,
    visualFocus: asTrimmedString(scene.visualFocus) ?? null,
    dialogue: asTrimmedString(scene.dialogue) ?? null,
    emotion: asTrimmedString(scene.emotion) ?? null,
    promptCore: substituteSkeleton(PROMPT_CORE_SKELETON, filled),
    negative: AUTO_NEGATIVE_PROMPT,
    infoHierarchy: INFO_HIERARCHY,
  };
}

// ============================================================
// PART 5 — 슬롯 엔진 (매체별 plan + 프롬프트 골격)
// ============================================================

function buildMediumPlan(
  medium: SlotMedium,
  catalog: readonly SlotCatalogCategory[],
  fillMap: SceneFillMap,
  skeleton: string,
  scene: PrevisualSceneInput,
): MediumSlotPlan {
  const categories: SlotCategoryPlan[] = [];
  const filledForSkeleton = new Map<string, string>();
  let total = 0;

  for (const cat of catalog) {
    const slots: SlotSpec[] = [];
    for (const def of cat.slots) {
      total += 1;
      const sceneValue = fillMap[def.name]?.(scene);
      let value: string | null;
      let source: SlotValueSource;
      if (sceneValue !== undefined) {
        value = sceneValue;
        source = 'scene';
      } else if (def.defaultValue !== undefined) {
        value = def.defaultValue;
        source = 'default';
      } else {
        value = null;
        source = 'unfilled';
      }
      if (value !== null) filledForSkeleton.set(def.name, value);
      slots.push({ name: def.name, tier: cat.tier, value, source });
    }
    categories.push({ category: cat.category, tier: cat.tier, slots });
  }

  return {
    medium,
    totalSlots: total,
    categories,
    promptSkeleton: substituteSkeleton(skeleton, filledForSkeleton),
  };
}

// ============================================================
// PART 6 — 스포일러 게이트 (E3 spoiler-guard 연동, §1·§3·§8)
// ============================================================

function evaluateMediumGate(
  medium: MediaTarget,
  facts: readonly PrevisualFactRef[],
  currentEpisode: number | undefined,
): MediumSpoilerGate {
  const flags: FactExposureFlag[] = [];
  facts.forEach((fact, index) => {
    // E3 classifySpoiler에 entry 그대로 통과 (classification·tier·themeLink·
    // conflictsWith·contradictsSurfaceRule — 미상은 E3가 Confidential 보수 디폴트).
    const level = classifySpoiler(fact);
    const decision = canExposeInMedia(level, medium, {
      currentEpisode: currentEpisode ?? null,
      publicAtEpisode: asEpisodeNumber(fact.publicAtEpisode) ?? null,
    });
    flags.push({
      id: asTrimmedString(fact.id) ?? `fact_${index}`,
      label: asTrimmedString(fact.label) ?? null,
      level: decision.level,
      blocked: !decision.allowed,
      judgment: decision.judgment,
      reason: decision.reason,
    });
  });

  let judgment: ExposureJudgment = 'PASS';
  if (flags.some((f) => f.judgment === 'BLOCKED')) judgment = 'BLOCKED';
  else if (flags.some((f) => f.judgment === 'WARNING')) judgment = 'WARNING';

  return { medium, judgment, flags };
}

// ============================================================
// PART 7 — buildPrevisualSlots (메인 — 순수·생성 호출 0)
// ============================================================

/**
 * 씬시트/작품 config → 프리비주얼 4종 + 매체 3종 슬롯 plan + 스포일러 게이트.
 *
 * - 프리비주얼 4종: World·Character·Location·Scene-to-Prompt (프로토콜 §6).
 * - 슬롯 엔진: 이미지 32 / 영상 51 / 음성 23 — 사양 분류·Tier·기본값 그대로
 *   (음성 "24개" 헤더 vs 열거 23 불일치는 VOICE_SLOT_TOTAL 주석 참조).
 * - E3 spoiler-guard 연동: Confidential/Restricted(미도달) fact·캐릭 비밀은
 *   blocked=true 플래그 (실제 마스킹/생성은 본 모듈 범위 밖).
 * - 실제 이미지·영상·음성 생성 호출 없음 — 명세와 프롬프트 골격만 산출.
 *
 * @param scene 씬시트 추출 입력 (null/undefined/{} 안전 — 빈 plan 산출)
 */
export function buildPrevisualSlots(
  scene?: PrevisualSceneInput | null,
): PrevisualSlotsResult {
  const s = normalizeScene(scene);
  const currentEpisode = asEpisodeNumber(s.episode);
  const facts = Array.isArray(s.facts)
    ? s.facts.filter((f): f is PrevisualFactRef => f != null && typeof f === 'object')
    : [];

  return {
    previsual: {
      world: buildWorldBible(s),
      character: buildCharacterBibles(s, currentEpisode),
      location: buildLocationBible(s),
      sceneToPrompt: buildSceneToPrompt(s),
    },
    slotEngine: {
      image: buildMediumPlan('image', IMAGE_SLOT_CATALOG, IMAGE_FILL, IMAGE_PROMPT_SKELETON, s),
      video: buildMediumPlan(
        'video',
        [...IMAGE_SLOT_CATALOG, ...VIDEO_EXTRA_SLOT_CATALOG],
        VIDEO_FILL,
        VIDEO_PROMPT_SKELETON,
        s,
      ),
      voice: buildMediumPlan('voice', VOICE_SLOT_CATALOG, VOICE_FILL, VOICE_PROMPT_SKELETON, s),
    },
    spoilerGate: {
      image: evaluateMediumGate('image', facts, currentEpisode),
      video: evaluateMediumGate('video', facts, currentEpisode),
      audio: evaluateMediumGate('audio', facts, currentEpisode),
    },
    confidence: PREVISUAL_AUTO_CONFIDENCE,
  };
}
