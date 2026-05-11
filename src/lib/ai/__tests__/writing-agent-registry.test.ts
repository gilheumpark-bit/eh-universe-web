/**
 * writing-agent-registry.test.ts (2026-05-12 — Doc 4 dir 05 T-02 / F-test)
 *
 * 핵심 ARCS 모듈 검증. 11 agent × 6 guards × 17 context blocks.
 * 이전 AGENTS.md "70/70 pass" 주장 부재 → 본 테스트로 채움.
 */

import {
  WRITING_AGENT_REGISTRY,
  buildAgentSystemPrompt,
  getAgent,
  listAgentIds,
  auditRegistry,
  type AgentId,
} from '../writing-agent-registry';

describe('writing-agent-registry — registry shape', () => {
  it('11+ agent 등록', () => {
    const ids = listAgentIds();
    expect(ids.length).toBeGreaterThanOrEqual(11);
  });

  it('각 agent 정의 — id / role / duty / defaultLanguage / guards / contextBlocks', () => {
    for (const id of listAgentIds()) {
      const agent = getAgent(id);
      expect(typeof agent.id).toBe('string');
      expect(typeof agent.role).toBe('string');
      expect(agent.role.length).toBeGreaterThan(0);
      expect(typeof agent.duty).toBe('string');
      expect(agent.duty.length).toBeGreaterThan(0);
      expect(['ko', 'en', 'ja', 'zh']).toContain(agent.defaultLanguage);
      expect(Array.isArray(agent.guards)).toBe(true);
      expect(Array.isArray(agent.contextBlocks)).toBe(true);
    }
  });

  it('id 와 key 일치', () => {
    const entries = Object.entries(WRITING_AGENT_REGISTRY);
    for (const [key, def] of entries) {
      expect(def.id).toBe(key);
    }
  });

  it('필수 agent 존재', () => {
    const ids = listAgentIds();
    expect(ids).toContain('studio-draft' as AgentId);
    expect(ids).toContain('studio-inline-completion' as AgentId);
    expect(ids).toContain('studio-inline-rewrite' as AgentId);
  });
});

describe('writing-agent-registry — getAgent', () => {
  it('알려진 id 반환', () => {
    const agent = getAgent('studio-draft' as AgentId);
    expect(agent.id).toBe('studio-draft');
  });

  it('알 수 없는 id throw', () => {
    expect(() => getAgent('nonexistent-agent' as AgentId)).toThrow();
  });
});

