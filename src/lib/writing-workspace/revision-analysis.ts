// ============================================================
// revision-analysis — 퇴고 5지표 + 문제 검출 (claude 06_퇴고출고 흡수)
// 지침: show/tell·반복어·문장 다양성·밀도·대사비율 + 마크다운/이모지 잔여(§1.3).
// 순수 함수. 절대금지 8파일 import 0.
// ============================================================

import { analyzeText } from './writing-stats';

export interface RevisionMetrics {
  chars: number;
  /** tell 표현(설명형) 문장 비율 % — 낮을수록 show 위주 */
  tellPct: number;
  /** 반복어 비율 % */
  repetitionPct: number;
  /** 대사 비율 % */
  dialoguePct: number;
  /** 문장 길이 다양성 0~100 (높을수록 리듬 다양) */
  sentenceVariety: number;
  /** 평균 문장 길이(자) — 밀도 지표 */
  avgLen: number;
  /** 마크다운/이모지 잔여 (출고 §1.3 — 0이어야 함) */
  artifacts: string[];
}

export type RevisionIssueKind = 'tell-heavy' | 'repetition' | 'low-variety' | 'low-dialogue' | 'markdown-residue';
export interface RevisionIssue { kind: RevisionIssueKind; severity: 'warn' | 'info'; hint: string }

// 설명형(tell) 종결·표현 — claude 05/06 baseline 축약
const TELL_PATTERNS = [
  '느꼈다', '느껴졌다', '생각했다', '생각이 들었다', '기분이 들었다', '마음이 들었다',
  '것 같았다', '듯했다', '듯 보였다', '인 것이다', '셈이었다', '듯싶었다',
];
const SENTENCE_SPLIT = /[.!?。…\n]+/;
// 마크다운/이모지 잔여
const MD_RESIDUE: { re: RegExp; label: string }[] = [
  { re: /\*\*[^*]+\*\*/, label: '**볼드**' },
  { re: /^#{1,6}\s/m, label: '## 헤딩' },
  { re: /\[[^\]]+\]\([^)]+\)/, label: '[링크]()' },
  { re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, label: '이모지' },
];

function sentences(text: string): string[] {
  return text.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
}

/** 문장 길이 표준편차 → 0~100 다양성 점수. */
function variety(text: string): number {
  const lens = sentences(text).map((s) => s.length);
  if (lens.length < 2) return 0;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  if (mean === 0) return 0;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  return Math.min(100, Math.round((sd / mean) * 100)); // 변동계수 → %
}

export function analyzeRevision(text: string): RevisionMetrics {
  const base = analyzeText(text);
  const sents = sentences(text);
  let tellHits = 0;
  for (const p of TELL_PATTERNS) {
    let i = text.indexOf(p);
    while (i !== -1) { tellHits++; i = text.indexOf(p, i + p.length); }
  }
  const artifacts = MD_RESIDUE.filter(({ re }) => re.test(text)).map(({ label }) => label);
  return {
    chars: base.chars,
    tellPct: sents.length ? Math.min(100, Math.round((tellHits / sents.length) * 100)) : 0,
    repetitionPct: base.repetitionPct,
    dialoguePct: base.dialoguePct,
    sentenceVariety: variety(text),
    avgLen: base.avgLen,
    artifacts,
  };
}

/** 지표 → 퇴고 이슈 목록 (지침 임계값 기반). */
export function revisionIssues(m: RevisionMetrics): RevisionIssue[] {
  const out: RevisionIssue[] = [];
  if (m.tellPct >= 25) out.push({ kind: 'tell-heavy', severity: 'warn', hint: `설명형(tell) 문장 ${m.tellPct}% — show 위주로 전환 권장` });
  if (m.repetitionPct >= 35) out.push({ kind: 'repetition', severity: 'warn', hint: `반복어 ${m.repetitionPct}% — 동의어·재구성 권장` });
  if (m.chars >= 300 && m.sentenceVariety < 25) out.push({ kind: 'low-variety', severity: 'info', hint: `문장 길이 단조(다양성 ${m.sentenceVariety}) — 장단 리듬 섞기` });
  if (m.chars >= 500 && m.dialoguePct < 10) out.push({ kind: 'low-dialogue', severity: 'info', hint: `대사 ${m.dialoguePct}% — 장면 생동감 위해 대사 보강 고려` });
  if (m.artifacts.length) out.push({ kind: 'markdown-residue', severity: 'warn', hint: `출고 부적합 잔여: ${m.artifacts.join(', ')} — 제거 필요` });
  return out;
}
