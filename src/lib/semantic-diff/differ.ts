// ============================================================
// differ.ts — 두 텍스트 → SemanticDiffResult.
//
// 휴리스틱 (Phase 1):
//   - tone:    격식/캐주얼 keyword 빈도 비율
//   - tension: 감탄부호·강한 동사 빈도 차이
//   - emotion: 5종 emotion keyword (슬픔/기쁨/분노/공포/평온) 차이
//   - character: 캐릭터 이름 등장 빈도 차이
//   - foreshadow: [떡밥-{id}] 마커 차이
//
// LLM 보조는 Phase 2.
// ============================================================

import type { SemanticAxis, SemanticAxisDiff, SemanticDiffResult } from './types';

const TONE_FORMAL = ['습니다', '하셨', '되었습니다', '하시'];
const TONE_CASUAL = ['ㅋㅋ', 'ㅎㅎ', '야', '!', '...', '~'];
const STRONG_VERBS = ['외쳤', '죽었', '폭발', '비명', '쾅', '쿵'];
const EMOTION_KW: Array<[string, string[]]> = [
  ['슬픔', ['슬픔', '슬프', '눈물', '울었']],
  ['기쁨', ['기쁨', '기뻤', '웃었', '환호']],
  ['분노', ['분노', '화났', '격노']],
  ['공포', ['공포', '두려움', '겁이']],
  ['평온', ['평온', '차분', '담담']],
];

function countAll(text: string, words: string[]): number {
  let c = 0;
  for (const w of words) {
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    c += (text.match(re) ?? []).length;
  }
  return c;
}

function ratio(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(a, b);
}

// ============================================================
// 5축 differ
// ============================================================

function diffTone(before: string, after: string): SemanticAxisDiff {
  const f1 = countAll(before, TONE_FORMAL);
  const c1 = countAll(before, TONE_CASUAL);
  const f2 = countAll(after, TONE_FORMAL);
  const c2 = countAll(after, TONE_CASUAL);
  // 격식 비율
  const r1 = f1 / Math.max(1, f1 + c1);
  const r2 = f2 / Math.max(1, f2 + c2);
  const intensity = Math.round(Math.abs(r1 - r2) * 100);
  return {
    axis: 'tone',
    changeIntensity: intensity,
    summary: {
      ko: `격식도 ${(r1 * 100).toFixed(0)}% → ${(r2 * 100).toFixed(0)}%`,
      en: `Formality ${(r1 * 100).toFixed(0)}% → ${(r2 * 100).toFixed(0)}%`,
      ja: `フォーマル度 ${(r1 * 100).toFixed(0)}% → ${(r2 * 100).toFixed(0)}%`,
      zh: `正式度 ${(r1 * 100).toFixed(0)}% → ${(r2 * 100).toFixed(0)}%`,
    },
    before: Math.round(r1 * 100),
    after: Math.round(r2 * 100),
  };
}

function diffTension(before: string, after: string): SemanticAxisDiff {
  const exc1 = (before.match(/[!?]/g) ?? []).length + countAll(before, STRONG_VERBS);
  const exc2 = (after.match(/[!?]/g) ?? []).length + countAll(after, STRONG_VERBS);
  const intensity = Math.min(100, Math.round(ratio(exc1, exc2) * 100));
  return {
    axis: 'tension',
    changeIntensity: intensity,
    summary: {
      ko: `텐션 신호 ${exc1} → ${exc2}`,
      en: `Tension signals ${exc1} → ${exc2}`,
      ja: `テンション信号 ${exc1} → ${exc2}`,
      zh: `紧张度信号 ${exc1} → ${exc2}`,
    },
    before: exc1,
    after: exc2,
  };
}

function diffEmotion(before: string, after: string): SemanticAxisDiff {
  let totalDiff = 0;
  const beforeProfile: Record<string, number> = {};
  const afterProfile: Record<string, number> = {};
  for (const [name, kw] of EMOTION_KW) {
    const b = countAll(before, kw);
    const a = countAll(after, kw);
    beforeProfile[name] = b;
    afterProfile[name] = a;
    totalDiff += Math.abs(a - b);
  }
  const intensity = Math.min(100, totalDiff * 5);
  // 가장 큰 변화 emotion
  let primary = '';
  let primaryDelta = 0;
  for (const [name] of EMOTION_KW) {
    const d = Math.abs(afterProfile[name] - beforeProfile[name]);
    if (d > primaryDelta) {
      primaryDelta = d;
      primary = name;
    }
  }
  return {
    axis: 'emotion',
    changeIntensity: intensity,
    summary: {
      ko: primary ? `${primary} 감정 변화 ${primaryDelta}회` : '감정 변화 없음',
      en: primary ? `${primary} emotion delta ${primaryDelta}` : 'No emotion change',
    },
  };
}

function diffCharacter(before: string, after: string, names: string[]): SemanticAxisDiff {
  let totalDiff = 0;
  for (const n of names) {
    if (n.length < 2) continue;
    const re = new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const b = (before.match(re) ?? []).length;
    const a = (after.match(re) ?? []).length;
    totalDiff += Math.abs(a - b);
  }
  const intensity = Math.min(100, totalDiff * 3);
  return {
    axis: 'character',
    changeIntensity: intensity,
    summary: {
      ko: `캐릭터 등장 빈도 변화 ${totalDiff}회`,
      en: `Character appearance delta ${totalDiff}`,
    },
  };
}

function diffForeshadow(before: string, after: string): SemanticAxisDiff {
  const re = /\[(?:떡밥|복선|foreshadow|setup)-([a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30})\]/gi;
  const beforeIds = new Set<string>();
  const afterIds = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) beforeIds.add(m[1]);
  re.lastIndex = 0;
  while ((m = re.exec(after)) !== null) afterIds.add(m[1]);
  let added = 0;
  let removed = 0;
  for (const id of afterIds) if (!beforeIds.has(id)) added++;
  for (const id of beforeIds) if (!afterIds.has(id)) removed++;
  const total = added + removed;
  const intensity = Math.min(100, total * 20);
  return {
    axis: 'foreshadow',
    changeIntensity: intensity,
    summary: {
      ko: `떡밥 +${added} / -${removed}`,
      en: `Foreshadow +${added} / -${removed}`,
    },
    before: removed,
    after: added,
  };
}

// ============================================================
// Public API
// ============================================================

export interface DifferOptions {
  /** 캐릭터 이름 list (Symbol Index 활용 가능) */
  characterNames?: string[];
}

export function computeSemanticDiff(
  before: string,
  after: string,
  options: DifferOptions = {},
): SemanticDiffResult {
  const start = Date.now();
  const axes: SemanticAxisDiff[] = [
    diffTone(before, after),
    diffTension(before, after),
    diffEmotion(before, after),
    diffCharacter(before, after, options.characterNames ?? []),
    diffForeshadow(before, after),
  ];

  const overallChange = Math.round(axes.reduce((s, a) => s + a.changeIntensity, 0) / axes.length);
  let primaryAxis: SemanticAxis | undefined;
  let primaryIntensity = 0;
  for (const a of axes) {
    if (a.changeIntensity > primaryIntensity) {
      primaryIntensity = a.changeIntensity;
      primaryAxis = a.axis;
    }
  }

  return {
    axes,
    overallChange,
    primaryAxis,
    durationMs: Date.now() - start,
  };
}
