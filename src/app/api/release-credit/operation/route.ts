import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/firebase-id-token";
import { checkSameOriginHeaders } from "@/lib/api-origin-guard";
import { apiLog, createRequestTimer } from "@/lib/api-logger";
import {
  applyReleaseCreditLedgerOperation,
  compactReleaseCreditScopeKey,
  type ReleaseCreditLedgerOperation,
  type ReleaseCreditLedgerOperationKind,
} from "@/lib/billing/release-credit-ledger";
import {
  getReleaseCreditLedgerStore,
  type ReleaseCreditLedgerLoadOk,
} from "@/lib/billing/release-credit-ledger-store";
import {
  getSubscriptionEntitlementStore,
  isPaidSubscriptionStatus,
} from "@/lib/billing/subscription-entitlement-store";
import {
  getCertificateProduct,
  normalizeLoreguardPlanId,
  type CertificateProductId,
  type LoreguardPlanId,
  type ReleaseEntitlementPlan,
} from "@/lib/billing/loreguard-plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID_REGEX = /^[A-Za-z0-9가-힣_-]{1,128}$/;
const PERIOD_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const CERTIFICATE_ID_REGEX = /^[A-Za-z0-9_-]{4,128}$/;
const IDEMPOTENCY_REGEX = /^[A-Za-z0-9:_-]{8,180}$/;
const PACKAGE_PROFILES = ["public-reader", "external-submission", "ip-sale", "internal-archive"] as const;
const PRODUCT_IDS = ["episode-basic", "episode-c2pa", "complete-basic", "complete-pro", "publisher-package"] as const;
const OPERATION_KINDS = ["purchase-grant", "refund-credit", "void-debit", "reissue-note"] as const;

interface OperationInput {
  kind: Exclude<ReleaseCreditLedgerOperationKind, "period-grant" | "issue-debit">;
  projectId: string;
  periodKey: string;
  idempotencyKey: string;
  creditAmount: number;
  packageProfileId: ReleaseEntitlementPlan["packageProfileId"] | null;
  productId: CertificateProductId | null;
  certificateId: string | null;
  reasonKo: string;
  fallbackPlanId: LoreguardPlanId | null;
}

function isInternalRequest(req: NextRequest): boolean {
  const expected = process.env.RELEASE_CREDIT_ADMIN_SECRET?.trim();
  if (!expected) return false;
  return req.headers.get("x-loreguard-admin-secret") === expected;
}

