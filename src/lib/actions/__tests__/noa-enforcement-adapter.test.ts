import {
  createNoaBoundary,
  evaluateNoaAppEnforcement,
  runNoaGuardedAction,
  type NoaClearanceToken,
  type NoaSignatureVerifier,
} from '../noa-enforcement-adapter';

const verifier: NoaSignatureVerifier = {
  verifyToken(token: NoaClearanceToken): boolean {
    return token.signature === `sig:${token.tokenId}:${token.decisionId}`;
  },
};

function token(input: Partial<NoaClearanceToken> = {}): NoaClearanceToken {
  const base: NoaClearanceToken = {
    tokenId: 'CT-NOA-DEC-BR-0002',
    decisionId: 'NOA-DEC-BR-0002',
    route: 'END',
    granted: true,
    scope: 'NOA-BR-0002',
    issuedAt: '2026-06-19T00:00:00+09:00',
    signature: 'sig:CT-NOA-DEC-BR-0002:NOA-DEC-BR-0002',
  };
  return { ...base, ...input };
}

const receipt = {
  receiptId: 'WABI-NOA-DEC-BR-0002',
  decisionId: 'NOA-DEC-BR-0002',
  action: 'END',
};

describe('noa-enforcement-adapter', () => {
  test('low risk read_context boundary allows without token', () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-005',
      area: 'studio',
      category: 'data',
      toolId: 'read_context',
      action: 'read',
      description: 'audit export read',
    });

    const decision = evaluateNoaAppEnforcement(
      { requestId: 'REQ-READ', boundary },
      verifier,
      1000,
    );

    expect(decision.allowed).toBe(true);
    expect(decision.trace.reason).toBe('allowed-low-risk');
    expect(decision.trace.tokenVerified).toBe(false);
  });

  test('write_artifact boundary allows with valid granted token and matching receipt', () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-002',
      area: 'studio',
      category: 'edit',
      toolId: 'write_artifact',
      action: 'write',
      description: 'primary writer',
    });

    const decision = evaluateNoaAppEnforcement(
      { requestId: 'REQ-WRITE', boundary, token: token(), receipt },
      verifier,
      1000,
    );

    expect(decision.allowed).toBe(true);
    expect(decision.trace.reason).toBe('allowed-token-receipt');
    expect(decision.trace.receiptVerified).toBe(true);
  });

  test('write_artifact boundary denies missing token', () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-002',
      area: 'studio',
      category: 'edit',
      toolId: 'write_artifact',
      action: 'write',
      description: 'primary writer',
    });

    const decision = evaluateNoaAppEnforcement(
      { requestId: 'REQ-MISSING', boundary, receipt },
      verifier,
      1000,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('missing-clearance-token');
  });

  test('run_tool boundary denies ungranted token', () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-004',
      area: 'studio',
      category: 'data',
      toolId: 'run_tool',
      action: 'run',
      description: 'drive save',
    });

    const decision = evaluateNoaAppEnforcement(
      { requestId: 'REQ-UNGRANTED', boundary, token: token({ granted: false }), receipt },
      verifier,
      1000,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('clearance-not-granted');
    expect(decision.trace.tokenVerified).toBe(true);
  });

  test('run_tool boundary denies scope mismatch', () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-001',
      area: 'studio',
      category: 'edit',
      toolId: 'run_tool',
      action: 'run',
      description: 'contained action',
    });

    const decision = evaluateNoaAppEnforcement(
      { requestId: 'REQ-SCOPE', boundary, token: token({ scope: 'OTHER-0002' }), receipt },
      verifier,
      1000,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('scope-mismatch');
  });

  test('critical boundary denies before token verification', () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-CRITICAL',
      area: 'global',
      category: 'system',
      toolId: 'unsafe_external_action',
      action: 'run',
      description: 'critical external action',
    });

    const decision = evaluateNoaAppEnforcement(
      { requestId: 'REQ-CRITICAL', boundary, token: token(), receipt },
      verifier,
      1000,
    );

    expect(decision.allowed).toBe(false);
    expect(decision.trace.reason).toBe('critical-tool-blocked');
    expect(decision.trace.tokenVerified).toBe(false);
  });

  test('guarded action does not run when enforcement denies', async () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-004',
      area: 'studio',
      category: 'data',
      toolId: 'run_tool',
      action: 'run',
      description: 'drive save',
    });
    const action = jest.fn();
    const traces = jest.fn();

    const decision = await runNoaGuardedAction(
      { requestId: 'REQ-DENIED', boundary, token: token({ granted: false }), receipt },
      verifier,
      action,
      traces,
    );

    expect(decision.allowed).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(traces).toHaveBeenCalledTimes(1);
  });

  test('guarded action runs once when enforcement allows', async () => {
    const boundary = createNoaBoundary({
      boundaryId: 'APP-BND-003',
      area: 'studio',
      category: 'data',
      toolId: 'write_artifact',
      action: 'write',
      description: 'export all json',
    });
    const action = jest.fn();

    const decision = await runNoaGuardedAction(
      { requestId: 'REQ-ALLOW', boundary, token: token(), receipt },
      verifier,
      action,
    );

    expect(decision.allowed).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
