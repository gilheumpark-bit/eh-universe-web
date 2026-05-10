/**
 * translator-status-labels.ts (2026-05-10 — G-07 수리)
 *
 * TranslatorStudioApp 의 setStatusMsg 영어 hardcode 를 4언어 매트릭스로.
 *
 * 사용:
 *   import { statusLabel, statusTemplate } from './translator-status-labels';
 *   setStatusMsg(statusLabel(lang, 'updating-story-bible'));
 *   setStatusMsg(statusTemplate(lang, 'batch', 1, 5));
 */

type Lang = 'ko' | 'en' | 'ja' | 'zh';

// ============================================================
// PART 1 — 정적 라벨
// ============================================================

const LABELS = {
  'updating-story-bible': {
    ko: '스토리 바이블 갱신 중',
    en: 'Updating Story Bible',
    ja: 'ストーリーバイブル更新中',
    zh: '正在更新故事圣经',
  },
  'story-bible-updated': {
    ko: '스토리 바이블 갱신됨',
    en: 'Story Bible updated',
    ja: 'ストーリーバイブル更新完了',
    zh: '故事圣经已更新',
  },
  'fast-draft': {
    ko: '빠른 초안',
    en: 'Fast Draft',
    ja: '高速ドラフト',
    zh: '快速草稿',
  },
  'fetching-url': {
    ko: 'URL 가져오는 중',
    en: 'Fetching URL',
    ja: 'URL 取得中',
    zh: '正在获取 URL',
  },
  'importing-files': {
    ko: '파일 가져오는 중',
    en: 'Importing files',
    ja: 'ファイル取込中',
    zh: '正在导入文件',
  },
  'final-polish': {
    ko: '최종 윤문',
    en: 'Final Polish',
    ja: '最終仕上げ',
    zh: '最终润色',
  },
  'back-check': {
    ko: '역검수',
    en: 'Back Check',
    ja: '逆チェック',
    zh: '回译检查',
  },
  'compare-b': {
    ko: '비교 B',
    en: 'Compare B',
    ja: '比較 B',
    zh: '比较 B',
  },
} as const;

export type StatusLabelKey = keyof typeof LABELS;

export function statusLabel(lang: Lang, key: StatusLabelKey): string {
  const entry = LABELS[key];
  return entry[lang] ?? entry.ko;
}

// ============================================================
// PART 2 — 템플릿 (인자 포함)
// ============================================================

/** 드리프트 경고 — 콘솔 확인 안내 */
export function driftWarningLabel(lang: Lang, count: number): string {
  switch (lang) {
    case 'en': return `Drift ${count} detected — check console`;
    case 'ja': return `ドリフト ${count} 件検出 — コンソール確認`;
    case 'zh': return `检测到漂移 ${count} 件 — 请查看控制台`;
    default:   return `드리프트 ${count}건 감지 — 콘솔 확인`;
  }
}

/** 배치 진행 N/M [GLOSS suffix] */
export function batchLabel(lang: Lang, current: number, total: number, suffix = ''): string {
  switch (lang) {
    case 'en': return `Batch ${current}/${total}${suffix}`;
    case 'ja': return `バッチ ${current}/${total}${suffix}`;
    case 'zh': return `批次 ${current}/${total}${suffix}`;
    default:   return `배치 ${current}/${total}${suffix}`;
  }
}

/** 청크 진행 N/M [auto-regen suffix] */
export function chunkLabel(lang: Lang, current: number, total: number, autoRegen = false): string {
  const arSuffix = autoRegen
    ? (lang === 'ko' ? ' (자동 재생성)' : lang === 'ja' ? ' (自動再生成)' : lang === 'zh' ? ' (自动重生成)' : ' (auto-regen)')
    : '';
  switch (lang) {
    case 'en': return `Chunk ${current}/${total}${arSuffix}`;
    case 'ja': return `チャンク ${current}/${total}${arSuffix}`;
    case 'zh': return `分块 ${current}/${total}${arSuffix}`;
    default:   return `청크 ${current}/${total}${arSuffix}`;
  }
}

/** Dual stage 진행 — 'shared' | 'faithful' | 'market' */
export function dualStageLabel(lang: Lang, stage: number, track?: string): string {
  const trackSuffix = track ? ` (${track})` : '';
  switch (lang) {
    case 'en': return `DUAL · Stage ${stage}${trackSuffix}`;
    case 'ja': return `DUAL · Stage ${stage}${trackSuffix}`;
    case 'zh': return `DUAL · Stage ${stage}${trackSuffix}`;
    default:   return `DUAL · 단계 ${stage}${trackSuffix}`;
  }
}
