'use client';

// ============================================================
// WorldGraphEditor — 인터랙티브 그래프 에디터 (Batch 3 rank 3 · 2026-06-07)
// 격리: src/lib/worldgraph/{types,fill,validate,worldfact-serializer} 직접 사용.
//        studio-types.ts(절대 금지 8파일) import 0.
// 의존: SVG + drag (외부 graph 라이브러리 0) + localStorage 영속.
// 흐름: 채팅 → fill() → 노드 추가 → drag 배치 → 관계(conflictsWith) 엣지 → validate() 인라인.
// ============================================================

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ShieldCheck, Plus, Trash2, Link2, AlertCircle, Check, Network } from 'lucide-react';
import { localFillDraft, commitAsCanon } from '@/lib/worldgraph/fill';
import { validateWorldFact } from '@/lib/worldgraph/validate';
import { showAlert } from '@/lib/show-alert';
import { WorldGraphCanvas } from './WorldGraphEditor.canvas';
import {
  CATEGORY_COLOR,
  DEFAULT_COLOR,
  KEYBOARD_STEP,
  bindStudioTone,
  clamp01,
  cssEscape,
  deriveEdges,
  loadNodes,
  saveNodes,
  summarizeValidation,
  type GraphNode,
  type NodePos,
  type WorldGraphEditorProps,
} from './WorldGraphEditor.model';

export { deriveEdges, serializeGraphToMarkdown, summarizeValidation } from './WorldGraphEditor.model';
export type { GraphEdge, GraphNode, NodePos, WorldGraphEditorProps } from './WorldGraphEditor.model';

// ============================================================
// PART 4 — Component
// ============================================================

