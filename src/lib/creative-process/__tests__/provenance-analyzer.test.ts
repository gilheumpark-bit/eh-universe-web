/**
 * provenance-analyzer.test.ts (2026-05-10 — `_4` 화면 backbone)
 */

import {
  analyzeProvenance,
  PROVENANCE_AXIS_LABELS,
} from '../provenance-analyzer';
import type { CreativeEvent, CreativeOriginType, CreativeEventType } from '../types';

function mkEvent(
  originType: CreativeOriginType,
  idx: number,
  opts: { eventType?: CreativeEventType; actorType?: 'human' | 'ai'; actorId?: string; date?: string } = {},
): CreativeEvent {
  return {
    id: `evt-${idx}`,
    projectId: 'p1',
    targetType: 'manuscript',
    targetId: 'tgt-1',
    eventType: opts.eventType ?? 'edit',
    actorType: opts.actorType ?? 'human',
    actorId: opts.actorId ?? 'a-1',
    originType,
    beforeHash: null,
    afterHash: null,
    createdAt: opts.date ?? new Date(2026, 4, 10, 0, idx, 0).toISOString(),
    appVersion: 'test',
  };
}

describe('provenance-analyzer — analyzeProvenance', () => {
  it('빈 events → 0/0/0 + 빈 actor/chronology', () => {
    const r = analyzeProvenance({ events: [], language: 'ko' });
    expect(r.axes.coreIntegrity).toBe(0);
    expect(r.axes.narrativeDrift).toBe(0);
    expect(r.axes.controlDensity).toBe(0);
    expect(r.actors).toHaveLength(0);
    expect(r.chronology).toHaveLength(0);
    expect(r.totalEvents).toBe(0);
  });

  it('전부 HUMAN_DRAFT → coreIntegrity 100, drift 0', () => {
    const events = Array.from({ length: 10 }, (_, i) => mkEvent('HUMAN_DRAFT', i));
    const r = analyzeProvenance({ events, language: 'ko' });
    expect(r.axes.coreIntegrity).toBe(100);
    expect(r.axes.narrativeDrift).toBe(0);
  });

  it('전부 AI_DRAFT → coreIntegrity 0, drift 100', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      mkEvent('AI_DRAFT', i, { actorType: 'ai', actorId: 'gpt-5' }),
    );
    const r = analyzeProvenance({ events, language: 'ko' });
    expect(r.axes.coreIntegrity).toBe(0);
    expect(r.axes.narrativeDrift).toBe(100);
  });

  it('controlDensity = (accept + reject) / total', () => {
    const events = [
      mkEvent('AI_SUGGESTION', 0, { eventType: 'accept' }),
      mkEvent('AI_SUGGESTION', 1, { eventType: 'reject' }),
      mkEvent('HUMAN_DRAFT', 2, { eventType: 'edit' }),
      mkEvent('HUMAN_DRAFT', 3, { eventType: 'edit' }),
    ];
    const r = analyzeProvenance({ events, language: 'ko' });
    expect(r.axes.controlDensity).toBe(50);
  });

  it('actor share 정렬 — 큰 순', () => {
    const events = [
      ...Array.from({ length: 6 }, (_, i) =>
        mkEvent('HUMAN_DRAFT', i, { actorType: 'human', actorId: 'author-1' }),
      ),
      ...Array.from({ length: 4 }, (_, i) =>
        mkEvent('AI_DRAFT', i + 10, { actorType: 'ai', actorId: 'gpt-5' }),
      ),
    ];
    const r = analyzeProvenance({ events, language: 'ko' });
    expect(r.actors[0].actorId).toBe('author-1');
    expect(r.actors[0].eventCount).toBe(6);
    expect(r.actors[0].share).toBe(60);
    expect(r.actors[1].actorId).toBe('gpt-5');
    expect(r.actors[1].share).toBe(40);
  });

  it('chronology 일자별 그룹', () => {
    const events = [
      mkEvent('HUMAN_DRAFT', 0, { date: '2026-05-08T12:00:00.000Z' }),
      mkEvent('HUMAN_DRAFT', 1, { date: '2026-05-08T13:00:00.000Z' }),
      mkEvent('AI_DRAFT', 2, { date: '2026-05-09T10:00:00.000Z', actorType: 'ai' }),
    ];
    const r = analyzeProvenance({ events, language: 'ko' });
    expect(r.chronology).toHaveLength(2);
    expect(r.chronology[0].date).toBe('2026-05-08');
    expect(r.chronology[0].total).toBe(2);
    expect(r.chronology[1].date).toBe('2026-05-09');
    expect(r.chronology[1].total).toBe(1);
  });

  it('ledger 4 row (manuscript / timeline / source / seal)', () => {
    const events = [mkEvent('HUMAN_DRAFT', 0)];
    const r = analyzeProvenance({
      events,
      language: 'ko',
      hashes: {
        manuscriptHash: 'aaa',
        timelineHash: 'bbb',
        sourceSummaryHash: 'ccc',
        sealNumber: 'LG-2605-0001-AAAA',
      },
    });
    expect(r.ledger).toHaveLength(4);
    expect(r.ledger[0].label).toBe('원고 해시');
    expect(r.ledger[0].hash).toBe('aaa');
    expect(r.ledger[3].label).toBe('과정기록 씰');
    expect(r.ledger[3].hash).toBe('LG-2605-0001-AAAA');
  });

  it('ledger 일부 hash 만 있으면 그만큼만 row', () => {
    const events = [mkEvent('HUMAN_DRAFT', 0)];
    const r = analyzeProvenance({
      events,
      language: 'en',
      hashes: { manuscriptHash: 'aaa' },
    });
    expect(r.ledger).toHaveLength(1);
    expect(r.ledger[0].label).toBe('Manuscript Hash');
  });
});

describe('provenance-analyzer — PROVENANCE_AXIS_LABELS 4언어', () => {
  it('4언어 × 3축 모두 정의', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      expect(PROVENANCE_AXIS_LABELS[lang].coreIntegrity.label).toBeDefined();
      expect(PROVENANCE_AXIS_LABELS[lang].narrativeDrift.label).toBeDefined();
      expect(PROVENANCE_AXIS_LABELS[lang].controlDensity.label).toBeDefined();
    }
  });
});
