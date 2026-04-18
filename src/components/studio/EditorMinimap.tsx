'use client';

/**
 * EditorMinimap — VSCode 스타일의 소설 원고 미니맵.
 *
 * 핵심:
 *  - Canvas 1채널 렌더 (단락당 1~3px 막대)
 *  - 품질 점수 → 색상(green/amber/red), 대사 비율 → 밝기
 *  - 뷰포트 하이라이트 + 클릭/드래그/키보드 seek
 *  - ResizeObserver / MutationObserver 디바운스 200ms
 *  - prefers-reduced-motion 존중
 *
 * 전략: Tiptap 파서 의존을 피하기 위해 외부 DOM(editor.view.dom) 또는
 *   text 문자열을 입력으로 받아 단락을 집계한다. 두 입력 모두 없는
 *   경우에만 빈 상태 메시지를 표시한다.
 */

// ============================================================
// PART 1 — Types & Constants
// ============================================================
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import type { AppLanguage } from '@/lib/studio-types';

/**
 * Tiptap Editor 타입에서 필요한 최소 인터페이스만 의존한다.
 * @tiptap/react 의 Editor 를 직접 import 하면 컴포넌트 테스트에서
 * 전체 ProseMirror 스택을 끌고 오게 되어 부작용이 크다.
 */
interface MinimapEditorLike {
  view?: {
    dom?: HTMLElement | null;
  } | null;
  getText?: () => string;
}

export interface EditorMinimapProps {
  /** Tiptap editor instance (또는 text 배열). */
  editor?: MinimapEditorLike | null;
  /** 또는 plain text fallback. editor 가 있으면 text 는 무시된다. */
  text?: string;
  /** Quality score per paragraph (0-100). 길이 불일치 시 짧은 쪽 기준으로 fallback 회색. */
  paragraphScores?: number[];
  /** 뷰포트 스크롤 위치 (0~1). */
  scrollProgress?: number;
  /** 뷰포트 높이 비율 (0~1). 기본 0.15 */
  viewportRatio?: number;
  /** 클릭/드래그/키보드 seek 콜백 (0~1). */
  onSeek: (progress: number) => void;
  /** 폭 (기본 80px). */
  width?: number;
  /** 최대 높이 (기본 'calc(100vh - 200px)'). */
  maxHeight?: string | number;
  /** 언어 (라벨/aria 현지화). */
  language: AppLanguage;
  /** 추가 className. */
  className?: string;
}

/** 내부 단락 집계 결과. */
interface ParagraphMeta {
  /** 단락 글자 수. */
  length: number;
  /** 대사 비율 (0~1). */
  dialogueRatio: number;
  /** 문단 품질 점수 (0~100) 또는 undefined(=회색). */
  score?: number;
}

/** 색상 상수 — Design v8.0 시맨틱 토큰과 정렬된 RGB 값. */
const COLOR_GREEN = '34, 197, 94'; //  >= 80
const COLOR_AMBER = '245, 158, 11'; // 60 ~ 80
const COLOR_RED = '239, 68, 68'; //   < 60
const COLOR_NEUTRAL = '148, 163, 184'; // score 없음
const COLOR_BG = 'rgba(0, 0, 0, 0)'; // canvas clear

/** 단락당 최소/최대 막대 높이(px). */
const MIN_BAR_PX = 1.5;
const MAX_BAR_PX = 3;
/** 단락 사이 갭(px). */
const BAR_GAP_PX = 1;
/** MutationObserver 디바운스. */
const MUTATION_DEBOUNCE_MS = 200;
/** 키보드 이동 단위(비율). */
const KEY_STEP = 0.05;

// ============================================================
// PART 2 — Helpers (paragraph extraction, color)
// ============================================================

/**
 * editor.view.dom 의 <p> 요소에서 단락 메타를 수집.
 * Tiptap 은 빈 단락도 <p><br></p> 로 렌더하므로 너무 짧은 단락은 스킵한다.
 */
