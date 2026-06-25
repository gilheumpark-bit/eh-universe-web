// ============================================================
// event-recorder.test.ts — IndexedDB append + CustomEvent dispatch
// ============================================================
//
// fake-indexeddb 로 jsdom 환경에서 IndexedDB 시뮬레이션.
// Round 2-5 — 2026-05-07.

// [C] structuredClone polyfill — fake-indexeddb 가 cloneValueForInsertion 에서 사용
// jsdom 환경 (Node < 17) 에서 미지원 → JSON 기반 deep clone 으로 대체
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

import 'fake-indexeddb/auto';
import { recordCreativeEvent, listCreativeEvents, countCreativeEvents, CREATIVE_EVENT_CAPTURED } from '../event-recorder';
import { _resetCachedDB } from '../idb-store';

describe('event-recorder — IndexedDB append + CustomEvent', () => {
  beforeEach(() => {
    // 매 테스트 fresh DB
    _resetCachedDB();
    // fake-indexeddb 도 reset
    (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  });

  it('recordCreativeEvent — 1건 record + listCreativeEvents 로 read', async () => {
    const id = await recordCreativeEvent({
      projectId: 'prj-1',
      targetType: 'manuscript',
      targetId: 'm1',
      eventType: 'create',
      actorType: 'human',
      actorId: 'author',
      originType: 'HUMAN_DRAFT',
      beforeHash: null,
      afterHash: 'a'.repeat(64),
    });
    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(10);

    const events = await listCreativeEvents({ projectId: 'prj-1' });
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(id);
    expect(events[0].targetId).toBe('m1');
    expect(events[0].originType).toBe('HUMAN_DRAFT');
    expect(events[0].createdAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(events[0].appVersion).toBeTruthy();
  });

  it('recordCreativeEvent — 작가 판단 맥락을 함께 보존한다', async () => {
    const id = await recordCreativeEvent({
      projectId: 'prj-decision',
      targetType: 'manuscript',
      targetId: 'm1',
      eventType: 'accept',
      actorType: 'human',
      actorId: 'author',
      originType: 'AI_SUGGESTION',
      beforeHash: 'b'.repeat(64),
      afterHash: 'a'.repeat(64),
      decisionContext: {
        action: 'accepted',
        selectedAlternativeId: 'alt-2',
        reason: '배신 장면의 동기가 더 자연스러워서 선택',
        alternatives: [
          { id: 'alt-1', label: 'A안', charCount: 120 },
          { id: 'alt-2', label: 'B안', charCount: 140 },
        ],
        delta: { beforeChars: 1000, afterChars: 1120, insertedChars: 120, removedChars: 0, editedChars: 120 },
      },
    });

    const events = await listCreativeEvents({ projectId: 'prj-decision' });
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(id);
    expect(events[0].decisionContext?.selectedAlternativeId).toBe('alt-2');
    expect(events[0].decisionContext?.alternatives).toHaveLength(2);
    expect(events[0].decisionContext?.delta?.insertedChars).toBe(120);
  });

  it('CustomEvent 디스패치 (noa:creative-event-captured)', async () => {
    const handler = jest.fn();
    window.addEventListener(CREATIVE_EVENT_CAPTURED, handler as EventListener);

    const id = await recordCreativeEvent({
      projectId: 'prj-1',
      targetType: 'world',
      targetId: 'w1',
      eventType: 'edit',
      actorType: 'human',
      actorId: 'author',
      originType: 'HUMAN_REVISION',
      beforeHash: 'before',
      afterHash: 'after',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual({
      id,
      eventType: 'edit',
      targetType: 'world',
    });

    window.removeEventListener(CREATIVE_EVENT_CAPTURED, handler as EventListener);
  });

  it('append-only — delete 이벤트도 store 에 추가, 이전 create 이벤트 보존', async () => {
    const createId = await recordCreativeEvent({
      projectId: 'prj-1',
      targetType: 'character',
      targetId: 'char-1',
      eventType: 'create',
      actorType: 'human',
      actorId: 'author',
      originType: 'HUMAN_DRAFT',
      beforeHash: null,
      afterHash: 'h1',
    });

    const deleteId = await recordCreativeEvent({
      projectId: 'prj-1',
      targetType: 'character',
      targetId: 'char-1',
      eventType: 'delete',
      actorType: 'human',
      actorId: 'author',
      originType: 'HUMAN_REVISION',
      beforeHash: 'h1',
      afterHash: null,
    });

    const events = await listCreativeEvents({ projectId: 'prj-1' });
    expect(events).toHaveLength(2);
    const ids = events.map((e) => e.id);
    expect(ids).toContain(createId);
    expect(ids).toContain(deleteId);
    // 시간 순 정렬 검증
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toEqual(['create', 'delete']);
  });

  it('countCreativeEvents — 프로젝트별 카운트', async () => {
    for (let i = 0; i < 3; i++) {
      await recordCreativeEvent({
        projectId: 'prj-A',
        targetType: 'manuscript',
        targetId: `m-${i}`,
        eventType: 'create',
        actorType: 'human',
        actorId: 'author',
        originType: 'HUMAN_DRAFT',
        beforeHash: null,
        afterHash: `h-${i}`,
      });
    }
    await recordCreativeEvent({
      projectId: 'prj-B',
      targetType: 'manuscript',
      targetId: 'm-other',
      eventType: 'create',
      actorType: 'ai',
      actorId: 'gpt',
      originType: 'AI_DRAFT',
      beforeHash: null,
      afterHash: 'other',
    });

    expect(await countCreativeEvents('prj-A')).toBe(3);
    expect(await countCreativeEvents('prj-B')).toBe(1);
    expect(await countCreativeEvents('prj-C')).toBe(0);
  });

  it('listCreativeEvents 필터 — sinceCreatedAt + limit', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await recordCreativeEvent({
        projectId: 'prj-1',
        targetType: 'manuscript',
        targetId: `m-${i}`,
        eventType: 'create',
        actorType: 'human',
        actorId: 'author',
        originType: 'HUMAN_DRAFT',
        beforeHash: null,
        afterHash: `h-${i}`,
      });
      ids.push(id);
      // tiny delay to differentiate createdAt
      await new Promise((r) => setTimeout(r, 2));
    }

    const limited = await listCreativeEvents({ projectId: 'prj-1', limit: 2 });
    expect(limited).toHaveLength(2);

    const all = await listCreativeEvents({ projectId: 'prj-1' });
    expect(all).toHaveLength(5);
  });

  it('episodeId 필터', async () => {
    await recordCreativeEvent({
      projectId: 'prj-1',
      episodeId: 1,
      targetType: 'manuscript',
      targetId: 'ep1',
      eventType: 'create',
      actorType: 'human',
      actorId: 'author',
      originType: 'HUMAN_DRAFT',
      beforeHash: null,
      afterHash: 'h1',
    });
    await recordCreativeEvent({
      projectId: 'prj-1',
      episodeId: 2,
      targetType: 'manuscript',
      targetId: 'ep2',
      eventType: 'create',
      actorType: 'human',
      actorId: 'author',
      originType: 'HUMAN_DRAFT',
      beforeHash: null,
      afterHash: 'h2',
    });

    const ep1Only = await listCreativeEvents({ projectId: 'prj-1', episodeId: 1 });
    expect(ep1Only).toHaveLength(1);
    expect(ep1Only[0].targetId).toBe('ep1');
  });
});
