import {
  evaluateActionContainment,
  runContainedAction,
  type ActionContainmentTrace,
} from '../action-containment';
import type { ActionDef, RegisteredAction } from '../action-registry';

function actionDef(overrides: Partial<ActionDef> = {}): ActionDef {
  return {
    id: 'studio:ai-generate',
    label: 'Noa proposal',
    area: 'studio',
    category: 'ai',
    ...overrides,
  };
}

describe('action-containment policy', () => {
  it('allows human invocation in the matching area', () => {
    const decision = evaluateActionContainment(actionDef(), {
      currentArea: 'studio',
      source: 'human',
      now: 1,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.trace).toMatchObject({
      actionId: 'studio:ai-generate',
      allowed: true,
      reason: 'allowed',
      source: 'human',
    });
  });

  it('denies area mismatch and emits a denial trace', () => {
    const decision = evaluateActionContainment(actionDef(), {
      currentArea: 'translation-studio',
      source: 'human',
      now: 2,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.trace).toMatchObject({
      actionId: 'studio:ai-generate',
      currentArea: 'translation-studio',
      actionArea: 'studio',
      reason: 'area-mismatch',
    });
  });

  it('denies agent invocation without an action license', async () => {
    const handler = jest.fn();
    const traceSpy = jest.fn<void, [ActionContainmentTrace]>();
    const action: RegisteredAction = { ...actionDef(), action: handler };

    const decision = await runContainedAction(action, {
      currentArea: 'studio',
      source: 'agent',
      now: 3,
    }, traceSpy);

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('agent-license-missing');
    expect(traceSpy).toHaveBeenCalledWith(expect.objectContaining({
      actionId: 'studio:ai-generate',
      allowed: false,
      reason: 'agent-license-missing',
    }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('allows agent invocation when the license explicitly grants the action id', async () => {
    const handler = jest.fn();
    const action: RegisteredAction = { ...actionDef(), action: handler };

    const decision = await runContainedAction(action, {
      currentArea: 'studio',
      source: 'agent',
      grant: {
        actionIds: ['studio:ai-generate'],
        reason: 'test harness grant',
      },
      now: 4,
    });

    expect(decision.allowed).toBe(true);
    expect(decision.trace.grantReason).toBe('test harness grant');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('denies destructive human action without explicit confirmation', () => {
    const decision = evaluateActionContainment(actionDef({
      id: 'studio:danger-delete',
      category: 'data',
      destructive: true,
    }), {
      currentArea: 'studio',
      source: 'human',
      now: 5,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('destructive-confirmation-missing');
  });

  it('denies destructive agent action without destructive license even when confirmed', () => {
    const decision = evaluateActionContainment(actionDef({
      id: 'studio:danger-delete',
      category: 'data',
      destructive: true,
    }), {
      currentArea: 'studio',
      source: 'agent',
      grant: { actionIds: ['studio:danger-delete'] },
      confirmedActionIds: ['studio:danger-delete'],
      now: 6,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('destructive-license-missing');
  });

  it('denies expired agent license', () => {
    const decision = evaluateActionContainment(actionDef(), {
      currentArea: 'studio',
      source: 'agent',
      grant: {
        actionIds: ['studio:ai-generate'],
        expiresAt: 10,
      },
      now: 11,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('license-expired');
  });
});

export {};
