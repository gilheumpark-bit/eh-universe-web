// ============================================================
// Scene Parser Engine — 원고 → 장면 배열 변환
// ============================================================
// 소설 원고를 비주얼 노벨 장면으로 자동 파싱.
// 대사/서술/내면/배경을 분리하고 장면 경계를 감지한다.

import type { Character } from '@/lib/studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

/** 비트 유형: 원고를 구성하는 최소 단위 */
export type BeatType = 'dialogue' | 'narration' | 'action' | 'thought' | 'description';

/** 감정 벡터 */
export interface Emotion {
  joy: number;      // 0-1
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
}

/** 템포 */
export type Tempo = 'fast' | 'normal' | 'slow';

/** 카메라 */
export type CameraAngle = 'wide' | 'medium' | 'close' | 'pov';

/** 개별 비트 */
export interface SceneBeat {
  id: string;
  type: BeatType;
  text: string;
  speaker?: string;         // dialogue/thought일 때 캐릭터명
  emotion?: Emotion;
  tempo: Tempo;
  camera: CameraAngle;
  lineStart: number;        // 원문 라인 번호
  lineEnd: number;
}

/** 파싱된 장면 */
export interface ParsedScene {
  id: string;
  index: number;
  title: string;            // 자동 생성 (장소 또는 분위기)
  beats: SceneBeat[];
  location?: string;
  timeOfDay?: string;
  mood?: string;
  tension: number;          // 0-100
  backgroundPrompt?: string; // 이미지 생성용 프롬프트
}

/** 파싱 결과 */
export interface SceneParseResult {
  scenes: ParsedScene[];
  characters: string[];     // 감지된 캐릭터 목록
  totalBeats: number;
  totalDuration: number;    // 예상 재생 시간 (초)
  warnings: string[];
}

/** 장면 프로젝트 (저장용) */
export interface SceneProject {
  id: string;
  episodeId: number;
  episodeTitle: string;
  sourceText: string;
  result: SceneParseResult;
  voiceConfig: VoiceMapping[];
  backgroundAssets: BackgroundAsset[];
  shareSettings?: ShareConfig;
  createdAt: number;
  updatedAt: number;
}

/** 음성 매핑 */
export interface VoiceMapping {
  characterName: string;
  pitch: number;       // 0.5-2.0
  rate: number;        // 0.5-2.0
  volume: number;      // 0-1
  preset: VoicePreset;
}

export type VoicePreset = 'calm' | 'bright' | 'deep' | 'whisper' | 'shout' | 'narration';

/** 배경 에셋 */
export interface BackgroundAsset {
  sceneId: string;
  imageUrl?: string;
  gradient?: string;    // CSS 그라디언트 폴백
  particles?: ParticleType;
}

export type ParticleType = 'rain' | 'snow' | 'dust' | 'petals' | 'sparks' | 'none';

/** 공유 설정 */
export interface ShareConfig {
  enabled: boolean;
  token: string;
  expiresAt: number;
  password?: string;
  feedbackEnabled: boolean;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=SceneBeat,ParsedScene,SceneParseResult

// ============================================================
// PART 2 — 대사 감지 패턴
// ============================================================

/** 대사 감지: 큰따옴표, 일본식, 강조식 */
const DIALOGUE_PATTERNS: RegExp[] = [
  /^"([^"]+)"/, /^"([^"]+)"/,           // 영문 큰따옴표
  /^「([^」]+)」/, /^『([^』]+)』/,       // 일본식
  /^"([^"]+)"/,                          // 유니코드 큰따옴표 (한국 웹소설)
];

/** 화자 추론: 대사 직전 "이름:" 또는 "이름이 말했다" 패턴 */
const SPEAKER_BEFORE = /(?:^|\n)([가-힣a-zA-Z]{1,10})(?:이|가|은|는)?\s*(?:말했다|물었다|대답했다|외쳤다|속삭였다|중얼거렸다|소리쳤다)[\s.]*$/;
const SPEAKER_COLON = /^([가-힣a-zA-Z]{1,10})\s*[:：]\s*/;

/** 내면 독백 패턴 */
const THOUGHT_PATTERNS: RegExp[] = [
  /^'([^']+)'/, /^'([^']+)'/,           // 작은따옴표
  /^\(([^)]+)\)/,                        // 괄호
];

