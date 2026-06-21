import { WabiReasonCode } from './gate';

export interface ExternalChainVerifyResult {
  isValid: boolean;
  brokenLinkIndex?: number;
  tipHash?: string;
}

export interface WabiChainAuditResult {
  isValid: boolean;
  tipHash?: string;
  reason?: WabiReasonCode;
}

export function convertChainVerifyResult(result: ExternalChainVerifyResult): WabiChainAuditResult {
  if (!result.isValid) {
    return {
      isValid: false,
      reason: 'CHAIN_INVALID',
      tipHash: result.tipHash,
    };
  }
  
  return {
    isValid: true,
    tipHash: result.tipHash,
  };
}