function parseOperationBody(raw: unknown): { input: OperationInput | null; issues: string[] } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const issues: string[] = [];

  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  if (!(OPERATION_KINDS as readonly string[]).includes(kind)) {
    issues.push(`kind: ${OPERATION_KINDS.join("|")} 중 하나여야 합니다.`);
  }

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  if (!PROJECT_ID_REGEX.test(projectId)) {
    issues.push("projectId: [A-Za-z0-9가-힣_-]{1,128} 형식이어야 합니다.");
  }

  const periodKey = typeof body.periodKey === "string" ? body.periodKey.trim() : "";
  if (!PERIOD_KEY_REGEX.test(periodKey)) {
    issues.push("periodKey: YYYY-MM 형식이어야 합니다.");
  }

  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (!IDEMPOTENCY_REGEX.test(idempotencyKey)) {
    issues.push("idempotencyKey: 8~180자의 안전한 문자열이어야 합니다.");
  }

  const creditAmountRaw = typeof body.creditAmount === "number" ? body.creditAmount : NaN;
  const creditAmount = Number.isFinite(creditAmountRaw) ? Math.floor(creditAmountRaw) : NaN;
  if (kind === "reissue-note") {
    if (creditAmount !== 0) issues.push("reissue-note: creditAmount는 0이어야 합니다.");
  } else if (!Number.isFinite(creditAmount) || creditAmount < 1 || creditAmount > 1000) {
    issues.push("creditAmount: 1~1000 사이 정수여야 합니다.");
  }

  let packageProfileId: OperationInput["packageProfileId"] = null;
  if (body.packageProfileId !== undefined && body.packageProfileId !== null && body.packageProfileId !== "") {
    const value = typeof body.packageProfileId === "string" ? body.packageProfileId.trim() : "";
    if ((PACKAGE_PROFILES as readonly string[]).includes(value)) {
      packageProfileId = value as OperationInput["packageProfileId"];
    } else {
      issues.push(`packageProfileId: ${PACKAGE_PROFILES.join("|")} 중 하나여야 합니다.`);
    }
  }

  let productId: OperationInput["productId"] = null;
  if (body.productId !== undefined && body.productId !== null && body.productId !== "") {
    const value = typeof body.productId === "string" ? body.productId.trim() : "";
    if ((PRODUCT_IDS as readonly string[]).includes(value)) {
      productId = value as CertificateProductId;
    } else {
      issues.push(`productId: ${PRODUCT_IDS.join("|")} 중 하나여야 합니다.`);
    }
  }

  let certificateId: string | null = null;
  if (body.certificateId !== undefined && body.certificateId !== null && body.certificateId !== "") {
    const value = typeof body.certificateId === "string" ? body.certificateId.trim() : "";
    if (!CERTIFICATE_ID_REGEX.test(value)) issues.push("certificateId: [A-Za-z0-9_-]{4,128} 형식이어야 합니다.");
    else certificateId = value;
  }

  const fallbackPlanId = normalizeLoreguardPlanId(body.fallbackPlanId);
  const reasonKo = typeof body.reasonKo === "string" && body.reasonKo.trim()
    ? body.reasonKo.trim().slice(0, 120)
    : defaultReasonKo(kind, productId);

  if (issues.length > 0) return { input: null, issues };
  return {
    input: {
      kind: kind as OperationInput["kind"],
      projectId,
      periodKey,
      idempotencyKey,
      creditAmount: kind === "reissue-note" ? 0 : creditAmount,
      packageProfileId,
      productId,
      certificateId,
      reasonKo,
      fallbackPlanId,
    },
    issues,
  };
}

function defaultReasonKo(kind: string, productId: CertificateProductId | null): string {
  const productLabel = productId ? getCertificateProduct(productId).labelKo : "출고 크레딧";
  if (kind === "purchase-grant") return `${productLabel} 별도 구매 반영`;
  if (kind === "refund-credit") return `${productLabel} 환불/복구 반영`;
  if (kind === "void-debit") return `${productLabel} 차감 취소`;
  return `${productLabel} 재발급 기록`;
}

async function loadOrCreateLedgerForOperation(input: {
  uid: string;
  periodKey: string;
  projectId: string;
  fallbackPlanId: LoreguardPlanId | null;
  allowFreeCreate: boolean;
}): Promise<
  | { ok: true; loaded: ReleaseCreditLedgerLoadOk; initialized: boolean }
  | { ok: false; error: string; status: number; messageKo: string }
> {
  const ledgerStore = getReleaseCreditLedgerStore();
  const loaded = await ledgerStore.load(input);
  if (loaded.ok) return { ok: true, loaded, initialized: false };
  if (loaded.error !== "not_found") {
    return {
      ok: false,
      error: loaded.error,
      status: loaded.error === "service_misconfigured" ? 503 : 502,
      messageKo: "출고 크레딧 원장을 불러오지 못했습니다.",
    };
  }

  const subscription = await getSubscriptionEntitlementStore().load(input.uid);
  const subscriptionPlan = subscription.ok && isPaidSubscriptionStatus(subscription.snapshot.status)
    ? subscription.snapshot.planId
    : null;
  const planId = subscriptionPlan ?? input.fallbackPlanId ?? (input.allowFreeCreate ? "free" : null);
  if (!planId) {
    return {
      ok: false,
      error: "ledger_missing",
      status: 409,
      messageKo: "원장이 없어 작업을 반영하지 않았습니다.",
    };
  }

  const created = await ledgerStore.create({
    uid: input.uid,
    periodKey: input.periodKey,
    projectId: input.projectId,
    planId,
  });
  if (!created.ok && created.error !== "conflict") {
    return {
      ok: false,
      error: created.error === "service_misconfigured" ? "service_misconfigured" : "ledger_create_failed",
      status: created.error === "service_misconfigured" ? 503 : 502,
      messageKo: "출고 크레딧 원장을 만들지 못했습니다.",
    };
  }

  const reloaded = await ledgerStore.load(input);
  if (!reloaded.ok) {
    return {
      ok: false,
      error: reloaded.error === "not_found" ? "ledger_initialize_retry" : reloaded.error,
      status: reloaded.error === "not_found" ? 409 : 502,
      messageKo: "원장 초기화가 완료되지 않았습니다. 잠시 뒤 다시 시도해 주세요.",
    };
  }
  return { ok: true, loaded: reloaded, initialized: true };
}