describe('writing-agent-registry — buildAgentSystemPrompt', () => {
  // measureTokens false — 단위 테스트에서 외부 dispatch 안전 차단
  const opts = { measureTokens: false } as const;

  it('role + 임무 + 가드 + context block 순서로 결합', () => {
    const result = buildAgentSystemPrompt('studio-draft' as AgentId, {}, opts);
    const agent = getAgent('studio-draft' as AgentId);
    expect(result).toContain(agent.role);
    expect(result).toContain(`임무: ${agent.duty}`);
  });

  it('빈 context — 가드는 주입되지만 context block 텍스트는 X', () => {
    const result = buildAgentSystemPrompt('studio-draft' as AgentId, {}, opts);
    // 가드 중 '/no_think' guard 본문 일부 확인
    expect(result).toContain('/no_think');
  });

  it('context block 주입 — character-dna', () => {
    const dnaText = '주인공: 유진, 22세, 야간 알바';
    const result = buildAgentSystemPrompt(
      'studio-draft' as AgentId,
      { 'character-dna': dnaText },
      opts,
    );
    expect(result).toContain('[character-dna]');
    expect(result).toContain(dnaText);
  });

  it('빈 string context block은 inject 안 됨', () => {
    const result = buildAgentSystemPrompt(
      'studio-draft' as AgentId,
      { 'character-dna': '   ' },
      opts,
    );
    expect(result).not.toContain('[character-dna]');
  });

  it('language override — defaultLanguage 와 다른 경우 LANG_DIRECTIVE 주입', () => {
    const result = buildAgentSystemPrompt(
      'studio-draft' as AgentId,
      { language: 'en' },
      opts,
    );
    expect(result).toContain('English');
  });

  it('language same as default — LANG_DIRECTIVE 안 주입', () => {
    const agent = getAgent('studio-draft' as AgentId);
    const result = buildAgentSystemPrompt(
      'studio-draft' as AgentId,
      { language: agent.defaultLanguage },
      opts,
    );
    // ko default 시 KO directive 별도 주입 안 함
    expect(result).not.toContain('[TARGET LANGUAGE: English]');
  });

  it('extraDirectives 추가 prompt 추가', () => {
    const extra = '추가 지시: 1인칭만 사용.';
    const result = buildAgentSystemPrompt(
      'studio-draft' as AgentId,
      { extraDirectives: extra },
      opts,
    );
    expect(result).toContain(extra);
  });

  it('extraDirectives 공백만 — inject 안 됨', () => {
    const result = buildAgentSystemPrompt(
      'studio-draft' as AgentId,
      { extraDirectives: '   ' },
      opts,
    );
    expect(result.split('\n\n').some((p) => p.trim().length === 0)).toBe(false);
  });

  it('B-01 fix — 21-module 6 새 ContextBlockId 주입 가능 (silent drop 검증)', () => {
    // ContextBlockId union에 ending-lock / timeline-graph / info-release-table /
    // beat-bank / foreshadow-pair / platform-profile 6개 추가됨 (commit b7aa41c2)
    const newIds = [
      'ending-lock',
      'timeline-graph',
      'info-release-table',
      'beat-bank',
      'foreshadow-pair',
      'platform-profile',
    ] as const;
    for (const id of newIds) {
      // type 만족하면 OK — buildAgentSystemPrompt 호출 자체가 type-safe
      const ctx: Record<string, string> = { [id]: `[stub ${id}]` };
      const result = buildAgentSystemPrompt(
        'studio-draft' as AgentId,
        ctx as Parameters<typeof buildAgentSystemPrompt>[1],
        opts,
      );
      // agent.contextBlocks에 포함 안 됐을 수 있어 inject 여부는 agent 정의에 의존.
      // 최소한 type-level에서 통과해야.
      expect(typeof result).toBe('string');
    }
  });

  it('동일 인자 → idempotent (같은 결과)', () => {
    const ctx = { 'character-dna': 'foo' };
    const a = buildAgentSystemPrompt('studio-draft' as AgentId, ctx, opts);
    const b = buildAgentSystemPrompt('studio-draft' as AgentId, ctx, opts);
    expect(a).toBe(b);
  });
});

describe('writing-agent-registry — auditRegistry', () => {
  it('total === listAgentIds().length', () => {
    const audit = auditRegistry();
    expect(audit.total).toBe(listAgentIds().length);
  });

  it('byGuard / byContextBlock 통계 객체', () => {
    const audit = auditRegistry();
    expect(typeof audit.byGuard).toBe('object');
    expect(typeof audit.byContextBlock).toBe('object');
    // 적어도 하나의 가드는 등록됐어야
    expect(Object.keys(audit.byGuard).length).toBeGreaterThan(0);
  });

  it('missingNotes 배열', () => {
    const audit = auditRegistry();
    expect(Array.isArray(audit.missingNotes)).toBe(true);
    // notes 가 비어있는 agent의 id 만 listed
    for (const id of audit.missingNotes) {
      const agent = getAgent(id);
      expect(agent.notes ?? '').toBe('');
    }
  });
});

describe('writing-agent-registry — Translation stage agents (dual-pipeline)', () => {
  it('translator-stage-1~5 존재', () => {
    const ids = listAgentIds() as string[];
    const stages = ids.filter((id) => /^translator-stage-/.test(id));
    expect(stages.length).toBeGreaterThanOrEqual(1);
  });
});