function collectFromDom(root: HTMLElement): ParagraphMeta[] {
  const paragraphs = root.querySelectorAll<HTMLElement>('p');
  const out: ParagraphMeta[] = [];
  paragraphs.forEach((p) => {
    const txt = p.textContent ?? '';
    const length = txt.length;
    if (length === 0) return;
    out.push({ length, dialogueRatio: computeDialogueRatio(txt) });
  });
  return out;
}

/**
 * plain text fallback — 빈 줄로 분리된 블록을 단락으로 간주한다.
 * 한 줄씩만 주어져도 동작하도록 \n 단일 분리도 허용한다.
 */
function collectFromText(text: string): ParagraphMeta[] {
  if (!text) return [];
  // 빈 줄 분리가 1개 이상 있으면 블록 분리, 없으면 한 줄=한 단락
  const hasBlankLine = /\n\s*\n/.test(text);
  const blocks = hasBlankLine
    ? text.split(/\n\s*\n/)
    : text.split(/\n/);
  const out: ParagraphMeta[] = [];
  for (const b of blocks) {
    const t = b.trim();
    if (!t) continue;
    out.push({ length: t.length, dialogueRatio: computeDialogueRatio(t) });
  }
  return out;
}

/** 대사 비율 — 쌍따옴표, 한국식 「」, 작은따옴표 '…' 추정. */
function computeDialogueRatio(txt: string): number {
  if (!txt) return 0;
  // 매칭 후 문자열 길이 합산 → 전체 대비 비율
  const patterns: RegExp[] = [
    /"[^"\n]{1,400}"/g,
    /\u201C[^\u201D\n]{1,400}\u201D/g, // “ ”
    /「[^」\n]{1,400}」/g,
    /『[^』\n]{1,400}』/g,
    /'[^'\n]{2,400}'/g,
  ];
  let total = 0;
  for (const re of patterns) {
    const matches = txt.match(re);
    if (!matches) continue;
    for (const m of matches) total += m.length;
  }
  const ratio = total / txt.length;
  return ratio > 1 ? 1 : ratio;
}

/** 점수 → RGB triple. */
function scoreToRgb(score: number | undefined): string {
  if (score == null || Number.isNaN(score)) return COLOR_NEUTRAL;
  if (score >= 80) return COLOR_GREEN;
  if (score >= 60) return COLOR_AMBER;
  return COLOR_RED;
}

/** 최종 rgba 문자열 (밝기 = 대사 비율 영향 + 알파 0.75~1.0). */
function buildFill(score: number | undefined, dialogueRatio: number): string {
  const rgb = scoreToRgb(score);
  // dialogueRatio 0 → 0.7, 1 → 1.0 로 선형.
  const alpha = 0.7 + Math.max(0, Math.min(1, dialogueRatio)) * 0.3;
  return `rgba(${rgb}, ${alpha.toFixed(2)})`;
}

/**
 * paragraphs + scores → 각 단락의 score 주입.
 * 길이 불일치 시 짧은 쪽 기준, 나머지는 undefined(회색).
 */
function mergeScores(paragraphs: ParagraphMeta[], scores?: number[]): ParagraphMeta[] {
  if (!scores || scores.length === 0) return paragraphs;
  return paragraphs.map((p, i) => {
    if (i >= scores.length) return p;
    const s = scores[i];
    if (typeof s !== 'number' || Number.isNaN(s)) return p;
    return { ...p, score: s };
  });
}

// ============================================================
// PART 3 — Component
// ============================================================

/**
 * EditorMinimap — 우측 레일에 붙이는 단락 미니맵.
 */
