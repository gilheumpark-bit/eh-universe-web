import {
  buildReleaseEntitlementPlan,
  getLoreguardPlan,
  type CertificateProductId,
  type LoreguardPlanId,
  type ReleaseEntitlementPlan,
} from "./loreguard-plans";

export const RELEASE_CREDIT_POLICY_CHECKED_AT = "2026-06-14";

export type ReleaseCreditLedgerStatus =
  | "included"
  | "unlimited"
  | "separate-purchase"
  | "upgrade";

export interface ReleaseCreditPreviewInput {
  planId: LoreguardPlanId;
  packageProfileId: ReleaseEntitlementPlan["packageProfileId"];
  projectId?: string | null;
  workTitle?: string | null;
  certificateId?: string | null;
  availableCreditsOverride?: number | null;
}

export interface ReleaseCreditLedgerEventDraft {
  idempotencyKey: string;
  projectId: string;
  projectScoped: boolean;
  certificateId: string | null;
  packageProfileId: ReleaseEntitlementPlan["packageProfileId"];
  planId: LoreguardPlanId;
  requiredCredits: number;
  availableCredits: number;
  remainingCredits: number | null;
  productLabelKo: string;
  productPriceKrw: number;
  statusKo: string;
  projectScopeNoteKo: string;
  checkedAt: string;
}

export interface ReleaseCreditPreview {
  entitlement: ReleaseEntitlementPlan;
  status: ReleaseCreditLedgerStatus;
  canUseIncludedCredits: boolean;
  purchaseRequired: boolean;
  upgradeRecommended: boolean;
  requiredCredits: number;
  availableCredits: number;
  remainingCredits: number | null;
  projectScoped: boolean;
  projectScopeNoteKo: string;
  debitPreviewKo: string;
  receiptDraftKo: string;
  ledgerNoteKo: string;
  eventDraft: ReleaseCreditLedgerEventDraft;
}

export type ReleaseCreditLedgerOperationKind =
  | "period-grant"
  | "purchase-grant"
  | "issue-debit"
  | "refund-credit"
  | "void-debit"
  | "reissue-note";

export type ReleaseCreditLedgerApplyStatus =
  | "applied"
  | "duplicate"
  | "insufficient-credits"
  | "invalid-operation";

export interface ReleaseCreditLedgerOperation {
  kind: ReleaseCreditLedgerOperationKind;
  idempotencyKey: string;
  creditAmount: number;
  projectId: string;
  planId: LoreguardPlanId;
  packageProfileId?: ReleaseEntitlementPlan["packageProfileId"] | null;
  productId?: CertificateProductId | null;
  certificateId?: string | null;
  reasonKo: string;
  createdAt: string;
}

export interface ReleaseCreditLedgerEntry extends ReleaseCreditLedgerOperation {
  balanceBefore: number | null;
  balanceAfter: number | null;
}

export interface ReleaseCreditLedgerSnapshot {
  kind: "loreguard.release-credit-ledger.v1";
  userId: string;
  planId: LoreguardPlanId;
  periodKey: string;
  projectId: string;
  unlimited: boolean;
  balance: number | null;
  entries: readonly ReleaseCreditLedgerEntry[];
  updatedAt: string;
}

export interface ReleaseCreditLedgerApplyResult {
  status: ReleaseCreditLedgerApplyStatus;
  snapshot: ReleaseCreditLedgerSnapshot;
  entry: ReleaseCreditLedgerEntry | null;
  messageKo: string;
}

function stableScopeHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function compactReleaseCreditScopeKey(value: string | null | undefined, fallback: string): string {
  const normalized = (value ?? "").trim().toLowerCase();
  const compacted = normalized
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!compacted) return fallback;
  if (compacted.length <= 48) return compacted;
  const suffix = stableScopeHash(normalized).slice(0, 8);
  return `${compacted.slice(0, 39)}-${suffix}`;
}

function formatCreditCountKo(value: number): string {
  if (value < 0) return "무제한";
  return `${value}개`;
}

function resolveStatus(input: {
  entitlement: ReleaseEntitlementPlan;
  availableCredits: number;
}): ReleaseCreditLedgerStatus {
  if (input.entitlement.includedCredits < 0) return "unlimited";
  if (input.entitlement.status === "upgrade") return "upgrade";
  if (input.entitlement.status === "separate-purchase") return "separate-purchase";
  return input.availableCredits >= input.entitlement.requiredCredits ? "included" : "separate-purchase";
}

