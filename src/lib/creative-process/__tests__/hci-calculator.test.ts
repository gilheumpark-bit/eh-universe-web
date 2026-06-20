/**
 * hci-calculator.test.ts (2026-05-10 — Visual Charter v1.0)
 */

import {
  computeHCIDetail,
  categorizeOriginSummary,
  HCI_DISCLAIMER_4LANG,
  HCI_AXIS_LABELS,
  ORIGIN_CATEGORY_LABELS,
} from '../hci-calculator';
import type { CreativeEvent, CreativeOriginType } from '../types';

function mkEvent(originType: CreativeOriginType, idx: number): CreativeEvent {
  return {
    id: `evt-${idx}`,
    projectId: 'p1',
    targetType: 'manuscript',
    targetId: 'tgt-1',
    eventType: 'edit',
    actorType: 'human',
    actorId: 'a-1',
    originType,
    beforeHash: null,
    afterHash: null,
    createdAt: new Date(2026, 4, 10, 0, idx, 0).toISOString(),
    appVersion: 'test',
  };
}

describe('hci-calculator — computeHCIDetail', () => {
  it('빈 events → hci 0, unverified/low/incomplete', () => {
    const r = computeHCIDetail([]);
    expect(r.hci).toBe(0);
    expect(r.intent).toBe('unverified');
    expect(r.density).toBe('low');
    expect(r.logic).toBe('incomplete');
    expect(r.totalEvents).toBe(0);
  });

  it('전부 HUMAN_DRAFT → hci 100, verified', () => {
    const events = Array.from({ length: 10 }, (_, i) => mkEvent('HUMAN_DRAFT', i));
    const r = computeHCIDetail(events);
    expect(r.hci).toBe(100);
    expect(r.intent).toBe('verified');
    expect(r.totalEvents).toBe(10);
  });

  it('전부 AI_DRAFT → hci 0', () => {
    const events = Array.from({ length: 10 }, (_, i) => mkEvent('AI_DRAFT', i));
    const r = computeHCIDetail(events);
    expect(r.hci).toBe(0);
  });

  it('AI_SUGGESTION (가중 0.7) → hci 70', () => {
    const events = Array.from({ length: 10 }, (_, i) => mkEvent('AI_SUGGESTION', i));
    const r = computeHCIDetail(events);
    expect(r.hci).toBe(70);
  });

  it('AI_REWRITE (가중 0.5) → hci 50', () => {
    const events = Array.from({ length: 10 }, (_, i) => mkEvent('AI_REWRITE', i));
    const r = computeHCIDetail(events);
    expect(r.hci).toBe(50);
  });

  it('Author Intent: HUMAN_DRAFT 30%+ → verified', () => {
    const events = [
      ...Array.from({ length: 4 }, (_, i) => mkEvent('HUMAN_DRAFT', i)), // 40%
      ...Array.from({ length: 6 }, (_, i) => mkEvent('AI_SUGGESTION', i + 10)),
    ];
    const r = computeHCIDetail(events);
    expect(r.intent).toBe('verified');
  });

  it('Author Intent: HUMAN_DRAFT 0% → unverified', () => {
    const events = Array.from({ length: 10 }, (_, i) => mkEvent('AI_SUGGESTION', i));
    const r = computeHCIDetail(events);
    expect(r.intent).toBe('unverified');
  });

  it('Manual Edit Density: HUMAN_REVISION + AI_REWRITE 40%+ → high', () => {
    const events = [
      ...Array.from({ length: 4 }, (_, i) => mkEvent('HUMAN_REVISION', i)),
      ...Array.from({ length: 6 }, (_, i) => mkEvent('HUMAN_DRAFT', i + 10)),
    ];
    const r = computeHCIDetail(events);
    expect(r.density).toBe('high');
  });

  it('Narrative Logic: events 50+ → validated', () => {
    const events = Array.from({ length: 60 }, (_, i) => mkEvent('HUMAN_DRAFT', i));
    const r = computeHCIDetail(events);
    expect(r.logic).toBe('validated');
  });

  it('byOrigin 카운트 정확', () => {
    const events = [
      mkEvent('HUMAN_DRAFT', 0),
      mkEvent('HUMAN_DRAFT', 1),
      mkEvent('AI_SUGGESTION', 2),
    ];
    const r = computeHCIDetail(events);
    expect(r.byOrigin.HUMAN_DRAFT).toBe(2);
    expect(r.byOrigin.AI_SUGGESTION).toBe(1);
    expect(r.byOrigin.AI_DRAFT).toBe(0);
  });
});

describe('hci-calculator — categorizeOriginSummary', () => {
  it('빈 byOrigin → 0/0/0', () => {
    const r = categorizeOriginSummary({
      HUMAN_DRAFT: 0, HUMAN_REVISION: 0, AI_SUGGESTION: 0, AI_DRAFT: 0,
      AI_REWRITE: 0, EXTERNAL_IMPORT: 0, TEMPLATE_SEED: 0,
      COLLABORATOR_INPUT: 0, SYSTEM_GENERATED: 0,
    });
    expect(r).toEqual({ human_input: 0, refinement: 0, ai_suggestion: 0 });
  });

  it('100% HUMAN_DRAFT → human_input 100', () => {
    const r = categorizeOriginSummary({
      HUMAN_DRAFT: 10, HUMAN_REVISION: 0, AI_SUGGESTION: 0, AI_DRAFT: 0,
      AI_REWRITE: 0, EXTERNAL_IMPORT: 0, TEMPLATE_SEED: 0,
      COLLABORATOR_INPUT: 0, SYSTEM_GENERATED: 0,
    });
    expect(r.human_input).toBe(100);
    expect(r.refinement).toBe(0);
    expect(r.ai_suggestion).toBe(0);
  });

  it('75/20/5 분포', () => {
    const r = categorizeOriginSummary({
      HUMAN_DRAFT: 75, HUMAN_REVISION: 0, AI_SUGGESTION: 0, AI_DRAFT: 5,
      AI_REWRITE: 20, EXTERNAL_IMPORT: 0, TEMPLATE_SEED: 0,
      COLLABORATOR_INPUT: 0, SYSTEM_GENERATED: 0,
    });
    expect(r.human_input).toBe(75);
    expect(r.refinement).toBe(20);
    expect(r.ai_suggestion).toBe(5);
  });
});

describe('hci-calculator — 4언어 라벨', () => {
  it('HCI_DISCLAIMER 4언어 byte-level', () => {
    expect(HCI_DISCLAIMER_4LANG.ko).toContain('HCI는');
    expect(HCI_DISCLAIMER_4LANG.en).toContain('HCI is');
    expect(HCI_DISCLAIMER_4LANG.ja).toContain('HCI');
    expect(HCI_DISCLAIMER_4LANG.zh).toContain('HCI');
  });

  it('HCI_AXIS_LABELS 4언어 × 3축', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      expect(HCI_AXIS_LABELS.intent[lang].label).toBeDefined();
      expect(HCI_AXIS_LABELS.density[lang].label).toBeDefined();
      expect(HCI_AXIS_LABELS.logic[lang].label).toBeDefined();
    }
  });

  it('ORIGIN_CATEGORY_LABELS 4언어', () => {
    expect(ORIGIN_CATEGORY_LABELS.ko.human_input).toBe('작가 입력');
    expect(ORIGIN_CATEGORY_LABELS.en.human_input).toBe('Author Input');
  });
});
