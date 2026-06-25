"use client";

// ============================================================
// ZenTweaksPanel — Doc 5 인터랙티브 spec (2026-05-12)
// ============================================================
// FAB ⚙ 우측 하단 → 클릭 시 Tweaks panel 노출.
// 사용자가 본문 크기 / 행간 / 본문 폭 / 드롭 캡 / 심볼 / 배경 모드 직접 조정.
// 인체공학 ① 타이포 P1 핵심 — "WCAG 2.2 권장 + 시각 피로 13% 감소"의 user-control.
//
// 영속화: localStorage 'loreguard_zen_tweaks'.
// CSS variable 적용: --editor-font-size / --editor-line-height / --editor-max-width.
// NovelEditor의 ProseMirror 스타일이 이 변수를 fallback으로 사용 (NovelEditor.tsx:318-327).
//
// [Design debt fix — 2026-06-23] body 직계 portal은 유지하되, 시각 표현은
// globals-studio.css의 zen-tweaks-* 계약으로 이동한다. ancestor cascade는 피하고
// inline style 부채는 만들지 않는다.
//
// [C] SSR-safe (typeof window + portal target useState)
// [G] localStorage write throttle (slider 드래그 시 매 frame 쓰기 방지) — debounce 300ms
// [K] 4언어 라벨 + 단일 component

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export type ZenBackgroundMode = 'night' | 'paper' | 'midnight';

export interface ZenTweaks {
  fontSize: number;       // 14~22 px
  lineHeight: number;     // 1.5~2.2
  widthEm: number;        // 30~48 em
  dropCap: boolean;
  symbolDeco: boolean;
  bgMode: ZenBackgroundMode;
}

export interface ZenTweaksPanelProps {
  language: AppLanguage;
  /** Zen 모드 활성 여부 — false면 FAB 숨김 (UI 충돌 방지). */
  zenActive: boolean;
}

const STORAGE_KEY = 'loreguard_zen_tweaks';

const DEFAULT_TWEAKS: ZenTweaks = {
  fontSize: 17,
  lineHeight: 1.85,
  widthEm: 38,
  dropCap: true,
  symbolDeco: true,
  bgMode: 'night',
};

// ============================================================
// PART 2 — Persistence helpers
// ============================================================

function loadTweaks(): ZenTweaks {
  if (typeof window === 'undefined') return DEFAULT_TWEAKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TWEAKS;
    const parsed = JSON.parse(raw) as Partial<ZenTweaks>;
    // [C] 누락 키는 default 사용. 잘못된 값은 clamp.
    return {
      fontSize: clamp(Number(parsed.fontSize), 14, 22, DEFAULT_TWEAKS.fontSize),
      lineHeight: clamp(Number(parsed.lineHeight), 1.5, 2.2, DEFAULT_TWEAKS.lineHeight),
      widthEm: clamp(Number(parsed.widthEm), 30, 48, DEFAULT_TWEAKS.widthEm),
      dropCap: typeof parsed.dropCap === 'boolean' ? parsed.dropCap : DEFAULT_TWEAKS.dropCap,
      symbolDeco: typeof parsed.symbolDeco === 'boolean' ? parsed.symbolDeco : DEFAULT_TWEAKS.symbolDeco,
      bgMode: (['night', 'paper', 'midnight'] as const).includes(parsed.bgMode as ZenBackgroundMode)
        ? (parsed.bgMode as ZenBackgroundMode)
        : DEFAULT_TWEAKS.bgMode,
    };
  } catch {
    return DEFAULT_TWEAKS;
  }
}

function saveTweaks(t: ZenTweaks): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    /* quota / private */
  }
}

