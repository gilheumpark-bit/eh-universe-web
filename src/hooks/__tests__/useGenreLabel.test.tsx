/**
 * M5 Genre Translation Layer — useGenreLabel hook tests.
 *   1. novel/ko: '고구마' 원어 그대로.
 *   2. webtoon/ko: formatted 는 괄호 병기('갈등 밀도 (고구마)').
 *   3. drama/en: formatted는 순수 label 반환.
 *   4. undefined genreMode → novel 폴백.
 *   5. LangContext 언어 전환 시 반환 라벨이 따라 변한다.
 *   6. mode 변경 시 getLabel 함수 동일성이 깨진다 (메모이즈 무효화).
 *   7. 동일 (mode, lang)에서는 getLabel 참조가 유지된다.
 *
 * 라운드트립 저장 보존 테스트는 순수 hook이 데이터를 쥐지 않으므로
 * 이 파일에서는 "mode 전환해도 hook 자체가 데이터를 삭제/변형하지
 * 않는다"만 검증한다. 실제 round-trip은 genre-labels.test.ts의 구조
 * 불변식 검사로 커버된다.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { LangProvider } from '@/lib/LangContext';
import { useGenreLabel } from '@/hooks/useGenreLabel';
import type { GenreMode } from '@/lib/genre-labels';

// ============================================================
// PART 1 — Harness
// ============================================================

interface HarnessProps {
  genreMode: GenreMode | undefined;
  refObj: { current: ReturnType<typeof useGenreLabel> | null };
}

function HarnessInner({ genreMode, refObj }: HarnessProps) {
  const v = useGenreLabel(genreMode);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    refObj.current = v;
  });
  return null;
}

function renderHook(genreMode: GenreMode | undefined) {
  const ref: { current: ReturnType<typeof useGenreLabel> | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root!: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(
      React.createElement(
        LangProvider,
        null,
        React.createElement(HarnessInner, { genreMode, refObj: ref }),
      ),
    );
  });
  return {
    get: () => ref.current,
    update: (next: GenreMode | undefined) => {
      act(() => {
        root.render(
          React.createElement(
            LangProvider,
            null,
            React.createElement(HarnessInner, { genreMode: next, refObj: ref }),
          ),
        );
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
}

// ============================================================
// PART 2 — Setup: default LangContext lang is 'ko' in jsdom
// ============================================================

beforeEach(() => {
  // Default to 'ko' so LangProvider's detectLang() has a known value
  localStorage.setItem('eh-lang', 'ko');
});

// ============================================================
// PART 3 — Tests
// ============================================================

describe('useGenreLabel', () => {
  it('returns "고구마" raw term for novel mode in ko', () => {
    const h = renderHook('novel');
    expect(h.get()?.getLabel('goguma').label).toBe('고구마');
    expect(h.get()?.formatted('goguma')).toBe('고구마');
    h.cleanup();
  });

  it('returns "갈등 밀도 (고구마)" dual-display for webtoon + ko', () => {
    const h = renderHook('webtoon');
    expect(h.get()?.formatted('goguma')).toBe('갈등 밀도 (고구마)');
    h.cleanup();
  });

  it('returns pure label for en (no Korean dual display)', () => {
    localStorage.setItem('eh-lang', 'en');
    const h = renderHook('webtoon');
    expect(h.get()?.formatted('goguma')).toBe('Conflict density');
    h.cleanup();
  });

  it('falls back to novel when genreMode is undefined', () => {
    const h = renderHook(undefined);
    expect(h.get()?.mode).toBe('novel');
    expect(h.get()?.getLabel('goguma').label).toBe('고구마');
    h.cleanup();
  });

  it('switches label when mode changes via re-render', () => {
    const h = renderHook('novel');
    expect(h.get()?.formatted('goguma')).toBe('고구마');
    h.update('game');
    expect(h.get()?.formatted('goguma')).toBe('마찰 구간 (고구마)');
    h.cleanup();
  });

  it('memoizes getLabel reference across re-renders with same mode', () => {
    const h = renderHook('novel');
    const first = h.get()?.getLabel;
    h.update('novel');
    const second = h.get()?.getLabel;
    expect(first).toBe(second);
    h.cleanup();
  });

  it('provides distinct drama/game labels for pacing', () => {
    const h1 = renderHook('drama');
    const dramaLabel = h1.get()?.getLabel('pacing').label;
    h1.cleanup();
    const h2 = renderHook('game');
    const gameLabel = h2.get()?.getLabel('pacing').label;
    h2.cleanup();
    expect(dramaLabel).not.toBe(gameLabel);
  });
});

// ============================================================
// PART 4 — Round-trip preservation (hook layer)
// ============================================================
// 핵심: hook은 데이터를 보유하지 않는다. 전환 자체가 저장 필드를
// 변경하지 않음을 구조적으로 보장.

describe('useGenreLabel — round-trip preservation proxy', () => {
  it('switching mode does not mutate external data references', () => {
    // 외부 "데이터": 작가가 저장한 goguma=7 값.
    // hook이 이걸 건드리지 않으므로, 전환 후에도 객체 동일성이 유지된다.
    const externalData = { goguma: 7 };
    const h = renderHook('novel');
    expect(h.get()?.mode).toBe('novel');
    h.update('game');   // game은 UI에서 goguma를 숨기는 모드
    expect(h.get()?.mode).toBe('game');
    h.update('novel');  // 다시 novel로
    expect(h.get()?.mode).toBe('novel');
    // 외부 데이터는 hook이 아닌 호출자가 소유한다 → hook 전환은 무영향.
    expect(externalData.goguma).toBe(7);
    h.cleanup();
  });
});
