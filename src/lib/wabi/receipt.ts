import { WabiDecision, WabiReasonCode } from './gate';
import { WabiRoleId } from './roles';

export interface WabiReceipt {
  receiptId: string;
  projectId: string;
  taskId: string;
  domain: string;
  actionType: string;
  proposedBy?: WabiRoleId;
  selectedBy?: WabiRoleId;
  approvedBy?: WabiRoleId;
  decision: WabiDecision;
  reasonCodes: WabiReasonCode[];
  referencesRequired: string[];
  referencesUsed: string[];
  missingReferences: string[];
  inputHash?: string;
  outputHash?: string;
  chainTipHash?: string;
  timestamp: number;
}

export function createWabiReceipt(params: Partial<WabiReceipt>): WabiReceipt {
  return {
    receiptId: params.receiptId || crypto.randomUUID(),
    projectId: params.projectId || '',
    taskId: params.taskId || '',
    domain: params.domain || 'general',
    actionType: params.actionType || 'unknown',
    proposedBy: params.proposedBy,
    selectedBy: params.selectedBy,
    approvedBy: params.approvedBy,
    decision: params.decision || 'HOLD',
    reasonCodes: params.reasonCodes || [],
    referencesRequired: params.referencesRequired || [],
    referencesUsed: params.referencesUsed || [],
    missingReferences: params.missingReferences || [],
    inputHash: params.inputHash,
    outputHash: params.outputHash,
    chainTipHash: params.chainTipHash,
    timestamp: params.timestamp || Date.now(),
  };
}

export function validateWabiReceipt(receipt: WabiReceipt): boolean {
  if (receipt.decision === 'ALLOW') {
    if (!receipt.approvedBy) return false;
    if (receipt.missingReferences.length > 0) return false;
    if (receipt.approvedBy === 'ai-proposer') return false;
  }
  return true;
}
