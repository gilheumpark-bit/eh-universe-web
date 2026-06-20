/**
 * Bundled plugin — Reading Time Estimator.
 *
 * Uses a simple 300 chars/min heuristic — comparable to Korean web-novel
 * reading speeds on mobile. Emits `noa:plugin:reading-time:estimate`.
 */
import type { NovelPlugin } from '@/lib/novel-plugin-registry';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Plugin definition
// ============================================================

/** Characters read per minute. Matches web-novel reading survey median. */
const CHARS_PER_MINUTE = 300;

function estimateMinutes(text: string): number {
  if (!text) return 0;
  const minutes = text.length / CHARS_PER_MINUTE;
  // Minimum 1 minute if there is any content — avoids "0 min" UX surprise.
  return minutes > 0 && minutes < 1 ? 1 : Math.round(minutes);
}

export const readingTimeEstimator: NovelPlugin = {
  manifest: {
    id: 'reading-time-estimator',
    name: {
      ko: '예상 읽기 시간',
      en: 'Reading Time Estimator',
      ja: '読書時間推定',
      zh: '阅读时间估算',
    },
    description: {
      ko: '분당 300자 기준으로 현재 에피소드의 예상 읽기 시간을 계산합니다.',
      en: 'Estimates reading time for the current episode at 300 chars/minute.',
      ja: '1分あたり300文字換算で現在のエピソードの読書時間を推定します。',
      zh: '以每分钟300字估算当前章节的阅读时间。',
    },
    version: '1.0.0',
    category: 'analysis',
    author: 'NOA',
    iconLucide: 'Clock',
    bundled: true,
    entryPoint: 'built-in://reading-time-estimator',
    permissions: ['read-manuscript'],
  },
  activate: (ctx) => {
    try {
      const content = ctx.readManuscript?.() ?? '';
      const minutes = estimateMinutes(content);
      ctx.emit('noa:plugin:reading-time:estimate', {
        id: 'reading-time-estimator',
        minutes,
      });
    } catch (err) {
      logger.warn('plugin/reading-time-estimator', 'activate failed', err);
    }
  },
  deactivate: () => {
    // No-op for skeleton.
  },
};

// Exposed for testing — pure function, no side effects.
export const __testing = { estimateMinutes, CHARS_PER_MINUTE };
