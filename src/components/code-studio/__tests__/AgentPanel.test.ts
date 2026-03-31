/* eslint-disable @typescript-eslint/no-require-imports */
describe('AgentPanel helpers', () => {
  it('prefers developer code blocks when picking apply candidate', () => {
    const { pickAgentApplyCandidate } = require('../AgentPanel');

    const candidate = pickAgentApplyCandidate({
      id: 'session-1',
      task: 'refactor',
      agents: ['architect', 'developer', 'documenter'],
      status: 'done',
      conflicts: [],
      messages: [
        {
          id: 'architect-1',
          role: 'architect',
          content: 'Outline only',
          timestamp: 1,
          confidence: 0.7,
        },
        {
          id: 'developer-1',
          role: 'developer',
          content: '```ts\nexport const value = 42;\n```',
          timestamp: 2,
          confidence: 0.9,
        },
        {
          id: 'documenter-1',
          role: 'documenter',
          content: '```md\n# README\n```',
          timestamp: 3,
          confidence: 0.8,
        },
      ],
      finalOutput: '```md\n# README\n```',
      summary: {
        totalAgentsRun: 3,
        totalTokensEstimate: 20,
        conflictsFound: 0,
        finalConfidence: 0.8,
        durationMs: 100,
      },
    });

    expect(candidate).not.toBeNull();
    expect(candidate.sourceRole).toBe('developer');
    expect(candidate.code).toContain('value = 42');
  });

  it('returns null when the session has no code blocks', () => {
    const { pickAgentApplyCandidate } = require('../AgentPanel');

    const candidate = pickAgentApplyCandidate({
      id: 'session-2',
      task: 'review',
      agents: ['reviewer'],
      status: 'done',
      conflicts: [],
      messages: [
        {
          id: 'reviewer-1',
          role: 'reviewer',
          content: 'No code changes required.',
          timestamp: 1,
          confidence: 0.6,
        },
      ],
    });

    expect(candidate).toBeNull();
  });
});
