import { WabiDecision, WabiReasonCode } from './gate';

export interface ReleaseGateContext {
  hasHumanApproval: boolean;
  isExportOrPublish: boolean;
  missingReferences: boolean;
  hasHighIpRisk: boolean;
  isChainInvalid: boolean;
  hasAiAssist: boolean;
  hasAiUsageRecord: boolean;
  needsRatingCheck: boolean;
}

export interface ReleaseGateResult {
  decision: WabiDecision;
  reasons: WabiReasonCode[];
}

export function evaluateReleaseGate(context: ReleaseGateContext): ReleaseGateResult {
  const reasons: WabiReasonCode[] = [];
  
  if (context.hasHighIpRisk) {
    return { decision: 'BLOCK', reasons: ['IP_RISK'] };
  }
  
  if (context.isChainInvalid) {
    return { decision: 'BLOCK', reasons: ['CHAIN_INVALID'] };
  }
  
  if (context.isExportOrPublish && !context.hasHumanApproval) {
    reasons.push('NO_HUMAN_APPROVAL');
  }
  
  if (context.missingReferences) {
    reasons.push('MISSING_REFERENCE');
  }
  
  if (context.needsRatingCheck) {
    reasons.push('EXPORT_POLICY_REQUIRED');
  }
  
  if (reasons.length > 0) {
    return { decision: 'HOLD', reasons };
  }
  
  if (context.hasAiAssist && !context.hasAiUsageRecord) {
    return { decision: 'ALLOW_MINIMAL', reasons: [] };
  }
  
  return { decision: 'ALLOW', reasons: [] };
}
