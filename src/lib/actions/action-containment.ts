// ============================================================
// action-containment — Agentic action execution policy
// ============================================================
// Role:    Decide whether a registered action may execute and emit an
//          auditable allow/deny trace.
// Banned:  Executing actions without an explicit allow decision.
// Input:   ActionDef/RegisteredAction + invocation context.
// Output:  Containment decision and trace.
// Depends: action-registry types only.
// ============================================================

import type { ActionArea, ActionCategory, ActionDef, RegisteredAction } from './action-registry';

export type ActionInvocationSource = 'human' | 'agent';

export interface ActionLicenseGrant {
  actionIds?: readonly string[];
  categories?: readonly ActionCategory[];
  allowDestructive?: boolean;
  reason?: string;
  expiresAt?: number;
}

export interface ActionContainmentContext {
  currentArea: ActionArea;
  source: ActionInvocationSource;
  grant?: ActionLicenseGrant;
  confirmedActionIds?: readonly string[];
  now?: number;
}

export type ActionContainmentReason =
  | 'allowed'
  | 'action-disabled'
  | 'area-mismatch'
  | 'agent-license-missing'
  | 'destructive-confirmation-missing'
  | 'destructive-license-missing'
  | 'license-expired';

export interface ActionContainmentTrace {
  traceId: string;
  actionId: string;
  currentArea: ActionArea;
  actionArea: ActionArea;
  category: ActionCategory;
  source: ActionInvocationSource;
  allowed: boolean;
  reason: ActionContainmentReason;
  grantReason: string | null;
  timestamp: number;
}

export type ActionContainmentDecision =
  | { allowed: true; trace: ActionContainmentTrace }
  | { allowed: false; trace: ActionContainmentTrace };

function hasValue(values: readonly string[] | undefined, value: string): boolean {
  return Array.isArray(values) && values.includes(value);
}

function isAreaAllowed(def: ActionDef, currentArea: ActionArea): boolean {
  return def.area === currentArea || def.area === 'global';
}

function isAgentLicensed(def: ActionDef, grant: ActionLicenseGrant | undefined, now: number): ActionContainmentReason {
  if (!grant) return 'agent-license-missing';
  if (typeof grant.expiresAt === 'number' && grant.expiresAt < now) return 'license-expired';
  if (hasValue(grant.actionIds, def.id)) return 'allowed';
  if (hasValue(grant.categories, def.category)) return 'allowed';
  return 'agent-license-missing';
}

function buildTrace(
  def: ActionDef,
  ctx: Required<Pick<ActionContainmentContext, 'currentArea' | 'source'>> & ActionContainmentContext,
  reason: ActionContainmentReason,
  now: number,
): ActionContainmentTrace {
  return {
    traceId: `act-${now}-${def.id.replace(/[^a-z0-9:-]/gi, '_')}-${reason}`,
    actionId: def.id,
    currentArea: ctx.currentArea,
    actionArea: def.area,
    category: def.category,
    source: ctx.source,
    allowed: reason === 'allowed',
    reason,
    grantReason: ctx.grant?.reason ?? null,
    timestamp: now,
  };
}

export function evaluateActionContainment(
  def: ActionDef,
  ctx: ActionContainmentContext,
): ActionContainmentDecision {
  const now = ctx.now ?? Date.now();
  let reason: ActionContainmentReason = 'allowed';

  if (def.enabled === false) {
    reason = 'action-disabled';
  } else if (!isAreaAllowed(def, ctx.currentArea)) {
    reason = 'area-mismatch';
  } else if (ctx.source === 'agent') {
    reason = isAgentLicensed(def, ctx.grant, now);
  }

  if (reason === 'allowed' && def.destructive) {
    const confirmed = hasValue(ctx.confirmedActionIds, def.id);
    const licensed = ctx.grant?.allowDestructive === true;
    if (!confirmed) reason = 'destructive-confirmation-missing';
    else if (ctx.source === 'agent' && !licensed) reason = 'destructive-license-missing';
  }

  const trace = buildTrace(def, ctx, reason, now);
  return trace.allowed ? { allowed: true, trace } : { allowed: false, trace };
}

export async function runContainedAction(
  action: RegisteredAction,
  ctx: ActionContainmentContext,
  onTrace?: (trace: ActionContainmentTrace) => void,
): Promise<ActionContainmentDecision> {
  const decision = evaluateActionContainment(action, ctx);
  onTrace?.(decision.trace);
  if (!decision.allowed) return decision;
  await action.action();
  return decision;
}

// IDENTITY_SEAL: action-containment | role=pre-execution policy gate | inputs=ActionDef+context | outputs=allow-deny trace
