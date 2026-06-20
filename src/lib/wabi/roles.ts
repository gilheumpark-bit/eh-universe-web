export type WabiRoleId =
  | 'human-author'
  | 'ai-proposer'
  | 'executor'
  | 'validator'
  | 'external-verifier'
  | 'auditor'
  | 'admin-owner';

export type WabiAuthority =
  | 'NONE'
  | 'OPTION'
  | 'EXECUTION'
  | 'FINAL';

export interface WabiRoleDefinition {
  id: WabiRoleId;
  name: string;
  canDecide: boolean;
  canApprove: boolean;
  maxAuthority: WabiAuthority;
}

export const WABI_ROLES: Record<WabiRoleId, WabiRoleDefinition> = {
  'human-author': { id: 'human-author', name: 'Human Author', canDecide: true, canApprove: true, maxAuthority: 'FINAL' },
  'admin-owner': { id: 'admin-owner', name: 'Admin / Owner', canDecide: true, canApprove: true, maxAuthority: 'FINAL' },
  'ai-proposer': { id: 'ai-proposer', name: 'AI Proposer', canDecide: false, canApprove: false, maxAuthority: 'OPTION' },
  'executor': { id: 'executor', name: 'Executor System', canDecide: false, canApprove: false, maxAuthority: 'EXECUTION' },
  'validator': { id: 'validator', name: 'Validator System', canDecide: false, canApprove: false, maxAuthority: 'EXECUTION' },
  'external-verifier': { id: 'external-verifier', name: 'External Verifier', canDecide: false, canApprove: false, maxAuthority: 'OPTION' },
  'auditor': { id: 'auditor', name: 'Auditor', canDecide: false, canApprove: false, maxAuthority: 'NONE' },
};