/** 배경/묘사 키워드 */
const DESCRIPTION_KEYWORDS = /^(?:.*?(?:하늘|바다|산|숲|건물|거리|방|복도|창문|문|빛|어둠|바람|비|눈|해|달|별|노을|안개|연기|냄새|소리|향기|공기|온도|계절|봄|여름|가을|겨울|아침|낮|밤|새벽|저녁|오후|dawn|dusk|night|morning|rain|snow|wind|sky|sea|forest|building|street|room))/i;

/** 행동 키워드 */
const ACTION_KEYWORDS = /(?:걸었다|뛰었다|멈추었다|돌아보았다|손을|고개를|일어섰다|앉았다|눈을|입을|주먹을|달려|잡았다|놓았다|열었다|닫았다|올려|내려|walked|ran|stopped|turned|grabbed|opened|closed|stood|sat)/;

// IDENTITY_SEAL: PART-2 | role=patterns | inputs=none | outputs=regex-patterns

// ============================================================
// PART 3 — 비트 분류기
// ============================================================

let _beatId = 0;
function nextBeatId(): string {
  return `beat_${Date.now()}_${_beatId++}`;
}

function classifyBeat(
  line: string,
  prevLine: string,
  characters: string[],
): { type: BeatType; speaker?: string; text: string } {
  const trimmed = line.trim();
  if (!trimmed) return { type: 'narration', text: '' };

  // 1) 화자:대사 패턴
  const colonMatch = trimmed.match(SPEAKER_COLON);
  if (colonMatch) {
    const speaker = colonMatch[1];
    const rest = trimmed.slice(colonMatch[0].length);
    return { type: 'dialogue', speaker, text: rest };
  }

  // 2) 대사 감지 (따옴표)
  for (const pattern of DIALOGUE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      // 화자 추론: 직전 줄에서 이름 찾기
      const speakerMatch = prevLine.match(SPEAKER_BEFORE);
      let speaker = speakerMatch?.[1];

      // 캐릭터 목록에서 매칭 시도
      if (!speaker) {
        for (const name of characters) {
          if (prevLine.includes(name) || trimmed.includes(name)) {
            speaker = name;
            break;
          }
        }
      }

      return { type: 'dialogue', speaker, text: match[1] || trimmed };
    }
  }

  // 3) 내면 독백
  for (const pattern of THOUGHT_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      // 독백 화자: 직전 줄에서 추론
      let speaker: string | undefined;
      for (const name of characters) {
        if (prevLine.includes(name)) { speaker = name; break; }
      }
      return { type: 'thought', speaker, text: match[1] || trimmed };
    }
  }

  // 4) 배경 묘사 (장소/시간/날씨/분위기)
  if (DESCRIPTION_KEYWORDS.test(trimmed) && !ACTION_KEYWORDS.test(trimmed)) {
    return { type: 'description', text: trimmed };
  }

  // 5) 행동 서술
  if (ACTION_KEYWORDS.test(trimmed)) {
    let speaker: string | undefined;
    for (const name of characters) {
      if (trimmed.includes(name)) { speaker = name; break; }
    }
    return { type: 'action', speaker, text: trimmed };
  }

  // 6) 기본: 서술
  return { type: 'narration', text: trimmed };
}

// IDENTITY_SEAL: PART-3 | role=beat-classifier | inputs=line,prevLine,characters | outputs=BeatType+speaker+text

// ============================================================
// PART 4 — 감정 추정
// ============================================================

const EMOTION_WORDS: Record<keyof Emotion, RegExp[]> = {
  joy: [/웃|미소|행복|기쁨|좋아|사랑|즐거|smile|laugh|happy|love|joy/gi],
  sadness: [/눈물|울|슬픔|외로|그리움|이별|아프|cry|tear|sad|lonely|miss/gi],
  anger: [/분노|화|짜증|욕|으르렁|주먹|anger|fury|rage|furious|yell/gi],
  fear: [/공포|두려|떨|무서|겁|소름|fear|scared|terrif|horror|dread/gi],
  surprise: [/놀라|깜짝|갑자기|어|헉|surprise|shock|sudden|gasp/gi],
};

