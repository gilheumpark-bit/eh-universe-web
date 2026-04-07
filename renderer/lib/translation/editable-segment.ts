// ============================================================
// Editable Translation Segment — 편집 가능한 번역 단위
// ============================================================

export interface TranslationSegment {
  id: string;
  /** 원문 문장 */
  source: string;
  /** 현재 번역 (편집 가능) */
  target: string;
  /** AI 초벌 번역 (변경 전 원본) */
  machineTarget: string;
  /** 상태 */
  status: 'machine' | 'edited' | 'confirmed' | 'rejected';
  /** 최근 점수 (0-100) */
  score: number;
  /** 편집 이력 */
  history: SegmentEdit[];
  /** 번역가 코멘트 */
  comment: string;
}

export interface SegmentEdit {
  timestamp: number;
  before: string;
  after: string;
  /** 'human' | 'ai-rescore' | 'ai-retranslate' */
  source: string;
}

/** 원문+번역 텍스트를 문장 단위로 정렬된 세그먼트 배열로 분할 */
export function createSegments(sourceText: string, translatedText: string): TranslationSegment[] {
  const sourceSentences = splitSentences(sourceText);
  const targetSentences = splitSentences(translatedText);

  const maxLen = Math.max(sourceSentences.length, targetSentences.length);
  const segments: TranslationSegment[] = [];

  for (let i = 0; i < maxLen; i++) {
    segments.push({
      id: `seg-${i}`,
      source: sourceSentences[i] || '',
      target: targetSentences[i] || '',
      machineTarget: targetSentences[i] || '',
      status: 'machine',
      score: 0,
      history: [],
      comment: '',
    });
  }

  return segments;
}

/** 세그먼트 편집 기록 */
export function editSegment(seg: TranslationSegment, newTarget: string): TranslationSegment {
  if (newTarget === seg.target) return seg;
  return {
    ...seg,
    target: newTarget,
    status: 'edited',
    history: [
      ...seg.history,
      { timestamp: Date.now(), before: seg.target, after: newTarget, source: 'human' },
    ],
  };
}

/** 세그먼트 확정 */
export function confirmSegment(seg: TranslationSegment): TranslationSegment {
  return { ...seg, status: 'confirmed' };
}

/** 세그먼트 거부 (재번역 필요 표시) */
export function rejectSegment(seg: TranslationSegment): TranslationSegment {
  return { ...seg, status: 'rejected' };
}

/** 전체 세그먼트를 하나의 번역 텍스트로 합침 */
export function mergeSegments(segments: TranslationSegment[]): string {
  return segments.map(s => s.target).join(' ');
}

/** 세그먼트 통계 */
export function segmentStats(segments: TranslationSegment[]) {
  return {
    total: segments.length,
    machine: segments.filter(s => s.status === 'machine').length,
    edited: segments.filter(s => s.status === 'edited').length,
    confirmed: segments.filter(s => s.status === 'confirmed').length,
    rejected: segments.filter(s => s.status === 'rejected').length,
    avgScore: segments.length > 0
      ? Math.round(segments.reduce((a, s) => a + s.score, 0) / segments.length)
      : 0,
  };
}

// ── 문장 분리 (한/영/일/중 대응) ──

function splitSentences(text: string): string[] {
  // 마침표/물음표/느낌표 + 공백 또는 줄바꿈 기준
  // 대화문 내부의 마침표는 분리하지 않음
  const raw = text
    .replace(/\n{2,}/g, '\n\n')
    .split(/(?<=[.!?。！？」』"'])\s+|(?<=\n)\n/)
    .map(s => s.trim())
    .filter(Boolean);
  return raw;
}
