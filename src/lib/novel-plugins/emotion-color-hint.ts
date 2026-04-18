/**
 * Bundled plugin — Emotion Color Hint.
 *
 * Scans the manuscript for a small set of emotion keywords and emits
 * suggested accent colors per emotion. Intended as a visualization aid
 * that a future panel will render as a palette strip.
 */
import type { NovelPlugin } from '@/lib/novel-plugin-registry';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Plugin definition
// ============================================================

/**
 * Keyword → color mapping. Kept small on purpose — the goal is a hint,
 * not sentiment analysis. Colors follow the Design System v8.0 accent
 * palette so they land well on the default dark theme.
 */
const EMOTION_PALETTE: ReadonlyArray<{
  key: string;
  keywords: readonly string[];
  color: string;
}> = [
  { key: 'joy',    keywords: ['기쁨', '행복', '미소', 'joy', 'happy'],        color: '#f9c846' },
  { key: 'anger',  keywords: ['분노', '화가', '격분', 'anger', 'rage'],       color: '#e5484d' },
  { key: 'sad',    keywords: ['슬픔', '눈물', '비탄', 'sad', 'grief'],         color: '#3b82f6' },
  { key: 'fear',   keywords: ['공포', '두려움', '전율', 'fear', 'terror'],    color: '#8b5cf6' },
  { key: 'calm',   keywords: ['평온', '고요', 'calm', 'serene'],              color: '#10b981' },
];

interface EmotionHint {
  key: string;
  count: number;
  color: string;
}

function scanEmotions(text: string): EmotionHint[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hints: EmotionHint[] = [];
  for (const entry of EMOTION_PALETTE) {
    let count = 0;
    for (const kw of entry.keywords) {
      // Simple substring count — Korean keywords are short enough that
      // boundary-based matching would drop real hits.
      const needle = kw.toLowerCase();
      if (!needle) continue;
      let idx = lower.indexOf(needle);
      while (idx !== -1) {
        count += 1;
        idx = lower.indexOf(needle, idx + needle.length);
      }
    }
    if (count > 0) {
      hints.push({ key: entry.key, count, color: entry.color });
    }
  }
  return hints;
}

export const emotionColorHint: NovelPlugin = {
  manifest: {
    id: 'emotion-color-hint',
    name: {
      ko: '감정 색상 힌트',
      en: 'Emotion Color Hint',
      ja: '感情カラーヒント',
      zh: '情感颜色提示',
    },
    description: {
      ko: '감정 키워드를 스캔하여 에피소드별 색상 팔레트를 제안합니다.',
      en: 'Scans emotion keywords and suggests a color palette per episode.',
      ja: '感情キーワードをスキャンし、エピソードごとのカラーパレットを提案します。',
      zh: '扫描情感关键词,为每个章节建议色彩调色板。',
    },
    version: '1.0.0',
    category: 'visualization',
    author: 'NOA',
    iconLucide: 'Palette',
    bundled: true,
    entryPoint: 'built-in://emotion-color-hint',
    permissions: ['read-manuscript'],
  },
  activate: (ctx) => {
    try {
      const content = ctx.readManuscript?.() ?? '';
      const hints = scanEmotions(content);
      ctx.emit('noa:plugin:emotion-color:hints', {
        id: 'emotion-color-hint',
        hints,
      });
    } catch (err) {
      logger.warn('plugin/emotion-color-hint', 'activate failed', err);
    }
  },
  deactivate: () => {
    // No-op for skeleton.
  },
};

// Exposed for testing — pure function, no side effects.
export const __testing = { scanEmotions, EMOTION_PALETTE };