function estimateEmotion(text: string): Emotion {
  const result: Emotion = { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0 };
  const len = Math.max(text.length, 1);

  for (const [key, patterns] of Object.entries(EMOTION_WORDS)) {
    let count = 0;
    for (const p of patterns) {
      p.lastIndex = 0;
      const matches = text.match(p);
      if (matches) count += matches.length;
    }
    (result as unknown as Record<string, number>)[key] = Math.min(1, count / (len / 200));
  }

  return result;
}

// IDENTITY_SEAL: PART-4 | role=emotion-estimation | inputs=text | outputs=Emotion

// ============================================================
// PART 5 — 템포/카메라 추정
// ============================================================

function estimateTempo(text: string): Tempo {
  const avgSentenceLen = text.length / Math.max(1, (text.match(/[.!?。]+/g) || []).length);
  if (avgSentenceLen < 15) return 'fast';
  if (avgSentenceLen > 40) return 'slow';
  return 'normal';
}

function estimateCamera(type: BeatType): CameraAngle {
  switch (type) {
    case 'description': return 'wide';
    case 'action': return 'medium';
    case 'dialogue': return 'medium';
    case 'thought': return 'pov';
    case 'narration': return 'wide';
  }
}

// IDENTITY_SEAL: PART-5 | role=tempo-camera | inputs=text,BeatType | outputs=Tempo,CameraAngle

// ============================================================
// PART 6 — 장면 경계 감지
// ============================================================

const SCENE_BREAK_MARKERS = /^(?:\*\*\*|---|\*\s\*\s\*|#|━+|───+)\s*$/;
const LOCATION_KEYWORDS = /(?:으?로\s*(?:돌아|향|갔|왔|이동)|에\s*(?:도착|들어섰|나왔)|에서\s|밖으로|안으로|(?:went|arrived|entered|left|returned)\s+(?:to|at|from))/i;
const TIME_KEYWORDS = /(?:시간이?\s*(?:지나|흘러)|후에?|뒤에?|다음\s*날|이튿날|아침|저녁|새벽|밤|later|next\s*(?:day|morning)|hours?\s*(?:later|passed))/i;

interface SceneBoundary {
  lineIndex: number;
  reason: 'marker' | 'location' | 'time' | 'tension_shift' | 'pov_shift';
}

function detectSceneBoundaries(lines: string[]): SceneBoundary[] {
  const boundaries: SceneBoundary[] = [{ lineIndex: 0, reason: 'marker' }]; // 첫 장면

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const prevLine = lines[i - 1]?.trim() ?? '';

    // 1) 명시적 구분선
    if (SCENE_BREAK_MARKERS.test(line)) {
      boundaries.push({ lineIndex: i + 1, reason: 'marker' });
      continue;
    }

    // 2) 빈 줄 + 장소 변경
    if (!prevLine && LOCATION_KEYWORDS.test(line)) {
      boundaries.push({ lineIndex: i, reason: 'location' });
      continue;
    }

    // 3) 시간 전환
    if (!prevLine && TIME_KEYWORDS.test(line)) {
      boundaries.push({ lineIndex: i, reason: 'time' });
      continue;
    }
  }

  return boundaries;
}

// IDENTITY_SEAL: PART-6 | role=scene-boundaries | inputs=lines[] | outputs=SceneBoundary[]

// ============================================================
// PART 7 — 장면 메타데이터 추출
// ============================================================

const _LOCATION_EXTRACT = /(?:에서|에|로|으로|안|밖|위|아래|앞|뒤|속|at|in|on|inside|outside|near)\s/;
const TIME_EXTRACT = /(?:아침|낮|오후|저녁|밤|새벽|해질녘|dawn|morning|noon|afternoon|evening|night|dusk|midnight)/i;
const MOOD_MAP: Record<string, string> = {
  '어둠': 'dark', '빛': 'bright', '비': 'rainy', '눈': 'snowy',
  '바람': 'windy', '안개': 'misty', '고요': 'quiet', '시끄': 'noisy',
  '따뜻': 'warm', '차가': 'cold', '무서': 'eerie', '평화': 'peaceful',
};

