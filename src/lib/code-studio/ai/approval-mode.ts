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

// ============================================================
// PART 2 — Pro Mode Halt Mechanism (Infinite-Loop Guard)
// ============================================================
// Tracks consecutive auto-executions in Pro mode. If the count
// exceeds the threshold, forces a user-intervention pause.

const PRO_HALT_THRESHOLD = 5;
const PRO_ERROR_HALT_THRESHOLD = 3;

interface HaltState {
  consecutiveExecutions: number;
  consecutiveErrors: number;
  lastAction: string | null;
  halted: boolean;
}

let haltState: HaltState = {
  consecutiveExecutions: 0,
  consecutiveErrors: 0,
  lastAction: null,
  halted: false,
};

/**
 * Record a successful auto-execution in Pro mode.
 * @returns `true` if execution is still allowed, `false` if halt triggered
 */
export function recordProExecution(action: string): boolean {
  if (getApprovalMode() !== 'pro') {
    resetHaltState();
    return true;
  }

  haltState.consecutiveExecutions += 1;
  haltState.consecutiveErrors = 0;
  haltState.lastAction = action;

  if (haltState.consecutiveExecutions >= PRO_HALT_THRESHOLD) {
    haltState.halted = true;
    return false;
  }
  return true;
}

/**
 * Record an error during Pro mode auto-execution.
 * @returns `true` if execution can continue, `false` if halt triggered
 */
export function recordProError(action: string): boolean {
  if (getApprovalMode() !== 'pro') {
    resetHaltState();
    return true;
  }

  haltState.consecutiveErrors += 1;
  haltState.lastAction = action;

  if (haltState.consecutiveErrors >= PRO_ERROR_HALT_THRESHOLD) {
    haltState.halted = true;
    return false;
  }
  return true;
}

/** Reset counters (call after user manually resumes or mode changes) */
export function resetHaltState(): void {
  haltState = {
    consecutiveExecutions: 0,
    consecutiveErrors: 0,
    lastAction: null,
    halted: false,
  };
}

/** Check whether Pro mode is currently halted */
export function isProHalted(): boolean {
  return haltState.halted;
}

/** Get the current halt state snapshot (for UI display) */
export function getHaltState(): Readonly<HaltState> {
  return { ...haltState };
}

// IDENTITY_SEAL: PART-2 | role=halt-mechanism | inputs=action | outputs=boolean+HaltState

// ============================================================
// PART 3 — Easy Mode Step Tracker
// ============================================================
// Tracks step-by-step approval flow for Easy mode UI indicators.

export interface ApprovalStep {
  id: string;
  action: string;
  label: string;
  status: 'pending' | 'awaiting' | 'approved' | 'rejected';
  timestamp: number;
}

let stepQueue: ApprovalStep[] = [];
const stepListeners: Set<(steps: ApprovalStep[]) => void> = new Set();

function notifyStepListeners(): void {
  const snapshot = [...stepQueue];
  stepListeners.forEach((fn) => fn(snapshot));
}

/** Register a step for user approval in Easy mode */
export function enqueueApprovalStep(action: string, label: string): string {
  const id = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  stepQueue.push({ id, action, label, status: 'awaiting', timestamp: Date.now() });
  notifyStepListeners();
  return id;
}

/** Mark a step as approved or rejected */
export function resolveApprovalStep(id: string, approved: boolean): void {
  const step = stepQueue.find((s) => s.id === id);
  if (step) {
    step.status = approved ? 'approved' : 'rejected';
    notifyStepListeners();
  }
}

/** Get all pending/awaiting steps */
export function getApprovalSteps(): readonly ApprovalStep[] {
  return stepQueue;
}

/** Clear completed steps */
export function clearResolvedSteps(): void {
  stepQueue = stepQueue.filter((s) => s.status === 'awaiting' || s.status === 'pending');
  notifyStepListeners();
}

/** Subscribe to step changes (for React components) */
export function onStepChange(listener: (steps: ApprovalStep[]) => void): () => void {
  stepListeners.add(listener);
  return () => { stepListeners.delete(listener); };
}

// IDENTITY_SEAL: PART-3 | role=easy-mode-steps | inputs=action,label | outputs=ApprovalStep[]
