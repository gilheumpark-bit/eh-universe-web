// ============================================================
// Scene Audio — 환경음 + 효과음 시스템 (Web Audio API)
// ============================================================
// Step 2 라디오 드라마의 청각 레이어.
// 분위기 키워드에서 환경음 자동 매칭, 효과음 트리거.

// ============================================================
// PART 1 — Types
// ============================================================

export type AmbientType =
  | 'rain' | 'heavy-rain' | 'thunder'
  | 'wind' | 'blizzard'
  | 'night-crickets' | 'forest' | 'ocean'
  | 'city' | 'crowd' | 'cafe'
  | 'silence' | 'tension-drone'
  | 'fire' | 'battle';

export type SFXType =
  | 'footstep' | 'door-open' | 'door-close'
  | 'glass-break' | 'sword-clash' | 'gunshot'
  | 'heartbeat' | 'gasp' | 'whisper-wind'
  | 'paper-rustle' | 'clock-tick' | 'phone-ring'
  | 'explosion' | 'splash' | 'thud';

export interface AudioState {
  ambient: AmbientType;
  volume: number;       // 0-1
  sfxQueue: SFXType[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=AmbientType,SFXType,AudioState

// ============================================================
// PART 2 — 분위기→환경음 자동 매핑
// ============================================================

const MOOD_TO_AMBIENT: Record<string, AmbientType> = {
  'dark': 'tension-drone',
  'bright': 'forest',
  'rainy': 'rain',
  'snowy': 'blizzard',
  'windy': 'wind',
  'misty': 'forest',
  'eerie': 'tension-drone',
  'warm': 'cafe',
  'cold': 'wind',
  'peaceful': 'night-crickets',
  'noisy': 'crowd',
};

const TIME_TO_AMBIENT: Record<string, AmbientType> = {
  '밤': 'night-crickets',
  'night': 'night-crickets',
  '새벽': 'silence',
  'dawn': 'silence',
  '아침': 'forest',
  'morning': 'forest',
  '저녁': 'night-crickets',
  'evening': 'night-crickets',
};

/** 텍스트에서 효과음 감지 */
const SFX_PATTERNS: { pattern: RegExp; sfx: SFXType }[] = [
  { pattern: /문을?\s*열|열었다|opened\s+the\s+door/i, sfx: 'door-open' },
  { pattern: /문을?\s*닫|닫았다|closed\s+the\s+door/i, sfx: 'door-close' },
  { pattern: /걸|발자국|걸었다|발소리|footstep|walked/i, sfx: 'footstep' },
  { pattern: /심장|두근|heartbeat|심박/i, sfx: 'heartbeat' },
  { pattern: /유리|깨[져졌]|glass|shatter/i, sfx: 'glass-break' },
  { pattern: /칼|검|베[었]|sword|blade/i, sfx: 'sword-clash' },
  { pattern: /총|발사|bang|gunshot|shot/i, sfx: 'gunshot' },
  { pattern: /폭발|터[져졌]|explo/i, sfx: 'explosion' },
  { pattern: /숨|헐떡|gasp|breath/i, sfx: 'gasp' },
  { pattern: /종이|편지|넘기|paper|letter/i, sfx: 'paper-rustle' },
  { pattern: /시계|째깍|clock|tick/i, sfx: 'clock-tick' },
  { pattern: /전화|벨|phone|ring/i, sfx: 'phone-ring' },
  { pattern: /물|첨벙|splash|빠[져졌]/i, sfx: 'splash' },
  { pattern: /쓰러|넘어|쿵|thud|fell|collapse/i, sfx: 'thud' },
];

export function detectAmbient(mood?: string, timeOfDay?: string): AmbientType {
  if (mood && MOOD_TO_AMBIENT[mood]) return MOOD_TO_AMBIENT[mood];
  if (timeOfDay && TIME_TO_AMBIENT[timeOfDay]) return TIME_TO_AMBIENT[timeOfDay];
  return 'silence';
}

export function detectSFX(text: string): SFXType[] {
  const found: SFXType[] = [];
  for (const { pattern, sfx } of SFX_PATTERNS) {
    if (pattern.test(text) && !found.includes(sfx)) found.push(sfx);
  }
  return found;
}

// IDENTITY_SEAL: PART-2 | role=auto-mapping | inputs=mood,text | outputs=AmbientType,SFXType[]

// ============================================================
// PART 3 — Web Audio 신디사이저 (외부 파일 불필요)
// ============================================================
// 실제 오디오 파일 대신 Web Audio API로 합성.
// 프로덕션에서는 실제 오디오 파일로 교체 가능.

export interface AudioEngine {
  playAmbient: (type: AmbientType, volume?: number) => void;
  stopAmbient: () => void;
  playSFX: (type: SFXType) => void;
  setMasterVolume: (v: number) => void;
  dispose: () => void;
}

export function createAudioEngine(): AudioEngine | null {
  if (typeof window === 'undefined') return null;

  let ctx: AudioContext | null = null;
  let ambientSource: OscillatorNode | null = null;
  let ambientGain: GainNode | null = null;
  let masterGain: GainNode | null = null;
  let noiseNode: AudioBufferSourceNode | null = null;

  function ensureContext(): AudioContext {
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function createNoise(ac: AudioContext, duration: number): AudioBuffer {
    const bufferSize = ac.sampleRate * duration;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    return buffer;
  }

  function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.1) {
    const ac = ensureContext();
    if (!masterGain) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ac.currentTime + duration);
  }

  return {
    playAmbient(type: AmbientType, volume: number = 0.15) {
      this.stopAmbient();
      const ac = ensureContext();
      if (!masterGain) return;

      ambientGain = ac.createGain();
      ambientGain.gain.value = volume;
      ambientGain.connect(masterGain);

      if (type === 'rain' || type === 'heavy-rain') {
        // 빗소리: 필터링된 화이트 노이즈
        const noiseBuffer = createNoise(ac, 4);
        noiseNode = ac.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = type === 'heavy-rain' ? 2000 : 4000;
        noiseNode.connect(filter);
        filter.connect(ambientGain);
        noiseNode.start();
      } else if (type === 'wind' || type === 'blizzard') {
        // 바람: 저주파 노이즈 + LFO
        const noiseBuffer = createNoise(ac, 4);
        noiseNode = ac.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;
        const filter = ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 300;
        filter.Q.value = 0.5;
        noiseNode.connect(filter);
        filter.connect(ambientGain);
        noiseNode.start();
      } else if (type === 'tension-drone') {
        // 긴장 드론: 저주파 오실레이터
        ambientSource = ac.createOscillator();
        ambientSource.type = 'sawtooth';
        ambientSource.frequency.value = 55;
        const filter = ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        ambientSource.connect(filter);
        filter.connect(ambientGain);
        ambientSource.start();
      } else if (type === 'night-crickets') {
        // 귀뚜라미: 고주파 펄스
        ambientSource = ac.createOscillator();
        ambientSource.type = 'sine';
        ambientSource.frequency.value = 4500;
        const pulseGain = ac.createGain();
        const lfo = ac.createOscillator();
        lfo.frequency.value = 6;
        const lfoGain = ac.createGain();
        lfoGain.gain.value = 0.5;
        lfo.connect(lfoGain);
        lfoGain.connect(pulseGain.gain);
        ambientSource.connect(pulseGain);
        pulseGain.connect(ambientGain);
        ambientSource.start();
        lfo.start();
      } else if (type === 'fire') {
        const noiseBuffer = createNoise(ac, 4);
        noiseNode = ac.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;
        const filter = ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 2;
        noiseNode.connect(filter);
        filter.connect(ambientGain);
        noiseNode.start();
      }
      // silence, forest, ocean, city, crowd, cafe, battle → 추후 실제 오디오 파일로 교체
    },

    stopAmbient() {
      try { ambientSource?.stop(); } catch { /* already stopped */ }
      try { noiseNode?.stop(); } catch { /* already stopped */ }
      ambientSource = null;
      noiseNode = null;
      ambientGain?.disconnect();
      ambientGain = null;
    },

    playSFX(type: SFXType) {
      switch (type) {
        case 'footstep': playTone(100, 0.1, 'square', 0.05); break;
        case 'door-open': playTone(200, 0.3, 'triangle', 0.08); setTimeout(() => playTone(150, 0.2, 'triangle', 0.05), 100); break;
        case 'door-close': playTone(80, 0.2, 'square', 0.1); break;
        case 'heartbeat': playTone(60, 0.15, 'sine', 0.15); setTimeout(() => playTone(55, 0.12, 'sine', 0.12), 200); break;
        case 'glass-break': playTone(3000, 0.05, 'sawtooth', 0.08); playTone(5000, 0.03, 'square', 0.06); break;
        case 'sword-clash': playTone(800, 0.08, 'sawtooth', 0.1); playTone(2000, 0.05, 'square', 0.08); break;
        case 'gunshot': playTone(150, 0.05, 'square', 0.2); playTone(2000, 0.02, 'sawtooth', 0.15); break;
        case 'explosion': playTone(40, 0.5, 'sawtooth', 0.2); playTone(80, 0.3, 'square', 0.15); break;
        case 'gasp': playTone(400, 0.15, 'sine', 0.06); break;
        case 'paper-rustle': playTone(6000, 0.08, 'sawtooth', 0.02); break;
        case 'clock-tick': playTone(1200, 0.03, 'square', 0.04); break;
        case 'phone-ring': playTone(1400, 0.15, 'sine', 0.1); setTimeout(() => playTone(1700, 0.15, 'sine', 0.1), 200); break;
        case 'splash': playTone(200, 0.2, 'triangle', 0.1); playTone(3000, 0.1, 'sawtooth', 0.04); break;
        case 'thud': playTone(50, 0.15, 'square', 0.12); break;
        case 'whisper-wind': playTone(300, 0.4, 'sine', 0.03); break;
      }
    },

    setMasterVolume(v: number) {
      if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
    },

    dispose() {
      this.stopAmbient();
      try { ctx?.close(); } catch { /* already closed */ }
      ctx = null;
    },
  };
}

// IDENTITY_SEAL: PART-3 | role=web-audio-synth | inputs=AmbientType,SFXType | outputs=AudioEngine

// ============================================================
// PART 4 — 캐릭터 립아트 생성 프롬프트
// ============================================================

import type { Character } from '@/lib/studio-types';
import type { Emotion } from '@/engine/scene-parser';

const EMOTION_LABELS: Record<keyof Emotion, string> = {
  joy: 'smiling happily',
  sadness: 'looking sad with tears',
  anger: 'angry expression with furrowed brows',
  fear: 'scared expression with wide eyes',
  surprise: 'surprised with mouth open',
};

/** 캐릭터 외모 + 감정 → 이미지 생성 프롬프트 */
export function buildCharacterPrompt(
  character: Character,
  emotion: keyof Emotion | 'neutral' = 'neutral',
): string {
  const parts: string[] = [
    'anime style character portrait',
    'visual novel tachi-e (standing sprite)',
    'transparent background',
    'full body from knees up',
  ];

  if (character.appearance) parts.push(character.appearance);
  if (character.traits) parts.push(`personality: ${character.traits}`);

  if (emotion !== 'neutral' && EMOTION_LABELS[emotion]) {
    parts.push(EMOTION_LABELS[emotion]);
  } else {
    parts.push('neutral calm expression');
  }

  parts.push('high quality', 'detailed anime illustration', 'clean linework');
  return parts.join(', ');
}

/** 감정 벡터에서 지배적 감정 추출 */
export function getDominantEmotion(emotion?: Emotion): keyof Emotion | 'neutral' {
  if (!emotion) return 'neutral';
  const entries = Object.entries(emotion) as [keyof Emotion, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (sorted[0] && sorted[0][1] > 0.25) return sorted[0][0];
  return 'neutral';
}

// IDENTITY_SEAL: PART-4 | role=character-prompt | inputs=Character,Emotion | outputs=prompt-string