const PARTICLE_MAP: Record<string, ParticleType> = {
  '비': 'rain', '눈': 'snow', '먼지': 'dust', '벚꽃': 'petals',
  '불꽃': 'sparks', '꽃잎': 'petals', 'rain': 'rain', 'snow': 'snow',
};

function extractSceneMeta(beats: SceneBeat[]): {
  location?: string;
  timeOfDay?: string;
  mood?: string;
  particles: ParticleType;
  backgroundPrompt: string;
} {
  const descriptionText = beats
    .filter((b) => b.type === 'description' || b.type === 'narration')
    .map((b) => b.text)
    .join(' ')
    .slice(0, 500);

  // 장소 추출: 첫 번째 묘사 문장
  const firstDesc = beats.find((b) => b.type === 'description')?.text ?? '';
  const location = firstDesc.slice(0, 30).replace(/[.!?,。]+$/, '') || undefined;

  // 시간대
  const timeMatch = descriptionText.match(TIME_EXTRACT);
  const timeOfDay = timeMatch?.[0];

  // 분위기
  let mood: string | undefined;
  for (const [keyword, moodValue] of Object.entries(MOOD_MAP)) {
    if (descriptionText.includes(keyword)) { mood = moodValue; break; }
  }

  // 파티클
  let particles: ParticleType = 'none';
  for (const [keyword, particleType] of Object.entries(PARTICLE_MAP)) {
    if (descriptionText.includes(keyword)) { particles = particleType; break; }
  }

  // 배경 이미지 프롬프트
  const promptParts: string[] = ['anime style illustration, novel scene background'];
  if (location) promptParts.push(location);
  if (timeOfDay) promptParts.push(timeOfDay);
  if (mood) promptParts.push(`${mood} atmosphere`);
  const backgroundPrompt = promptParts.join(', ');

  return { location, timeOfDay, mood, particles, backgroundPrompt };
}

// IDENTITY_SEAL: PART-7 | role=scene-metadata | inputs=SceneBeat[] | outputs=location,time,mood,particles,prompt

// ============================================================
// PART 8 — 텐션 계산 (기존 엔진 경량 버전)
// ============================================================

const TENSION_WORDS = /(?:위험|급|갑자기|폭발|비명|긴장|전투|충돌|죽|피|칼|총|도망|쫓|danger|explosion|scream|fight|blood|death|chase|crash)/gi;

