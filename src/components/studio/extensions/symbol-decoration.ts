// ============================================================
// PART 1 — Module Header & Imports
// ============================================================
//
// Tiptap Extension — 본문 내 Symbol 등장 위치 underline + hover 트리거.
//
// 동작:
//   1. ProseMirror Plugin 으로 Decoration 적용
//   2. SymbolIndex.surfaceMap 의 표면형 매칭 → 점선 underline
//   3. data-symbol-id 속성으로 hover handler 부착
//   4. 본문 변경 시 자동 재계산 (debounce)
//
// 격리:
//   - ManuscriptView.tsx 0byte (본 plugin 은 NovelEditor extensions 에 register)
//   - 외부 의존성: tiptap/core + tiptap/pm/state + symbol-index/types
//
// [C] surfaceMap 비어있으면 데코레이션 0건 (no-op)
// [G] 변경 doc 만 재스캔 — 텍스트 길이 N, surfaces ≤500 가정
// [K] decoration class 만 적용 — 색상/스타일은 CSS
// ============================================================

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { SymbolIndex } from '@/lib/symbol-index/types';

// ============================================================
// PART 2 — Plugin key & options
// ============================================================

export const symbolDecorationKey = new PluginKey<DecorationSet>('symbol-decoration');

export interface SymbolDecorationOptions {
  /** SymbolIndex — 호출 측 (NovelEditor) 가 useSymbolIndex 결과 주입 */
  index: SymbolIndex;
  /** 데코레이션 CSS class (기본 'symbol-deco') */
  className?: string;
}

// ============================================================
// PART 3 — Helpers
// ============================================================

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex(index: SymbolIndex): RegExp | null {
  if (index.surfaceMap.size === 0) return null;
  const surfaces = Array.from(index.surfaceMap.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  return new RegExp(`(${surfaces.join('|')})`, 'g');
}

/** doc → DecorationSet */
function buildDecorations(
  doc: import('@tiptap/pm/model').Node,
  index: SymbolIndex,
  className: string,
): DecorationSet {
  const re = buildRegex(index);
  if (!re) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const surface = m[1];
      const symbolId = index.surfaceMap.get(surface);
      if (!symbolId) continue;
      const from = pos + m.index;
      const to = from + surface.length;
      decorations.push(
        Decoration.inline(from, to, {
          class: className,
          'data-symbol-id': symbolId,
          'data-surface': surface,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

// ============================================================
// PART 4 — Extension
// ============================================================

export const SymbolDecorationExtension = Extension.create<SymbolDecorationOptions>({
  name: 'symbolDecoration',

  addOptions() {
    return {
      // [C] 안전 기본값 — 빈 index
      index: {
        definitions: new Map(),
        surfaceMap: new Map(),
        byKind: { character: [], place: [], item: [], concept: [], event: [] },
        manuscriptHash: 'empty',
        builtAt: new Date(0).toISOString(),
      },
      className: 'symbol-deco',
    };
  },

  addProseMirrorPlugins() {
    // [Tiptap pattern] this 캡처 필수 — Plugin 콜백 안에서 this.options.{index,className} 접근.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ext = this;
    return [
      new Plugin<DecorationSet>({
        key: symbolDecorationKey,
        state: {
          init: (_, { doc }) =>
            buildDecorations(doc, ext.options.index, ext.options.className ?? 'symbol-deco'),
          apply: (tr, oldSet) => {
            // doc 변경 또는 옵션 변경 시 재빌드
            if (!tr.docChanged) return oldSet.map(tr.mapping, tr.doc);
            return buildDecorations(
              tr.doc,
              ext.options.index,
              ext.options.className ?? 'symbol-deco',
            );
          },
        },
        props: {
          decorations(state) {
            return symbolDecorationKey.getState(state);
          },
        },
      }),
    ];
  },
});

export default SymbolDecorationExtension;
