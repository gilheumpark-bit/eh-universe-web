// ============================================================
// PART 1 — Action Approval Mode
// ============================================================
// Determines whether AI-driven actions require user confirmation.
// Three modes: easy (always confirm), normal (dangerous only), pro (auto-execute).

import { loadIDESettings } from '@/components/code-studio/SettingsPanel';

export type ApprovalMode = 'easy' | 'normal' | 'pro';

/** Actions that are considered dangerous in "normal" mode */
const DANGEROUS_ACTIONS = new Set([
  'runTerminal',
  'deleteFile',
  'overwriteFile',
  'installPackage',
  'gitPush',
  'gitReset',
  'modifyEnv',
]);

/**
 * Check whether a given action requires user approval.
 * @param action - The action identifier (e.g., 'writeFile', 'runTerminal')
 * @returns true if the user must confirm before executing
 */
export function requiresApproval(action: string): boolean {
  const mode = getApprovalMode();

  switch (mode) {
    case 'easy':
      return true;
    case 'pro':
      return false;
    case 'normal':
    default:
      return DANGEROUS_ACTIONS.has(action);
  }
}

/** Read the current approval mode from settings */
export function getApprovalMode(): ApprovalMode {
  const settings = loadIDESettings();
  return settings.actionApprovalMode ?? 'normal';
}

// IDENTITY_SEAL: PART-1 | role=approval-mode | inputs=action | outputs=boolean