const WorldGraphEditor: React.FC<WorldGraphEditorProps> = ({ workId, initialNodes, onChange }) => {
  const [nodes, setNodes] = useState<GraphNode[]>(() => {
    if (initialNodes && initialNodes.length) return initialNodes;
    return loadNodes(workId);
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  const [chat, setChat] = useState('');
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ── 영속 (workId 버저닝) ──────────────────────────────
  // [P12 풀점검 루프 3] workId 전환 직후의 stale write 방어.
  // useEffect closure 가 workId 를 캡처하므로 각 effect 호출은 자신의 workId 만 사용.
  // 추가로 latestWorkIdRef 체크 — 동기 setItem 직전에 workId 가 변경됐으면 폐기.
  // (현재 React 18 batching 에선 effect 재호출이 동기 일어나므로 이중 안전망.)
  //
  // [P1 루프2/Senior architect] Ref-in-render 위반 수리 (2026-06-08):
  //   React 18 concurrency / StrictMode 더블 렌더 시 ref 할당이 두 번 일어나도
  //   useLayoutEffect 는 commit 단계에서만 실행되어 안전. 또한 commit 전 read 에
  //   대해 latestWorkIdRef.current 는 직전 commit 의 workId 를 반환 (의도된 동작).
  const latestWorkIdRef = useRef(workId);
  useLayoutEffect(() => {
    latestWorkIdRef.current = workId;
  }, [workId]);

  // [P3 low/reliability 2026-06-09] quota 경고 1회만 — 매 변경마다 토스트 스팸 방지.
  // 저장 성공으로 복구되면 다시 1회 경고 가능하도록 리셋.
  const quotaWarnedRef = useRef(false);

  useEffect(() => {
    const targetWorkId = workId;
    if (latestWorkIdRef.current !== targetWorkId) return;
    const saved = saveNodes(targetWorkId, nodes);
    if (saved) {
      quotaWarnedRef.current = false;
    } else if (!quotaWarnedRef.current) {
      quotaWarnedRef.current = true;
      showAlert('localStorage 용량 초과 — 그래프 저장 실패. 브라우저 캐시를 정리하거나 노드를 줄이세요.', 'error');
    }
    onChange?.(nodes);
  }, [nodes, workId, onChange]);

  // ── 노드 추가 (chat → fill) ────────────────────────────
  const handleAddFromChat = useCallback(() => {
    const text = chat.trim();
    if (!text) return;
    const draft = localFillDraft(text, { workId });
    // 기본 위치: 중앙 근처, 약간 흩뿌리기 (충돌 방지)
    const seed = (nodes.length * 0.13) % 1;
    const newNode: GraphNode = {
      entry: draft,
      pos: { x: 0.2 + seed * 0.6, y: 0.2 + ((nodes.length * 0.17) % 0.6) },
    };
    setNodes((prev) => [...prev, newNode]);
    setChat('');
    setSelectedId(draft.frontMatter.id);
  }, [chat, workId, nodes.length]);

  // ── 노드 삭제 ──────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    // [P2 low/correctness 2026-06-09] 키보드 포커스 관리:
    //   삭제 노드의 다음 형제(없으면 이전, 둘 다 없으면 SVG 컨테이너)로 포커스 이동.
    //   키보드 전용 사용자가 삭제 후 Tab/화살표 내비를 잃지 않도록 — WCAG 2.4.3.
    //   [correctness] nextFocusId 는 setNodes 업데이터 밖(현재 렌더 snapshot)에서 계산 —
    //   업데이터 내부 계산은 React 배치로 setSelectedId 시점에 stale 가능.
    const idx = nodes.findIndex((n) => n.entry.frontMatter.id === id);
    const sibling = idx >= 0 ? (nodes[idx + 1] ?? nodes[idx - 1] ?? null) : null;
    const nextFocusId: string | null = sibling ? sibling.entry.frontMatter.id : null;

    setNodes((prev) =>
      prev
        .filter((n) => n.entry.frontMatter.id !== id)
        .map((n) => ({
          ...n,
          entry: {
            ...n.entry,
            frontMatter: {
              ...n.entry.frontMatter,
              conflictsWith: (n.entry.frontMatter.conflictsWith ?? []).filter((c) => c !== id),
            },
          },
        })),
    );
    if (selectedId === id) setSelectedId(nextFocusId);
    if (linkFromId === id) setLinkFromId(null);
    // DOM 포커스 이동은 다음 렌더 후(노드 제거 반영) — rAF 로 commit 이후 보장.
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const target = nextFocusId
          ? svg.querySelector<SVGGElement>(`[data-testid="worldgraph-node-${cssEscape(nextFocusId)}"]`)
          : null;
        if (target) target.focus();
        else svg.focus();
      });
    }
  }, [nodes, selectedId, linkFromId]);

  // ── 캐논 확정 (origin USER) ────────────────────────────
  const handleCommit = useCallback((id: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.entry.frontMatter.id === id ? { ...n, entry: commitAsCanon(n.entry) } : n)),
    );
  }, []);

  // ── 관계(엣지) 추가/제거 ───────────────────────────────
  const handleStartLink = useCallback((id: string) => {
    setLinkFromId((prev) => (prev === id ? null : id));
  }, []);

  const handleFinishLink = useCallback((toId: string) => {
    if (!linkFromId || linkFromId === toId) {
      setLinkFromId(null);
      return;
    }
    setNodes((prev) =>
      prev.map((n) => {
        if (n.entry.frontMatter.id !== linkFromId) return n;
        const current = n.entry.frontMatter.conflictsWith ?? [];
        if (current.includes(toId)) return n; // 이미 연결됨
        return {
          ...n,
          entry: {
            ...n.entry,
            frontMatter: { ...n.entry.frontMatter, conflictsWith: [...current, toId] },
          },
        };
      }),
    );
    setLinkFromId(null);
  }, [linkFromId]);

  const handleRemoveEdge = useCallback((fromId: string, toId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.entry.frontMatter.id !== fromId && n.entry.frontMatter.id !== toId) return n;
        const otherId = n.entry.frontMatter.id === fromId ? toId : fromId;
        return {
          ...n,
          entry: {
            ...n.entry,
            frontMatter: {
              ...n.entry.frontMatter,
              conflictsWith: (n.entry.frontMatter.conflictsWith ?? []).filter((c) => c !== otherId),
            },
          },
        };
      }),
    );
  }, []);

  // ── Drag (svg coord → 0..1 normalize) ──────────────────
  const svgPoint = useCallback((evt: React.PointerEvent<SVGElement>): NodePos => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const px = (evt.clientX - rect.left) / rect.width;
    const py = (evt.clientY - rect.top) / rect.height;
    return { x: clamp01(px), y: clamp01(py) };
  }, []);

  const handlePointerDown = useCallback((evt: React.PointerEvent<SVGGElement>, id: string) => {
    evt.stopPropagation();
    if (linkFromId) {
      handleFinishLink(id);
      return;
    }
    const node = nodes.find((n) => n.entry.frontMatter.id === id);
    if (!node) return;
    const pt = svgPoint(evt);
    dragRef.current = { id, offsetX: pt.x - node.pos.x, offsetY: pt.y - node.pos.y };
    setSelectedId(id);
    (evt.currentTarget as SVGGElement).setPointerCapture(evt.pointerId);
  }, [nodes, svgPoint, linkFromId, handleFinishLink]);

  const handlePointerMove = useCallback((evt: React.PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pt = svgPoint(evt);
    const nextPos = {
      x: clamp01(pt.x - drag.offsetX),
      y: clamp01(pt.y - drag.offsetY),
    };
    setNodes((prev) =>
      prev.map((n) =>
        n.entry.frontMatter.id === drag.id ? { ...n, pos: nextPos } : n,
      ),
    );
  }, [svgPoint]);

  const handlePointerUp = useCallback((evt: React.PointerEvent<SVGGElement>) => {
    if (dragRef.current) {
      try {
        (evt.currentTarget as SVGGElement).releasePointerCapture(evt.pointerId);
      } catch {
        // 캡처 해제 실패 무시 — 일부 환경 미지원
      }
    }
    dragRef.current = null;
  }, []);

  // ============================================================
  // PART 4.5 — Keyboard a11y (2026-06-08 priority 4, WCAG 2.1.1 Level A)
  //   Arrow ±0.02 (≈ 8px on 800×500 canvas) 노드 이동
  //   'e'         → 선택 노드 기준 edge 모드 토글 (handleStartLink)
  //   'Delete'    → 선택 노드 삭제
  //   'Enter'/'Space' → 선택 (focus 시 자동), edge target 확정
  // ============================================================
  const handleNodeKeyDown = useCallback((evt: React.KeyboardEvent<SVGGElement>, id: string) => {
    // Arrow 키 — 이동 (양방향 노드는 0..1 clamp)
    const moveTo = (dx: number, dy: number) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.entry.frontMatter.id === id
            ? { ...n, pos: { x: clamp01(n.pos.x + dx), y: clamp01(n.pos.y + dy) } }
            : n,
        ),
      );
      setSelectedId(id);
    };
    switch (evt.key) {
      case 'ArrowLeft':
        evt.preventDefault(); evt.stopPropagation();
        moveTo(-KEYBOARD_STEP, 0);
        return;
      case 'ArrowRight':
        evt.preventDefault(); evt.stopPropagation();
        moveTo(KEYBOARD_STEP, 0);
        return;
      case 'ArrowUp':
        evt.preventDefault(); evt.stopPropagation();
        moveTo(0, -KEYBOARD_STEP);
        return;
      case 'ArrowDown':
        evt.preventDefault(); evt.stopPropagation();
        moveTo(0, KEYBOARD_STEP);
        return;
      case 'e':
      case 'E':
        evt.preventDefault(); evt.stopPropagation();
        // edge from-mode 토글 또는 target 확정
        if (linkFromId && linkFromId !== id) {
          handleFinishLink(id);
        } else {
          handleStartLink(id);
        }
        return;
      case 'Delete':
      case 'Backspace':
        evt.preventDefault(); evt.stopPropagation();
        handleDelete(id);
        return;
      case 'Enter':
      case ' ':
        evt.preventDefault(); evt.stopPropagation();
        // edge target 확정 모드일 때만 link, 그 외에는 단순 선택
        if (linkFromId && linkFromId !== id) {
          handleFinishLink(id);
        } else {
          setSelectedId(id);
        }
        return;
      default:
        return;
    }
  }, [linkFromId, handleFinishLink, handleStartLink, handleDelete]);

  // ── 파생값 (memo) ──────────────────────────────────────
  const edges = useMemo(() => deriveEdges(nodes), [nodes]);
  const summary = useMemo(() => summarizeValidation(nodes), [nodes]);
  const selectedNode = useMemo(
    () => nodes.find((n) => n.entry.frontMatter.id === selectedId) ?? null,
    [nodes, selectedId],
  );
  const selectedValidation = useMemo(
    () => (selectedNode ? validateWorldFact(selectedNode.entry) : null),
    [selectedNode],
  );

  return (
    <div className="flex flex-col gap-[var(--sp-md)] rounded-xl border border-border bg-bg-secondary/60 p-[var(--sp-md)]">
      {/* ── 헤더 ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-accent-amber" aria-hidden />
          <h3 className="text-sm font-semibold text-text-primary">세계관 그래프 에디터</h3>
          <span className="rounded-full bg-bg-primary/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
            {nodes.length} 노드 · {edges.length} 엣지
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
              summary.blocking === 0
                ? 'bg-accent-green/15 text-accent-green'
                : 'bg-accent-red/15 text-accent-red'
            }`}
            aria-live="polite"
          >
            {summary.blocking === 0 ? <Check className="h-3 w-3" aria-hidden /> : <AlertCircle className="h-3 w-3" aria-hidden />}
            {summary.blocking === 0 ? '정합 통과' : `${summary.blocking} 노드 모순`}
          </span>
        </div>
      </div>

      {/* ── 입력 (chat → fill) ───────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddFromChat();
            }
          }}
          placeholder="세계관 fact 한 문장. 예: 마법은 마나를 소비한다."
          className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          aria-label="세계관 fact 입력"
        />
        <button
          type="button"
          onClick={handleAddFromChat}
          disabled={!chat.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-accent-amber/40 bg-accent-amber/15 px-4 text-sm font-semibold text-accent-amber disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <Sparkles className="h-4 w-4" aria-hidden /> 노아 채움
        </button>
      </div>

      <WorldGraphCanvas
        nodes={nodes}
        edges={edges}
        perNode={summary.perNode}
        selectedId={selectedId}
        linkFromId={linkFromId}
        svgRef={svgRef}
        onRemoveEdge={handleRemoveEdge}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onNodeKeyDown={handleNodeKeyDown}
        onSelectNode={setSelectedId}
      />

      {/* ── 선택 노드 인스펙터 ───────────────────────── */}
      {selectedNode && selectedValidation && (
        <div className="rounded-lg border border-border bg-bg-primary p-[var(--sp-sm)]" data-testid="worldgraph-inspector">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary">선택: {selectedNode.entry.frontMatter.id}</span>
              <span
                ref={(node) => bindStudioTone(node, CATEGORY_COLOR[selectedNode.entry.frontMatter.category] ?? DEFAULT_COLOR)}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold studio-tone-pill-soft"
              >
                {selectedNode.entry.frontMatter.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStartLink(selectedNode.entry.frontMatter.id)}
                className={`inline-flex min-h-[36px] items-center gap-1 rounded-md border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
                  linkFromId === selectedNode.entry.frontMatter.id
                    ? 'border-accent-amber bg-accent-amber/20 text-accent-amber'
                    : 'border-border bg-bg-secondary text-text-secondary hover:border-accent-amber/60'
                }`}
                aria-pressed={linkFromId === selectedNode.entry.frontMatter.id}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden /> {linkFromId === selectedNode.entry.frontMatter.id ? '대상 노드 선택…' : '관계 추가'}
              </button>
              <button
                type="button"
                onClick={() => handleCommit(selectedNode.entry.frontMatter.id)}
                disabled={selectedNode.entry.provenance?.origin === 'USER'}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-accent-green/40 bg-accent-green/10 px-3 text-xs font-semibold text-accent-green disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {selectedNode.entry.provenance?.origin === 'USER' ? 'Canon' : '확정'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selectedNode.entry.frontMatter.id)}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-accent-red/30 bg-bg-secondary px-3 text-xs font-semibold text-accent-red hover:bg-accent-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> 삭제
              </button>
            </div>
          </div>

          <p className="mt-2 text-sm text-text-primary">{selectedNode.entry.frontMatter.fact}</p>

          {selectedValidation.violations.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-[11px]">
              {selectedValidation.violations.slice(0, 6).map((v, i) => (
                <li
                  key={`${v.ruleId}-${i}`}
                  className={`flex items-center gap-1.5 ${
                    v.severity === 'block' || v.severity === 'high' ? 'text-accent-red' : 'text-accent-amber'
                  }`}
                >
                  <AlertCircle className="h-3 w-3" aria-hidden />
                  <span className="font-mono uppercase tracking-wider">{v.severity}</span>
                  <span>{v.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-accent-green">검증 통과 · confidence {selectedValidation.confidenceGate}</p>
          )}
        </div>
      )}

      {/* ── 도움말 + serialize 미리보기 트리거 ───────── */}
      {linkFromId && (
        <div className="flex items-center gap-2 rounded-md border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 text-[11px] text-accent-amber">
          <Plus className="h-3 w-3" aria-hidden />
          관계 연결 모드 — 대상 노드를 클릭(또는 Tab→Enter)하세요. 같은 노드 재클릭 시 취소.
        </div>
      )}
      {/* [priority 4 — 2026-06-08] 키보드 조작 안내 — 스크린리더와 시각 사용자 모두 인지. */}
      {nodes.length > 0 && (
        <div className="text-[10px] text-text-tertiary font-mono">
          키보드: Tab 노드 이동 · 화살표 ±위치 · E 관계 토글 · Delete 삭제 · Enter 선택/확정
        </div>
      )}
    </div>
  );
};

export default WorldGraphEditor;
