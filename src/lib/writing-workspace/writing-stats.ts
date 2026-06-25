// ============================================================
// writing-stats — 집필 통계/계측 (Muvel 위젯 흡수: 글자수·속도계·대사비율·반복어맵)
// 순수 함수. UI/DOM 의존 0. 절대금지 8파일 import 0.
// ============================================================

export interface WritingStats {
  chars: number;
  sentences: number;
  /** 대사(따옴표 내부) 비율 % */
  dialoguePct: number;
  /** 평균 문장 길이(자) */
  avgLen: number;
  /** 반복어 비율 % (상위 반복 단어가 전체 단어에서 차지하는 정도) */
  repetitionPct: number;
}

const SENTENCE_END = /[.!?。…]/g;
// “…” / "…" / '…' 내부를 대사로 간주 (유니코드 따옴표 명시)
const DIALOGUE = /[“"][^”"]*[”"]/g;
// 단어: 한글/영문/숫자 2자 이상 (조사·짧은 토큰 잡음 제거)
const WORD = /[가-힣A-Za-z0-9]{2,}/g;

/** 본문 → 통계. 빈 문자열 안전. */
export function analyzeText(t: string): WritingStats {
  const chars = t.length;
  if (chars === 0) return { chars: 0, sentences: 0, dialoguePct: 0, avgLen: 0, repetitionPct: 0 };
  const sentences = (t.match(SENTENCE_END) ?? []).length || (t.trim() ? 1 : 0);
  const dialogue = (t.match(DIALOGUE) ?? []).join('').length;
  const words = t.match(WORD) ?? [];
  const repeated = words.length - new Set(words).size; // 중복 등장 횟수
  return {
    chars,
    sentences,
    dialoguePct: Math.round((dialogue / chars) * 100),
    avgLen: sentences ? Math.round(chars / sentences) : 0,
    repetitionPct: words.length ? Math.round((repeated / words.length) * 100) : 0,
  };
}

/** 속도계 — 분당 글자수(자/분). elapsedMs<=0 이면 0. */
export function computeCPM(chars: number, elapsedMs: number): number {
  if (elapsedMs <= 0 || chars <= 0) return 0;
  return Math.round(chars / (elapsedMs / 60000));
}

/** 목표 글자수까지 예상 소요(분). 진행이 0이거나 이미 도달 시 null. */
export function estimateMinutesToGoal(chars: number, goal: number, cpm: number): number | null {
  if (cpm <= 0 || goal <= chars) return null;
  return Math.ceil((goal - chars) / cpm);
}

/** 반복어맵 — 상위 N개 빈출 단어(2회+). 본문 위치 점프 UI 소스. */
export function topRepeatedWords(t: string, n = 8): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const w of t.match(WORD) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, n))
    .map(([word, count]) => ({ word, count }));
}