export async function POST(req: NextRequest) {
  const timer = createRequestTimer();
  const ip = getClientIp(req.headers);
  const originCheck = checkSameOriginHeaders(req.headers);
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  const rateLimit = await checkRateLimitAsync(ip, "/api/release-credit/operation", {
    windowMs: 60_000,
    maxRequests: 12,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const auth = await verifyFirebaseIdToken(authHeader.slice(7).trim());
  if (!auth) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { input, issues } = parseOperationBody(raw);
  if (!input) return NextResponse.json({ error: "invalid_input", issues }, { status: 400 });

  if (input.kind !== "reissue-note" && !isInternalRequest(req)) {
    return NextResponse.json(
      {
        error: "internal_authorization_required",
        messageKo: "구매·환불·복구 원장 작업은 서버 검증 이벤트에서만 처리합니다.",
      },
      { status: 403 },
    );
  }

  const ledgerResult = await loadOrCreateLedgerForOperation({
    uid: auth.uid,
    periodKey: input.periodKey,
    projectId: input.projectId,
    fallbackPlanId: input.fallbackPlanId,
    allowFreeCreate: input.kind === "purchase-grant",
  });
  if (!ledgerResult.ok) {
    return NextResponse.json(
      { error: ledgerResult.error, messageKo: ledgerResult.messageKo },
      { status: ledgerResult.status },
    );
  }

  const now = new Date().toISOString();
  const operation: ReleaseCreditLedgerOperation = {
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
    creditAmount: input.creditAmount,
    projectId: compactReleaseCreditScopeKey(input.projectId, "project-draft"),
    planId: ledgerResult.loaded.snapshot.planId,
    packageProfileId: input.packageProfileId,
    productId: input.productId,
    certificateId: input.certificateId,
    reasonKo: input.reasonKo,
    createdAt: now,
  };

  const applied = applyReleaseCreditLedgerOperation(ledgerResult.loaded.snapshot, operation);
  if (applied.status === "duplicate") {
    return NextResponse.json({
      ok: true,
      status: "duplicate",
      balance: applied.snapshot.balance,
      messageKo: applied.messageKo,
      ledgerUpdatedAt: applied.snapshot.updatedAt,
    });
  }
  if (applied.status !== "applied" || !applied.entry) {
    return NextResponse.json(
      { error: "invalid_ledger_operation", messageKo: applied.messageKo },
      { status: 409 },
    );
  }

  const saved = await getReleaseCreditLedgerStore().save({
    snapshot: applied.snapshot,
    expectedUpdateTime: ledgerResult.loaded.updateTime,
  });
  if (!saved.ok) {
    return NextResponse.json(
      {
        error: saved.error === "conflict" ? "ledger_conflict_retry" : "ledger_save_failed",
        messageKo:
          saved.error === "conflict"
            ? "원장이 동시에 갱신되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요."
            : "원장 작업을 저장하지 못했습니다.",
      },
      { status: saved.error === "conflict" ? 409 : 502 },
    );
  }

  apiLog({
    level: "info",
    event: "release_credit_operation_applied",
    route: "/api/release-credit/operation",
    ip,
    status: 200,
    durationMs: timer.elapsed(),
    meta: {
      uid: auth.uid,
      projectId: input.projectId,
      kind: input.kind,
      productId: input.productId,
      packageProfileId: input.packageProfileId,
      certificateId: input.certificateId,
      balance: applied.snapshot.balance,
      initialized: ledgerResult.initialized,
    },
  });

  return NextResponse.json({
    ok: true,
    status: "applied",
    initialized: ledgerResult.initialized,
    balance: applied.snapshot.balance,
    entry: applied.entry,
    ledgerUpdatedAt: applied.snapshot.updatedAt,
  });
}