function statusLabelKo(status: ReleaseCreditLedgerStatus): string {
  if (status === "included") return "포함 크레딧 사용 가능";
  if (status === "unlimited") return "조직 권한 협의";
  if (status === "upgrade") return "상위 권한 검토";
  return "별도 구매 필요";
}

function normalizePositiveCredits(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : null;
}

function operationDelta(operation: ReleaseCreditLedgerOperation): number | null {
  const creditAmount = normalizePositiveCredits(operation.creditAmount);
  if (creditAmount === null) return null;
  if (operation.kind === "issue-debit") return -creditAmount;
  if (operation.kind === "reissue-note") return 0;
  return creditAmount;
}

export function createReleaseCreditLedgerSnapshot(input: {
  userId: string;
  planId: LoreguardPlanId;
  periodKey: string;
  projectId?: string | null;
  createdAt?: string;
}): ReleaseCreditLedgerSnapshot {
  const plan = getLoreguardPlan(input.planId);
  const projectId = compactReleaseCreditScopeKey(input.projectId, "account-ledger");
  const createdAt = input.createdAt ?? new Date().toISOString();
  const unlimited = plan.certificateEpisodeAllowance < 0;
  const balance = unlimited ? null : plan.certificateEpisodeAllowance;
  const grantEntry: ReleaseCreditLedgerEntry = {
    kind: "period-grant",
    idempotencyKey: [
      "release-credit-period-grant",
      compactReleaseCreditScopeKey(input.userId, "user"),
      input.periodKey,
      input.planId,
      projectId,
    ].join(":"),
    creditAmount: unlimited ? 0 : plan.certificateEpisodeAllowance,
    projectId,
    planId: input.planId,
    packageProfileId: null,
    productId: null,
    certificateId: null,
    reasonKo: unlimited ? "조직 권한 출고 크레딧 협의" : "구독 권한 포함 출고 크레딧 지급",
    createdAt,
    balanceBefore: unlimited ? null : 0,
    balanceAfter: balance,
  };

  return {
    kind: "loreguard.release-credit-ledger.v1",
    userId: input.userId,
    planId: input.planId,
    periodKey: input.periodKey,
    projectId,
    unlimited,
    balance,
    entries: Object.freeze([grantEntry]),
    updatedAt: createdAt,
  };
}

export function buildReleaseCreditDebitOperationFromPreview(
  preview: ReleaseCreditPreview,
  input: {
    createdAt: string;
    reasonKo?: string;
  },
): ReleaseCreditLedgerOperation {
  return {
    kind: "issue-debit",
    idempotencyKey: preview.eventDraft.idempotencyKey.replace(
      /^release-credit-preview:/,
      "release-credit-debit:",
    ),
    creditAmount: preview.requiredCredits,
    projectId: preview.eventDraft.projectId,
    planId: preview.eventDraft.planId,
    packageProfileId: preview.eventDraft.packageProfileId,
    productId: preview.entitlement.productId,
    certificateId: preview.eventDraft.certificateId,
    reasonKo: input.reasonKo ?? `${preview.entitlement.productLabelKo} 발급 차감`,
    createdAt: input.createdAt,
  };
}

export function applyReleaseCreditLedgerOperation(
  snapshot: ReleaseCreditLedgerSnapshot,
  operation: ReleaseCreditLedgerOperation,
): ReleaseCreditLedgerApplyResult {
  if (snapshot.entries.some((entry) => entry.idempotencyKey === operation.idempotencyKey)) {
    return {
      status: "duplicate",
      snapshot,
      entry: null,
      messageKo: "같은 원장 키로 이미 처리된 작업입니다.",
    };
  }

  const delta = operationDelta(operation);
  if (delta === null || operation.projectId !== snapshot.projectId || operation.planId !== snapshot.planId) {
    return {
      status: "invalid-operation",
      snapshot,
      entry: null,
      messageKo: "원장 범위와 맞지 않는 작업입니다.",
    };
  }

  const balanceBefore = snapshot.balance;
  if (!snapshot.unlimited && balanceBefore !== null && balanceBefore + delta < 0) {
    return {
      status: "insufficient-credits",
      snapshot,
      entry: null,
      messageKo: "출고 크레딧이 부족해 차감하지 않았습니다.",
    };
  }

  const balanceAfter = snapshot.unlimited || balanceBefore === null ? null : balanceBefore + delta;
  const entry: ReleaseCreditLedgerEntry = {
    ...operation,
    creditAmount: normalizePositiveCredits(operation.creditAmount) ?? operation.creditAmount,
    balanceBefore,
    balanceAfter,
  };

  return {
    status: "applied",
    snapshot: {
      ...snapshot,
      balance: balanceAfter,
      entries: Object.freeze([...snapshot.entries, entry]),
      updatedAt: operation.createdAt,
    },
    entry,
    messageKo: "출고 크레딧 원장에 반영했습니다.",
  };
}

