import { evaluateReleaseGate } from '../release-gate';

describe('WABI Release Gate', () => {
  it('returns BLOCK if IP risk is high', () => {
    const result = evaluateReleaseGate({
      hasHumanApproval: true,
      isExportOrPublish: true,
      missingReferences: false,
      hasHighIpRisk: true,
      isChainInvalid: false,
      hasAiAssist: false,
      hasAiUsageRecord: false,
      needsRatingCheck: false,
    });
    expect(result.decision).toBe('BLOCK');
    expect(result.reasons).toContain('IP_RISK');
  });

  it('returns HOLD if exporting without human approval', () => {
    const result = evaluateReleaseGate({
      hasHumanApproval: false,
      isExportOrPublish: true,
      missingReferences: false,
      hasHighIpRisk: false,
      isChainInvalid: false,
      hasAiAssist: false,
      hasAiUsageRecord: false,
      needsRatingCheck: false,
    });
    expect(result.decision).toBe('HOLD');
    expect(result.reasons).toContain('NO_HUMAN_APPROVAL');
  });

  it('returns ALLOW if all conditions are met', () => {
    const result = evaluateReleaseGate({
      hasHumanApproval: true,
      isExportOrPublish: true,
      missingReferences: false,
      hasHighIpRisk: false,
      isChainInvalid: false,
      hasAiAssist: false,
      hasAiUsageRecord: false,
      needsRatingCheck: false,
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.reasons).toHaveLength(0);
  });
});
