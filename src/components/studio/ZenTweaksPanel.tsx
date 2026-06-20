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
// [R7-B fix 정합 — 2026-05-12] CSS class 의존 0 → Tailwind @layer cascade 회피.
// createPortal로 body 직계 mount → ancestor 영향 0.
//
// [C] SSR-safe (typeof window + portal target useState)
// [G] localStorage write throttle (slider 드래그 시 매 frame 쓰기 방지) — debounce 300ms
// [K] 4언어 라벨 + 단일 component

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// 색 토큰 — Doc 5 spec. 100% inline (CSS class 회피).
const COL = {
  fg1: 'var(--color-text-primary, #f4f0ea)',
  fg2: 'var(--color-text-secondary, #b5ac9d)',
  fg3: 'var(--color-text-tertiary, #948a7c)',
  fg4: 'var(--color-text-quaternary, #5a5347)',
  bg1: 'var(--color-bg-primary, #11100e)',
  bg2: 'var(--color-bg-secondary, #1a1816)',
  bg3: 'var(--color-bg-tertiary, #242018)',
  border: 'var(--color-border, #2f2c26)',
  borderStrong: 'var(--color-border-strong, #3a352c)',
  amber: 'var(--color-accent-amber, #b8955c)',
  amberLight: 'var(--color-accent-amber-2, #caa15c)',
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
  // PART 4.1 — Inline styles
  // ============================================================
  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 48,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: COL.bg2,
    border: `1px solid ${COL.borderStrong}`,
    color: COL.fg2,
    cursor: 'pointer',
    display: open ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    zIndex: 48,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'inherit',
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 48,
    right: 24,
    width: 300,
    background: 'rgba(20, 18, 16, 0.96)',
    border: `1px solid ${COL.borderStrong}`,
    borderRadius: 10,
    boxShadow: '0 24px 72px rgba(0,0,0,0.5)',
    zIndex: 50,
    backdropFilter: 'blur(20px)',
    opacity: open ? 1 : 0,
    transform: open ? 'translateY(0)' : 'translateY(8px)',
    pointerEvents: open ? 'auto' : 'none',
    transition: 'opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'var(--font-sans, "IBM Plex Sans", "Noto Sans KR", system-ui, sans-serif)',
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: `1px solid ${COL.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display, "Cormorant Garamond", "Noto Serif KR", serif)',
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: COL.fg1,
  };

  const closeBtnStyle: React.CSSProperties = {
    cursor: 'pointer',
    color: COL.fg3,
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    fontSize: 14,
    background: 'transparent',
    border: 0,
    padding: '4px 8px',
    lineHeight: 1,
  };

  const bodyStyle: React.CSSProperties = { padding: '14px 16px 18px' };

  const rowStyle: React.CSSProperties = { marginBottom: 14 };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    fontSize: 9,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: COL.fg3,
    marginBottom: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const labelValStyle: React.CSSProperties = {
    color: COL.amberLight,
    fontSize: 10,
    letterSpacing: '0.06em',
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: COL.amber,
    height: 4,
  };

  const segContainerStyle: React.CSSProperties = {
    display: 'flex',
    background: COL.bg3,
    borderRadius: 6,
    padding: 2,
    gap: 2,
  };

  const segBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? COL.bg1 : 'transparent',
    border: 0,
    color: active ? COL.amber : COL.fg3,
    boxShadow: active ? `inset 0 0 0 1px ${COL.borderStrong}` : 'none',
    padding: 6,
    borderRadius: 4,
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  });

  const toggleStyle = (): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    padding: '4px 0',
  });

  const swStyle = (on: boolean): React.CSSProperties => ({
    width: 34,
    height: 18,
    background: on ? 'rgba(184, 149, 92, 0.3)' : COL.bg3,
    borderRadius: 9999,
    position: 'relative',
    border: `1px solid ${on ? COL.amber : COL.borderStrong}`,
    transition: 'background 200ms ease',
  });

  const swDotStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute',
    left: on ? 18 : 2,
    top: 1,
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: on ? COL.amber : COL.fg2,
    transition: 'all 200ms ease',
  });

  // ============================================================
  // PART 4.2 — Render (Portal to body)
  // ============================================================
  return createPortal((
    <>
      <button
        type="button"
        style={fabStyle}
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
        ⚙
      </button>

      <div
        style={panelStyle}
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
        <div style={headerStyle}>
          <div style={titleStyle}>
            {L4(language, { ko: '조정', en: 'Tweaks', ja: '調整', zh: '调节' })}
          </div>
          <button
            type="button"
            style={closeBtnStyle}
            onClick={() => setOpen(false)}
            aria-label={L4(language, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' })}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          {/* 본문 크기 */}
          <div style={rowStyle}>
            <div style={labelStyle}>
              <span>{L4(language, { ko: '본문 크기', en: 'Font size', ja: '文字サイズ', zh: '字号' })}</span>
              <span style={labelValStyle}>{tweaks.fontSize}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={22}
              step={1}
              value={tweaks.fontSize}
              onChange={(e) => update('fontSize', Number(e.target.value))}
              style={sliderStyle}
              aria-label={L4(language, { ko: '본문 크기', en: 'Font size', ja: '文字サイズ', zh: '字号' })}
            />
          </div>

          {/* 행간 */}
          <div style={rowStyle}>
            <div style={labelStyle}>
              <span>{L4(language, { ko: '행간', en: 'Line height', ja: '行間', zh: '行距' })}</span>
              <span style={labelValStyle}>{tweaks.lineHeight.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={2.2}
              step={0.05}
              value={tweaks.lineHeight}
              onChange={(e) => update('lineHeight', Number(e.target.value))}
              style={sliderStyle}
              aria-label={L4(language, { ko: '행간', en: 'Line height', ja: '行間', zh: '行距' })}
            />
          </div>

          {/* 본문 폭 */}
          <div style={rowStyle}>
            <div style={labelStyle}>
              <span>{L4(language, { ko: '본문 폭', en: 'Width', ja: '本文幅', zh: '正文宽' })}</span>
              <span style={labelValStyle}>{tweaks.widthEm}em</span>
            </div>
            <input
              type="range"
              min={30}
              max={48}
              step={1}
              value={tweaks.widthEm}
              onChange={(e) => update('widthEm', Number(e.target.value))}
              style={sliderStyle}
              aria-label={L4(language, { ko: '본문 폭', en: 'Width', ja: '本文幅', zh: '正文宽' })}
            />
          </div>

          {/* 드롭 캡 toggle */}
          <div style={rowStyle}>
            <button
              type="button"
              style={{ ...toggleStyle(), background: 'transparent', border: 0, width: '100%', textAlign: 'left' }}
              onClick={() => update('dropCap', !tweaks.dropCap)}
              aria-pressed={tweaks.dropCap}
            >
              <span style={{ fontSize: 13, color: COL.fg1 }}>
                {L4(language, { ko: '첫 글자 amber', en: 'Drop cap amber', ja: '頭文字 amber', zh: '首字 amber' })}
              </span>
              <span style={swStyle(tweaks.dropCap)}>
                <span style={swDotStyle(tweaks.dropCap)} />
              </span>
            </button>
          </div>

          {/* 심볼 표시 toggle */}
          <div style={rowStyle}>
            <button
              type="button"
              style={{ ...toggleStyle(), background: 'transparent', border: 0, width: '100%', textAlign: 'left' }}
              onClick={() => update('symbolDeco', !tweaks.symbolDeco)}
              aria-pressed={tweaks.symbolDeco}
            >
              <span style={{ fontSize: 13, color: COL.fg1 }}>
                {L4(language, { ko: '인물 underline', en: 'Symbol underline', ja: '人物 underline', zh: '人物 underline' })}
              </span>
              <span style={swStyle(tweaks.symbolDeco)}>
                <span style={swDotStyle(tweaks.symbolDeco)} />
              </span>
            </button>
          </div>

          {/* 배경 모드 segment */}
          <div style={rowStyle}>
            <div style={labelStyle}>
              <span>{L4(language, { ko: '밤 모드', en: 'Background', ja: '背景モード', zh: '背景' })}</span>
            </div>
            <div style={segContainerStyle}>
              <button
                type="button"
                style={segBtnStyle(tweaks.bgMode === 'night')}
                onClick={() => update('bgMode', 'night')}
                aria-pressed={tweaks.bgMode === 'night'}
              >
                {L4(language, { ko: '밤', en: 'Night', ja: '夜', zh: '夜' })}
              </button>
              <button
                type="button"
                style={segBtnStyle(tweaks.bgMode === 'paper')}
                onClick={() => update('bgMode', 'paper')}
                aria-pressed={tweaks.bgMode === 'paper'}
              >
                {L4(language, { ko: '원고지', en: 'Paper', ja: '原稿用紙', zh: '稿纸' })}
              </button>
              <button
                type="button"
                style={segBtnStyle(tweaks.bgMode === 'midnight')}
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
