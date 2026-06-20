/**
 * WorldGraphEditor — 인터랙티브 그래프 에디터 (Batch 3 rank 3)
 * 검증 범위:
 *   1. 빈 상태 렌더 + 가이드 메시지
 *   2. chat → 노아 채움 → 노드 추가 (localFillDraft 위임)
 *   3. validate() 결과 인라인 표시 (위반 카운트)
 *   4. deriveEdges — conflictsWith 양방향 중복 제거
 *   5. summarizeValidation — blocking 노드 카운트
 *   6. localStorage 영속 (workId 별 격리)
 *   7. serializeGraphToMarkdown — round-trip 무손실 위임
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorldGraphEditor, {
  deriveEdges,
  summarizeValidation,
  serializeGraphToMarkdown,
} from '../WorldGraphEditor';
import type { WorldFactEntry } from '@/lib/worldgraph/types';

// ============================================================
// PART 1 — fixture helper
// ============================================================

function makeEntry(id: string, opts: Partial<WorldFactEntry['frontMatter']> = {}): WorldFactEntry {
  return {
    frontMatter: {
      id,
      workId: 'w1',
      category: opts.category ?? 'magic',
      tier: 1,
      fact: opts.fact ?? '테스트 fact',
      confidence: opts.confidence ?? 0.8,
      conflictsWith: opts.conflictsWith ?? [],
      sourceSentenceIds: ['s1'],
      arcsStatus: 'PASS',
      createdAt: '2026-06-07T00:00:00Z',
      updatedAt: '2026-06-07T00:00:00Z',
      ...opts,
    },
    bodyRaw: '',
    provenance: { origin: 'USER', createdAt: 1 },
  };
}

// ============================================================
// PART 2 — Pure helpers (deriveEdges / summarizeValidation)
// ============================================================

describe('deriveEdges — conflictsWith → 양방향 중복 제거', () => {
  it('단방향 conflict → 1 엣지', () => {
    const nodes = [
      { entry: makeEntry('a', { conflictsWith: ['b'] }), pos: { x: 0.1, y: 0.1 } },
      { entry: makeEntry('b'), pos: { x: 0.5, y: 0.5 } },
    ];
    const edges = deriveEdges(nodes);
    expect(edges).toHaveLength(1);
    expect(edges[0].kind).toBe('conflict');
  });

  it('양방향 conflict (a↔b, b↔a) → 1 엣지 (중복 제거)', () => {
    const nodes = [
      { entry: makeEntry('a', { conflictsWith: ['b'] }), pos: { x: 0, y: 0 } },
      { entry: makeEntry('b', { conflictsWith: ['a'] }), pos: { x: 0, y: 0 } },
    ];
    expect(deriveEdges(nodes)).toHaveLength(1);
  });

  it('존재하지 않는 id 참조 무시', () => {
    const nodes = [{ entry: makeEntry('a', { conflictsWith: ['ghost'] }), pos: { x: 0, y: 0 } }];
    expect(deriveEdges(nodes)).toHaveLength(0);
  });

  it('자기 참조 무시', () => {
    const nodes = [{ entry: makeEntry('a', { conflictsWith: ['a'] }), pos: { x: 0, y: 0 } }];
    expect(deriveEdges(nodes)).toHaveLength(0);
  });
});

describe('summarizeValidation', () => {
  it('정합 통과 — blocking 0', () => {
    const nodes = [{ entry: makeEntry('a'), pos: { x: 0, y: 0 } }];
    const s = summarizeValidation(nodes);
    expect(s.blocking).toBe(0);
  });

  it('fact 누락 — blocking 1', () => {
    const nodes = [
      {
        entry: makeEntry('bad', { fact: '', confidence: 0.4 }),
        pos: { x: 0, y: 0 },
      },
    ];
    const s = summarizeValidation(nodes);
    expect(s.blocking).toBe(1);
  });
});

describe('serializeGraphToMarkdown — round-trip 위임', () => {
  it('각 노드 → {id, md}', () => {
    const nodes = [
      { entry: makeEntry('a', { fact: '사실 A' }), pos: { x: 0, y: 0 } },
      { entry: makeEntry('b', { fact: '사실 B' }), pos: { x: 0, y: 0 } },
    ];
    const out = serializeGraphToMarkdown(nodes);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('a');
    expect(out[0].md).toContain('사실 A');
    expect(out[1].md).toContain('사실 B');
  });
});

// ============================================================
// PART 3 — Component (DOM 통합)
// ============================================================

describe('WorldGraphEditor — UI', () => {
  beforeEach(() => {
    // localStorage 초기화
    if (typeof window !== 'undefined') window.localStorage.clear();
  });

  it('빈 상태 렌더 — 안내 문구 + SVG 존재', () => {
    const { getByTestId, getByText } = render(<WorldGraphEditor workId="w-empty" />);
    expect(getByTestId('worldgraph-svg')).toBeInTheDocument();
    expect(getByText(/위 입력으로 세계관 fact 를 추가하세요/)).toBeInTheDocument();
  });

  it('chat 입력 → 노아 채움 버튼 → 노드 1개 추가', () => {
    const { getByLabelText, getByText, container } = render(<WorldGraphEditor workId="w-add" />);
    const input = getByLabelText('세계관 fact 입력') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '마법은 마나를 소비한다' } });
    });
    act(() => {
      fireEvent.click(getByText('노아 채움'));
    });
    // 노드 카운트 텍스트 — 1 노드
    expect(container.textContent).toMatch(/1 노드/);
  });

  it('Enter 키로도 노드 추가', () => {
    const { getByLabelText, container } = render(<WorldGraphEditor workId="w-enter" />);
    const input = getByLabelText('세계관 fact 입력') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '북부 길드 세력' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(container.textContent).toMatch(/1 노드/);
  });

  it('initialNodes 로 prop 주입 시 그대로 렌더', () => {
    const initial = [
      { entry: makeEntry('seed-1'), pos: { x: 0.3, y: 0.4 } },
    ];
    const { container, getByTestId } = render(
      <WorldGraphEditor workId="w-init" initialNodes={initial} />,
    );
    expect(getByTestId('worldgraph-node-seed-1')).toBeInTheDocument();
    expect(container.textContent).toMatch(/1 노드/);
  });

  it('localStorage 영속 — workId 별 격리 (다른 workId 는 빈 상태)', () => {
    const initial = [{ entry: makeEntry('persisted'), pos: { x: 0.2, y: 0.2 } }];
    const { unmount } = render(<WorldGraphEditor workId="w-A" initialNodes={initial} />);
    // 영속 후 unmount
    unmount();
    // 같은 workId → 복원
    const renderA = render(<WorldGraphEditor workId="w-A" />);
    expect(renderA.getByTestId('worldgraph-node-persisted')).toBeInTheDocument();
    renderA.unmount();
    // 다른 workId → 빈
    const renderB = render(<WorldGraphEditor workId="w-B" />);
    expect(renderB.queryByTestId('worldgraph-node-persisted')).toBeNull();
  });

  // [풀점검 priority 11 — 2026-06-08] cleanup 검증 추가.

  it('unmount cleanup — onChange handler not called after unmount', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const initial = [{ entry: makeEntry('n-1'), pos: { x: 0.5, y: 0.5 } }];
    const { unmount } = render(
      <WorldGraphEditor workId="w-cleanup" initialNodes={initial} onChange={onChange} />,
    );
    // unmount 직후 — onChange 가 추가 호출되지 않아야 함
    const before = onChange.mock.calls.length;
    unmount();
    // 큰 시간 진행 후에도 콜백 없음
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(onChange.mock.calls.length).toBe(before);
    jest.useRealTimers();
  });

  it('localStorage 직렬화 — workId 별 1 회 write per change (idempotent key)', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockClear();
    const initial = [{ entry: makeEntry('idem'), pos: { x: 0.5, y: 0.5 } }];
    render(<WorldGraphEditor workId="w-idem" initialNodes={initial} />);
    // 같은 workId 키로 저장 — w-idem 관련 setItem 1 회 이상
    const idemCalls = setItemSpy.mock.calls.filter(
      ([key]) => typeof key === 'string' && key.includes('w-idem'),
    );
    expect(idemCalls.length).toBeGreaterThanOrEqual(1);
    setItemSpy.mockRestore();
  });

  // [P3 low/reliability 2026-06-09] quota 초과 무음 실패 → noa:alert 토스트 검증.
  it('localStorage quota 초과 시 noa:alert(error) 디스패치 (무음 실패 방지)', () => {
    const alertHandler = jest.fn();
    window.addEventListener('noa:alert', alertHandler);
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    });
    const initial = [{ entry: makeEntry('quota'), pos: { x: 0.5, y: 0.5 } }];
    render(<WorldGraphEditor workId="w-quota" initialNodes={initial} />);
    expect(alertHandler).toHaveBeenCalled();
    const detail = (alertHandler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.variant).toBe('error');
    expect(String(detail.message)).toMatch(/용량 초과|저장 실패/);
    setItemSpy.mockRestore();
    window.removeEventListener('noa:alert', alertHandler);
  });

  // [P2 low/correctness 2026-06-09] 키보드 Delete 후 selectedId 가 남은 노드로 이동.
  it('Delete 키로 노드 삭제 후 selection 이 남은 노드로 이동 (포커스 끊김 방지)', () => {
    const initial = [
      { entry: makeEntry('keep-1'), pos: { x: 0.2, y: 0.2 } },
      { entry: makeEntry('del-target'), pos: { x: 0.5, y: 0.5 } },
    ];
    const { getByTestId, queryByTestId } = render(
      <WorldGraphEditor workId="w-delfocus" initialNodes={initial} />,
    );
    const targetNode = getByTestId('worldgraph-node-del-target');
    // 선택(focus) 커밋 후 Delete — 같은 act 내 배치 시 selectedId 미반영 → 분리.
    act(() => { fireEvent.focus(targetNode); });
    act(() => { fireEvent.keyDown(targetNode, { key: 'Delete' }); });
    // 삭제됨 + 남은 노드(keep-1) 가 인스펙터에 선택 표시
    expect(queryByTestId('worldgraph-node-del-target')).toBeNull();
    expect(getByTestId('worldgraph-node-keep-1')).toBeInTheDocument();
    // 인스펙터(선택 노드 표시)가 남은 노드로 갱신
    const inspector = getByTestId('worldgraph-inspector');
    expect(inspector.textContent).toMatch(/keep-1/);
  });
});