function clamp(v: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

// ============================================================
// PART 3 — Apply tweaks to CSS variables
// ============================================================

function applyTweaks(t: ZenTweaks): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--editor-font-size', `${t.fontSize}px`);
  root.style.setProperty('--editor-line-height', String(t.lineHeight));
  root.style.setProperty('--editor-max-width', `${t.widthEm}em`);
  // bgMode → CSS variable로 body bg 전환. 단일 NovelEditor 영향만, 전체 dark/light 모드 무관.
  // night: dark bg-1 (#11100e), paper: warm beige (#f5f0e8), midnight: extra dark (#0a0907)
  // 본 component는 hint로 데이터 attribute 설정만 — globals.css에서 처리하거나 NovelEditor 직접 적용.
  root.dataset.zenBg = t.bgMode;
}

// ============================================================
// PART 4 — Component
// ============================================================

function ZenTweaksPanelInner({ language, zenActive }: ZenTweaksPanelProps) {
  const [open, setOpen] = useState(false);
  const [tweaks, setTweaks] = useState<ZenTweaks>(DEFAULT_TWEAKS);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 초기 mount: localStorage 로드 + CSS variable 적용
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalTarget(document.body);
    const loaded = loadTweaks();

    setTweaks(loaded);
    applyTweaks(loaded);
  }, []);

  // tweaks 변경 시 CSS variable 즉시 적용 + debounce localStorage write
  useEffect(() => {
    applyTweaks(tweaks);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveTweaks(tweaks), 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [tweaks]);

  // Esc로 닫기 (zen 모드 종료 단축키와 충돌 회피 — open일 때만 처리)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open]);

  const update = useCallback(<K extends keyof ZenTweaks>(key: K, value: ZenTweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (!portalTarget) return null;
  // Zen 모드 비활성 시 FAB 숨김 — 일반 모드에선 UI 충돌 (Studio dock과 우하단 공유).
  if (!zenActive) return null;

  // ============================================================
  // PART 4.1 — Render (Portal to body)
  // ============================================================
  return createPortal((
    <>
      <button
        type="button"
        className={`zen-tweaks-fab${open ? ' is-hidden' : ''}`}
        onClick={() => setOpen(true)}
        title={L4(language, {
          ko: 'Zen 조정',
          en: 'Zen Tweaks',
          ja: 'Zen 調整',
          zh: 'Zen 调节',
        })}
        aria-label={L4(language, {
          ko: 'Zen 조정 패널 열기',
          en: 'Open Zen Tweaks panel',
          ja: 'Zen 調整パネルを開く',
          zh: '打开 Zen 调节面板',
        })}
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
      </button>

      <div
        className={`zen-tweaks-panel${open ? ' is-open' : ' is-closed'}`}
        role="dialog"
        aria-modal="false"
        aria-label={L4(language, {
          ko: 'Zen 조정',
          en: 'Zen Tweaks',
          ja: 'Zen 調整',
          zh: 'Zen 调节',
        })}
        aria-hidden={!open}
      >
        <div className="zen-tweaks-head">
          <div className="zen-tweaks-title">
            {L4(language, { ko: '조정', en: 'Tweaks', ja: '調整', zh: '调节' })}
          </div>
          <button
            type="button"
            className="zen-tweaks-close"
            onClick={() => setOpen(false)}
            aria-label={L4(language, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' })}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="zen-tweaks-body">
          {/* 본문 크기 */}
          <div className="zen-tweaks-row">
            <div className="zen-tweaks-label">
              <span>{L4(language, { ko: '본문 크기', en: 'Font size', ja: '文字サイズ', zh: '字号' })}</span>
              <span className="zen-tweaks-val">{tweaks.fontSize}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={22}
              step={1}
              value={tweaks.fontSize}
              onChange={(e) => update('fontSize', Number(e.target.value))}
              className="zen-tweaks-range"
              aria-label={L4(language, { ko: '본문 크기', en: 'Font size', ja: '文字サイズ', zh: '字号' })}
            />
          </div>

          {/* 행간 */}
          <div className="zen-tweaks-row">
            <div className="zen-tweaks-label">
              <span>{L4(language, { ko: '행간', en: 'Line height', ja: '行間', zh: '行距' })}</span>
              <span className="zen-tweaks-val">{tweaks.lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={2.2}
              step={0.05}
              value={tweaks.lineHeight}
              onChange={(e) => update('lineHeight', Number(e.target.value))}
              className="zen-tweaks-range"
              aria-label={L4(language, { ko: '행간', en: 'Line height', ja: '行間', zh: '行距' })}
            />
          </div>

          {/* 본문 폭 */}
          <div className="zen-tweaks-row">
            <div className="zen-tweaks-label">
              <span>{L4(language, { ko: '본문 폭', en: 'Width', ja: '本文幅', zh: '正文宽' })}</span>
              <span className="zen-tweaks-val">{tweaks.widthEm}em</span>
            </div>
            <input
              type="range"
              min={30}
              max={48}
              step={1}
              value={tweaks.widthEm}
              onChange={(e) => update('widthEm', Number(e.target.value))}
              className="zen-tweaks-range"
              aria-label={L4(language, { ko: '본문 폭', en: 'Width', ja: '本文幅', zh: '正文宽' })}
            />
          </div>

          {/* 드롭 캡 toggle */}
          <div className="zen-tweaks-row">
            <button
              type="button"
              className="zen-tweaks-toggle"
              onClick={() => update('dropCap', !tweaks.dropCap)}
              aria-pressed={tweaks.dropCap}
            >
              <span className="zen-tweaks-toggle-label">
                {L4(language, { ko: '첫 글자 amber', en: 'Drop cap amber', ja: '頭文字 amber', zh: '首字 amber' })}
              </span>
              <span className={`zen-tweaks-switch${tweaks.dropCap ? ' is-on' : ''}`}>
                <span className="zen-tweaks-switch-dot" />
              </span>
            </button>
          </div>

          {/* 심볼 표시 toggle */}
          <div className="zen-tweaks-row">
            <button
              type="button"
              className="zen-tweaks-toggle"
              onClick={() => update('symbolDeco', !tweaks.symbolDeco)}
              aria-pressed={tweaks.symbolDeco}
            >
              <span className="zen-tweaks-toggle-label">
                {L4(language, { ko: '인물 underline', en: 'Symbol underline', ja: '人物 underline', zh: '人物 underline' })}
              </span>
              <span className={`zen-tweaks-switch${tweaks.symbolDeco ? ' is-on' : ''}`}>
                <span className="zen-tweaks-switch-dot" />
              </span>
            </button>
          </div>

          {/* 배경 모드 segment */}
          <div className="zen-tweaks-row">
            <div className="zen-tweaks-label">
              <span>{L4(language, { ko: '밤 모드', en: 'Background', ja: '背景モード', zh: '背景' })}</span>
            </div>
            <div className="zen-tweaks-seg">
              <button
                type="button"
                className={tweaks.bgMode === 'night' ? 'is-active' : undefined}
                onClick={() => update('bgMode', 'night')}
                aria-pressed={tweaks.bgMode === 'night'}
              >
                {L4(language, { ko: '밤', en: 'Night', ja: '夜', zh: '夜' })}
              </button>
              <button
                type="button"
                className={tweaks.bgMode === 'paper' ? 'is-active' : undefined}
                onClick={() => update('bgMode', 'paper')}
                aria-pressed={tweaks.bgMode === 'paper'}
              >
                {L4(language, { ko: '원고지', en: 'Paper', ja: '原稿用紙', zh: '稿纸' })}
              </button>
              <button
                type="button"
                className={tweaks.bgMode === 'midnight' ? 'is-active' : undefined}
                onClick={() => update('bgMode', 'midnight')}
                aria-pressed={tweaks.bgMode === 'midnight'}
              >
                {L4(language, { ko: '심야', en: 'Midnight', ja: '深夜', zh: '深夜' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  ), portalTarget);
}

export const ZenTweaksPanel = memo(ZenTweaksPanelInner);

// IDENTITY_SEAL: ZenTweaksPanel | role=zen-tweaks-FAB-panel | inputs=language+zenActive | outputs=CSS-variables + localStorage