function calculateSceneTension(beats: SceneBeat[]): number {
  const text = beats.map((b) => b.text).join(' ');
  const sentenceCount = Math.max(1, (text.match(/[.!?。]+/g) || []).length);
  const tensionHits = (text.match(TENSION_WORDS) || []).length;
  const shortSentenceRatio = beats.filter((b) => b.text.length < 20).length / Math.max(1, beats.length);
  const dialogueRatio = beats.filter((b) => b.type === 'dialogue').length / Math.max(1, beats.length);

  const score =
    (tensionHits / sentenceCount) * 150 +
    shortSentenceRatio * 30 +
    dialogueRatio * 20;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// IDENTITY_SEAL: PART-8 | role=tension | inputs=SceneBeat[] | outputs=number(0-100)

// ============================================================
// PART 9 — 재생 시간 추정
// ============================================================

/** 비트 하나의 재생 시간 (초) */
function estimateBeatDuration(beat: SceneBeat): number {
  const charCount = beat.text.length;
  switch (beat.type) {
    case 'dialogue':    return Math.max(2, charCount / 8);   // 대사: 초당 8자 (음성 속도)
    case 'thought':     return Math.max(2, charCount / 6);   // 독백: 약간 느림
    case 'description': return Math.max(3, charCount / 10);  // 묘사: 읽기 시간
    case 'action':      return Math.max(1.5, charCount / 12); // 행동: 빠르게
    case 'narration':   return Math.max(2, charCount / 10);  // 서술: 보통
    default:            return Math.max(2, charCount / 10);  // P1#9: 안전 폴백
  }
}

// IDENTITY_SEAL: PART-9 | role=duration | inputs=SceneBeat | outputs=seconds

// ============================================================
// PART 10 — 메인 파서
// ============================================================

export function parseManuscript(
  text: string,
  characters: Character[] = [],
): SceneParseResult {
  if (!text || text.trim().length < 10) {
    return { scenes: [], characters: [], totalBeats: 0, totalDuration: 0, warnings: ['원고가 너무 짧습니다.'] };
  }

  const warnings: string[] = [];
  const charNames = characters.map((c) => c.name);
  const lines = text.split('\n');

  // 1) 장면 경계 감지
  const boundaries = detectSceneBoundaries(lines);

  // 2) 경계 구간별로 비트 생성
  const scenes: ParsedScene[] = [];
  const detectedCharacters = new Set<string>();

  for (let si = 0; si < boundaries.length; si++) {
    const startLine = boundaries[si].lineIndex;
    const endLine = si + 1 < boundaries.length ? boundaries[si + 1].lineIndex : lines.length;
    const sceneLines = lines.slice(startLine, endLine);

    if (sceneLines.every((l) => !l.trim())) continue; // 빈 장면 스킵

    const beats: SceneBeat[] = [];
    let prevLine = '';

    for (let li = 0; li < sceneLines.length; li++) {
      const line = sceneLines[li];
      if (!line.trim()) { prevLine = line; continue; }
      if (SCENE_BREAK_MARKERS.test(line.trim())) { prevLine = line; continue; }

      const classified = classifyBeat(line, prevLine, charNames);
      if (!classified.text) { prevLine = line; continue; }

      if (classified.speaker) detectedCharacters.add(classified.speaker);

      beats.push({
        id: nextBeatId(),
        type: classified.type,
        text: classified.text,
        speaker: classified.speaker,
        emotion: estimateEmotion(classified.text),
        tempo: estimateTempo(classified.text),
        camera: estimateCamera(classified.type),
        lineStart: startLine + li + 1,
        lineEnd: startLine + li + 1,
      });

      prevLine = line;
    }

    if (beats.length === 0) continue;

    const meta = extractSceneMeta(beats);
    const tension = calculateSceneTension(beats);

    scenes.push({
      id: `scene_${si}`,
      index: si,
      title: meta.location || `장면 ${si + 1}`,
      beats,
      location: meta.location,
      timeOfDay: meta.timeOfDay,
      mood: meta.mood,
      tension,
      backgroundPrompt: meta.backgroundPrompt,
    });
  }

  // 3) 경고 생성
  if (scenes.length === 0) warnings.push('장면을 감지하지 못했습니다.');
  if (scenes.length === 1 && text.length > 3000) warnings.push('장면 구분이 없습니다. *** 또는 빈 줄을 추가해보세요.');

  for (const scene of scenes) {
    const dialogueCount = scene.beats.filter((b) => b.type === 'dialogue').length;
    const totalCount = scene.beats.length;
    if (totalCount > 8 && dialogueCount === 0) {
      warnings.push(`장면 ${scene.index + 1}: 대사 없이 서술만 ${totalCount}비트`);
    }
    const noSpeaker = scene.beats.filter((b) => b.type === 'dialogue' && !b.speaker).length;
    if (noSpeaker > 0) {
      warnings.push(`장면 ${scene.index + 1}: 화자 미확인 대사 ${noSpeaker}건`);
    }
  }

  const allBeats = scenes.flatMap((s) => s.beats);
  const totalDuration = Math.round(allBeats.reduce((s, b) => s + estimateBeatDuration(b), 0));

  return {
    scenes,
    characters: [...detectedCharacters],
    totalBeats: allBeats.length,
    totalDuration,
    warnings,
  };
}

// IDENTITY_SEAL: PART-10 | role=main-parser | inputs=text,Character[] | outputs=SceneParseResult

// ============================================================
// PART 11 — 음성 매핑
// ============================================================

const VOICE_PRESET_MAP: Record<string, VoicePreset> = {
  '활발': 'bright', '밝': 'bright', '쾌활': 'bright',
  '차분': 'calm', '조용': 'calm', '냉정': 'calm',
  '무거': 'deep', '중후': 'deep', '낮': 'deep',
  '속삭': 'whisper', '조심': 'whisper',
  '거친': 'shout', '강한': 'shout', '공격': 'shout',
};

const PRESET_PARAMS: Record<VoicePreset, { pitch: number; rate: number; volume: number }> = {
  calm:      { pitch: 1.0, rate: 0.85, volume: 0.85 },
  bright:    { pitch: 1.2, rate: 1.05, volume: 0.9 },
  deep:      { pitch: 0.7, rate: 0.9, volume: 0.95 },
  whisper:   { pitch: 1.1, rate: 0.75, volume: 0.5 },
  shout:     { pitch: 0.9, rate: 1.2, volume: 1.0 },
  narration: { pitch: 1.0, rate: 0.9, volume: 0.85 },
};

export function generateVoiceMappings(characters: Character[]): VoiceMapping[] {
  const mappings: VoiceMapping[] = [];

  for (const char of characters) {
    const traits = `${char.traits ?? ''} ${char.personality ?? ''} ${char.speechStyle ?? ''}`.toLowerCase();
    let preset: VoicePreset = 'calm';

    for (const [keyword, voicePreset] of Object.entries(VOICE_PRESET_MAP)) {
      if (traits.includes(keyword)) { preset = voicePreset; break; }
    }

    const params = PRESET_PARAMS[preset];
    mappings.push({
      characterName: char.name,
      ...params,
      preset,
    });
  }

  // 나레이션 기본
  mappings.push({
    characterName: '__narrator__',
    ...PRESET_PARAMS.narration,
    preset: 'narration',
  });

  return mappings;
}

/** 감정에 따른 음성 파라미터 조정 */
export function adjustVoiceForEmotion(
  base: VoiceMapping,
  emotion: Emotion,
): { pitch: number; rate: number; volume: number } {
  let { pitch, rate, volume } = base;

  // 감정 중 가장 강한 것 기준으로 조정
  const dominant = (Object.entries(emotion) as [keyof Emotion, number][])
    .sort((a, b) => b[1] - a[1])[0];

  if (dominant && dominant[1] > 0.3) {
    switch (dominant[0]) {
      case 'joy':      pitch += 0.1; rate += 0.05; break;
      case 'sadness':  pitch -= 0.05; rate -= 0.1; volume -= 0.1; break;
      case 'anger':    pitch -= 0.15; rate += 0.15; volume += 0.1; break;
      case 'fear':     pitch += 0.15; rate += 0.1; volume -= 0.15; break;
      case 'surprise': pitch += 0.2; rate += 0.05; break;
    }
  }

  return {
    pitch: Math.max(0.5, Math.min(2.0, pitch)),
    rate: Math.max(0.5, Math.min(2.0, rate)),
    volume: Math.max(0.1, Math.min(1.0, volume)),
  };
}

// IDENTITY_SEAL: PART-11 | role=voice-mapping | inputs=Character[],Emotion | outputs=VoiceMapping[],adjusted-params

// ============================================================
// PART 12 — TTS 엔진 (Web Speech API)
// ============================================================

export interface TTSController {
  speak: (text: string, voice: VoiceMapping, emotion?: Emotion) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: () => boolean;
}

export function createTTSController(): TTSController | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const synth = window.speechSynthesis;
  let _currentUtterance: SpeechSynthesisUtterance | null = null;

  return {
    speak(text: string, voice: VoiceMapping, emotion?: Emotion): Promise<void> {
      return new Promise((resolve, reject) => {
        synth.cancel(); // 이전 발화 중단

        const utterance = new SpeechSynthesisUtterance(text);
        const adjusted = emotion ? adjustVoiceForEmotion(voice, emotion) : voice;

        utterance.pitch = adjusted.pitch;
        utterance.rate = adjusted.rate;
        utterance.volume = adjusted.volume;
        utterance.lang = 'ko-KR';

        utterance.onend = () => { currentUtterance = null; resolve(); };
        utterance.onerror = (e) => {
          currentUtterance = null;
          if (e.error === 'canceled' || e.error === 'interrupted') resolve();
          else reject(e);
        };

        currentUtterance = utterance;
        synth.speak(utterance);
      });
    },

    stop() { synth.cancel(); currentUtterance = null; },
    pause() { synth.pause(); },
    resume() { synth.resume(); },
    isSpeaking() { return synth.speaking; },
  };
}

// IDENTITY_SEAL: PART-12 | role=tts-engine | inputs=text,VoiceMapping,Emotion | outputs=TTSController
