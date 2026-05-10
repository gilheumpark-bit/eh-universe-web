// ============================================================
// PART 1 — Module Header
// ============================================================
//
// breakpoint-gutter.ts — Tiptap extension. 본문 좌측 거터 클릭 → BP 토글.
//
// 구현 방식:
//   1. ProseMirror Plugin 으로 paragraph node 좌측에 빨강 점 decoration 추가 (활성 BP 위치)
//   2. handleClick (event) 이 거터 zone(좌측 24px) 내 클릭이면 paragraph offset 추출 → CustomEvent dispatch
//   3. StudioShell 등 listener 가 episodeId 알고 있으면 setBreakpoint 호출
//
// CustomEvent: 'noa:bp-toggle-request' { paragraphIdx }
//
// [C] BP 0개 시 decoration 0건 / [G] doc 변경 시만 재계산 / [K] visual gutter 만
// ============================================================

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Breakpoint } from '@/lib/story-debugger/types';

export const breakpointGutterKey = new PluginKey<DecorationSet>('breakpoint-gutter');

export interface BreakpointGutterOptions {
  /** 현재 episode 의 breakpoints — paragraphIdx 기반 */
  breakpoints: Breakpoint[];
  /** 거터 클릭 zone (좌측 px) — 기본 24 */
  gutterWidth?: number;
}

// ============================================================
// PART 2 — Decoration builder
// ============================================================

function buildDecorations(
  doc: import('@tiptap/pm/model').Node,
  breakpoints: Breakpoint[],
): DecorationSet {
  if (breakpoints.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  const paragraphPositions: number[] = []; // 각 paragraph 시작 pos

  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph') {
      paragraphPositions.push(pos);
    }
  });

  for (const bp of breakpoints) {
    if (!bp.enabled) continue;
    const pos = paragraphPositions[bp.location.paragraphIdx];
    if (pos === undefined) continue;
    decorations.push(
      Decoration.node(pos, pos + 1, {
        class: 'bp-gutter-active',
        'data-bp-id': bp.id,
      }),
    );
  }

  return DecorationSet.create(doc, decorations);
}

// ============================================================
// PART 3 — Extension
// ============================================================

export const BreakpointGutterExtension = Extension.create<BreakpointGutterOptions>({
  name: 'breakpointGutter',

  addOptions() {
    return {
      breakpoints: [],
      gutterWidth: 24,
    };
  },

  addProseMirrorPlugins() {
    // [Tiptap pattern] this 캡처 필수 — addProseMirrorPlugins 는 일반 함수 (this 컨텍스트 필요).
    // Plugin 콜백 안에서 this.options 접근하기 위함. 화살표 함수 변환 불가.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ext = this;
    return [
      new Plugin<DecorationSet>({
        key: breakpointGutterKey,
        state: {
          init: (_, { doc }) => buildDecorations(doc, ext.options.breakpoints),
          apply: (tr, oldSet) => {
            if (!tr.docChanged) return oldSet.map(tr.mapping, tr.doc);
            return buildDecorations(tr.doc, ext.options.breakpoints);
          },
        },
        props: {
          decorations(state) {
            return breakpointGutterKey.getState(state);
          },
          handleClick(view, _pos, event) {
            const target = event.target as HTMLElement | null;
            if (!target) return false;
            const editorRect = view.dom.getBoundingClientRect();
            const offsetX = event.clientX - editorRect.left;
            const gutterWidth = ext.options.gutterWidth ?? 24;
            if (offsetX > gutterWidth) return false; // 거터 밖 클릭 — 무시

            // paragraph 인덱스 추출 — closest paragraph node
            const closestPara = target.closest('p');
            if (!closestPara) return false;
            const allParas = Array.from(view.dom.querySelectorAll('p'));
            const paragraphIdx = allParas.indexOf(closestPara);
            if (paragraphIdx < 0) return false;

            // CustomEvent dispatch
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('noa:bp-toggle-request', {
                  detail: { paragraphIdx },
                }),
              );
            }
            return true;
          },
        },
      }),
    ];
  },
});

export default BreakpointGutterExtension;