export function EditorMinimap({
  editor = null,
  text,
  paragraphScores,
  scrollProgress = 0,
  viewportRatio = 0.15,
  onSeek,
  width = 80,
  maxHeight = 'calc(100vh - 200px)',
  language,
  className,
}: EditorMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paragraphs, setParagraphs] = useState<ParagraphMeta[]>([]);
  const [canvasHeight, setCanvasHeight] = useState<number>(300);
  const [isDragging, setIsDragging] = useState(false);
  const reducedMotionRef = useRef<boolean>(false);

  // ---- reduced-motion 감지 (1회) ----
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      reducedMotionRef.current = !!mq.matches;
    } catch {
      // 무시 — 테스트 환경에서는 matchMedia mock 사용
    }
  }, []);

  // ---- 단락 수집 (editor 우선, text fallback) ----
  const refreshParagraphs = useCallback(() => {
    try {
      if (editor?.view?.dom instanceof HTMLElement) {
        setParagraphs(collectFromDom(editor.view.dom));
        return;
      }
      if (typeof text === 'string') {
        setParagraphs(collectFromText(text));
        return;
      }
      setParagraphs([]);
    } catch (err) {
      logger.warn('EditorMinimap', 'refreshParagraphs failed', err);
      setParagraphs([]);
    }
  }, [editor, text]);

  // 초기 + text/editor 변경 시 즉시 1회
  useEffect(() => {
    refreshParagraphs();
  }, [refreshParagraphs]);

  // ---- MutationObserver (editor DOM 변경 감지, 디바운스) ----
  useEffect(() => {
    const dom = editor?.view?.dom;
    if (!(dom instanceof HTMLElement)) return;
    const mo = new MutationObserver(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        refreshParagraphs();
      }, MUTATION_DEBOUNCE_MS);
    });
    mo.observe(dom, { childList: true, subtree: true, characterData: true });
    return () => {
      mo.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editor, refreshParagraphs]);

  // ---- ResizeObserver (부모 높이 → canvas 높이) ----
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = Math.round(e.contentRect.height);
        if (h > 0) setCanvasHeight(h);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- 단락 + 점수 병합 (캐시) ----
  const merged = useMemo(
    () => mergeScores(paragraphs, paragraphScores),
    [paragraphs, paragraphScores],
  );

  // ---- 총 글자수 (단락 높이 비례 계산에 사용) ----
  const totalChars = useMemo(() => {
    let n = 0;
    for (const p of merged) n += p.length;
    return n;
  }, [merged]);

  // ---- Canvas 렌더 (RAF) ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = width;
    const h = canvasHeight;
    // HiDPI 고려 — devicePixelRatio. 테스트 환경에서는 1로 간주
    const dpr =
      (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    if (canvas.width !== w * dpr) canvas.width = w * dpr;
    if (canvas.height !== h * dpr) canvas.height = h * dpr;
    if (typeof ctx.setTransform === 'function') {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    if (merged.length === 0 || totalChars === 0) return;

    // 사용 가능한 세로 공간에서 각 단락 높이 계산
    const gap = BAR_GAP_PX;
    const availH = h - gap * Math.max(0, merged.length - 1);
    if (availH <= 0) return;

    let y = 0;
    for (const p of merged) {
      // 글자 수 비례 높이, 최소/최대 클램프
      const rawH = (p.length / totalChars) * availH;
      const barH = Math.max(MIN_BAR_PX, Math.min(MAX_BAR_PX * 6, rawH));
      ctx.fillStyle = buildFill(p.score, p.dialogueRatio);
      ctx.fillRect(4, y, w - 8, barH);
      y += barH + gap;
      if (y >= h) break;
    }
  }, [width, canvasHeight, merged, totalChars]);

  // RAF 스로틀 렌더
  useEffect(() => {
    if (rafRef.current != null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafRef.current);
      }
    }
    if (typeof requestAnimationFrame === 'function') {
      rafRef.current = requestAnimationFrame(() => {
        draw();
        rafRef.current = null;
      });
    } else {
      // SSR/테스트 fallback
      draw();
    }
    return () => {
      if (rafRef.current != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [draw]);

  // ---- Seek 핸들러 ----
  const emitSeekFromY = useCallback(
    (y: number, height: number) => {
      if (height <= 0) return;
      const clamped = Math.max(0, Math.min(1, y / height));
      try {
        onSeek(clamped);
      } catch (err) {
        logger.warn('EditorMinimap', 'onSeek threw', err);
      }
    },
    [onSeek],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = containerRef.current ?? e.currentTarget;
      const rect = target.getBoundingClientRect();
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // jsdom에서 setPointerCapture 미지원 시 무시
      }
      emitSeekFromY(e.clientY - rect.top, rect.height);
    },
    [emitSeekFromY],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const target = containerRef.current ?? e.currentTarget;
      const rect = target.getBoundingClientRect();
      emitSeekFromY(e.clientY - rect.top, rect.height);
    },
    [isDragging, emitSeekFromY],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        // jsdom에서 releasePointerCapture 미지원 시 무시
      }
    },
    [isDragging],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const current = Math.max(0, Math.min(1, scrollProgress));
      let next = current;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        next = Math.min(1, current + KEY_STEP);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        next = Math.max(0, current - KEY_STEP);
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = 1;
      } else {
        return;
      }
      e.preventDefault();
      try {
        onSeek(next);
      } catch (err) {
        logger.warn('EditorMinimap', 'onSeek threw', err);
      }
    },
    [scrollProgress, onSeek],
  );

  // ---- 뷰포트 박스 위치 계산 ----
  const viewport = useMemo(() => {
    const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
    const clampedRatio = Math.max(0.02, Math.min(1, viewportRatio));
    const boxH = canvasHeight * clampedRatio;
    // 스크롤 진행은 위에서 시작. top = progress * (canvas - box)
    const top = Math.max(0, Math.min(canvasHeight - boxH, clampedProgress * (canvasHeight - boxH)));
    return { top, height: boxH };
  }, [scrollProgress, viewportRatio, canvasHeight]);

  const isEmpty = merged.length === 0;

  const emptyMsg = L4(language, {
    ko: '미니맵을 표시할 원고가 없습니다',
    en: 'No manuscript to show in minimap',
    ja: 'ミニマップに表示する原稿がありません',
    zh: '没有可显示的原稿',
  });

  const ariaLabel = L4(language, {
    ko: '원고 미니맵 내비게이션',
    en: 'Manuscript minimap navigation',
    ja: '原稿ミニマップナビゲーション',
    zh: '原稿缩略导航',
  });

  const valuePct = Math.round(Math.max(0, Math.min(1, scrollProgress)) * 100);

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valuePct}
      aria-disabled={isEmpty || undefined}
      tabIndex={isEmpty ? -1 : 0}
      onPointerDown={isEmpty ? undefined : handlePointerDown}
      onPointerMove={isEmpty ? undefined : handlePointerMove}
      onPointerUp={isEmpty ? undefined : handlePointerUp}
      onPointerCancel={isEmpty ? undefined : handlePointerUp}
      onKeyDown={isEmpty ? undefined : handleKeyDown}
      data-testid="editor-minimap"
      data-empty={isEmpty || undefined}
      data-dragging={isDragging || undefined}
      className={[
        'editor-minimap relative select-none bg-bg-secondary border border-border rounded-md overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue',
        isDragging ? 'cursor-grabbing' : 'cursor-grab',
        className ?? '',
      ].join(' ')}
      style={{
        width,
        maxHeight,
        height: '100%',
      }}
    >
      {isEmpty ? (
        <div
          className="flex items-center justify-center text-xs text-text-tertiary px-2 py-4 text-center"
          aria-live="polite"
        >
          {emptyMsg}
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            data-testid="editor-minimap-canvas"
            aria-hidden="true"
            style={{ width, height: canvasHeight, display: 'block' }}
          />
          <div
            data-testid="editor-minimap-viewport"
            aria-hidden="true"
            className="absolute left-0 right-0 bg-accent-blue/20 border border-accent-blue pointer-events-none"
            style={{
              top: viewport.top,
              height: viewport.height,
              transition: reducedMotionRef.current ? 'none' : 'top 120ms ease-out',
            }}
          />
        </>
      )}
    </div>
  );
}

// ============================================================
// PART 4 — Exports
// ============================================================
export default EditorMinimap;
export type { MinimapEditorLike };
