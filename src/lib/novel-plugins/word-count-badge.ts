/**
 * Bundled plugin — Word Count Badge.
 *
 * Reads the current manuscript on activate and emits a count event.
 * Intentionally minimal: future work wires this into the status bar.
 */
import type { NovelPlugin } from '@/lib/novel-plugin-registry';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — Plugin definition
// ============================================================

export const wordCountBadge: NovelPlugin = {
  manifest: {
    id: 'word-count-badge',
    name: {
      ko: '글자수 배지',
      en: 'Word Count Badge',
      ja: '文字数バッジ',
      zh: '字数徽章',
    },
    description: {
      ko: '현재 에피소드의 글자 수를 상태바에 표시합니다.',
      en: 'Shows the character count of the current episode in the status bar.',
      ja: '現在のエピソードの文字数をステータスバーに表示します。',
      zh: '在状态栏中显示当前章节的字数。',
    },
    version: '1.0.0',
    category: 'analysis',
    author: 'NOA',
    iconLucide: 'Hash',
    bundled: true,
    entryPoint: 'built-in://word-count-badge',
    permissions: ['read-manuscript'],
  },
  activate: (ctx) => {
    try {
      const content = ctx.readManuscript?.() ?? '';
      const count = content.length;
      ctx.emit('noa:plugin:word-count-badge:enabled', { id: 'word-count-badge', count });
    } catch (err) {
      logger.warn('plugin/word-count-badge', 'activate failed', err);
    }
  },
  deactivate: () => {
    try {
      // No-op for skeleton — future UI subscription gets torn down here.
    } catch (err) {
      logger.warn('plugin/word-count-badge', 'deactivate failed', err);
    }
  },
};