export function buildReleaseCreditPreview(input: ReleaseCreditPreviewInput): ReleaseCreditPreview {
  const entitlement = buildReleaseEntitlementPlan({
    planId: input.planId,
    packageProfileId: input.packageProfileId,
  });
  const availableCredits = input.availableCreditsOverride ?? entitlement.includedCredits;
  const status = resolveStatus({ entitlement, availableCredits });
  const canUseIncludedCredits = status === "included" || status === "unlimited";
  const purchaseRequired = status === "separate-purchase";
  const upgradeRecommended = status === "upgrade";
  const remainingCredits =
    status === "unlimited"
      ? null
      : canUseIncludedCredits
        ? Math.max(0, availableCredits - entitlement.requiredCredits)
        : Math.max(0, availableCredits);
  const projectScoped = Boolean(input.projectId?.trim());
  const projectId = compactReleaseCreditScopeKey(input.projectId, "project-draft");
  const workTitle = compactReleaseCreditScopeKey(input.workTitle, "untitled");
  const certificateId = input.certificateId?.trim() || null;
  const idempotencyKey = [
    "release-credit-preview",
    projectId,
    workTitle,
    input.packageProfileId,
    input.planId,
    certificateId ?? "no-certificate",
  ].join(":");

  const requiredKo = formatCreditCountKo(entitlement.requiredCredits);
  const availableKo = formatCreditCountKo(availableCredits);
  const remainingKo = remainingCredits === null ? "협의" : formatCreditCountKo(remainingCredits);
  const debitPreviewKo =
    status === "included"
      ? `${entitlement.productLabelKo} 발급 시 ${requiredKo} 사용, 차감 후 ${remainingKo} 남습니다.`
      : status === "unlimited"
        ? `${entitlement.productLabelKo}는 조직 원장에서 수량 협의 후 기록합니다.`
        : status === "upgrade"
          ? `${entitlement.productLabelKo}는 현재 권한보다 높은 출고 구성이 자연스럽습니다.`
          : `${entitlement.productLabelKo}는 포함 크레딧 ${availableKo}로 부족해 별도 구매가 필요합니다.`;
  const receiptDraftKo =
    status === "included"
      ? `${entitlement.productLabelKo} · ${requiredKo} 사용 예정 · 잔여 ${remainingKo}`
      : status === "unlimited"
        ? `${entitlement.productLabelKo} · 조직 원장 기록 예정`
        : status === "upgrade"
          ? `${entitlement.productLabelKo} · 상위 권한 검토 후 발급`
          : `${entitlement.productLabelKo} · 별도 구매 후 발급`;
  const ledgerNoteKo =
    !projectScoped
      ? "프로젝트가 확정되기 전에는 실제 차감 원장을 만들지 않습니다."
      : status === "included"
      ? "실제 차감은 결제/발급 승인 이후 서버 원장에서 처리합니다."
      : status === "unlimited"
        ? "조직 계약 조건에 따라 발급 원장만 남깁니다."
        : status === "upgrade"
          ? "현재 화면에서는 구매를 실행하지 않고 필요한 권한만 안내합니다."
          : "현재 화면에서는 구매를 실행하지 않고 필요한 상품만 안내합니다.";
  const projectScopeNoteKo = projectScoped
    ? `프로젝트 ${projectId} 기준으로 원장 키를 분리합니다.`
    : "프로젝트 선택 후 작품별 원장으로 분리됩니다.";

  return {
    entitlement,
    status,
    canUseIncludedCredits,
    purchaseRequired,
    upgradeRecommended,
    requiredCredits: entitlement.requiredCredits,
    availableCredits,
    remainingCredits,
    projectScoped,
    projectScopeNoteKo,
    debitPreviewKo,
    receiptDraftKo,
    ledgerNoteKo,
    eventDraft: {
      idempotencyKey,
      projectId,
      projectScoped,
      certificateId,
      packageProfileId: input.packageProfileId,
      planId: input.planId,
      requiredCredits: entitlement.requiredCredits,
      availableCredits,
      remainingCredits,
      productLabelKo: entitlement.productLabelKo,
      productPriceKrw: entitlement.productPriceKrw,
      statusKo: statusLabelKo(status),
      projectScopeNoteKo,
      checkedAt: RELEASE_CREDIT_POLICY_CHECKED_AT,
    },
  };
}
