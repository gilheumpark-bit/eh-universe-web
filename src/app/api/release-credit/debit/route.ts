import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/firebase-id-token";
import {
  applyReleaseCreditLedgerOperation,
  buildReleaseCreditDebitOperationFromPreview,
  buildReleaseCreditPreview,
} from "@/lib/billing/release-credit-ledger";
import {
  getReleaseCreditLedgerStore,
  type ReleaseCreditLedgerLoadOk,
} from "@/lib/billing/release-credit-ledger-store";
import {
  getSubscriptionEntitlementStore,
  isPaidSubscriptionStatus,
} from "@/lib/billing/subscription-entitlement-store";
import type { ReleaseEntitlementPlan } from "@/lib/billing/loreguard-plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID_REGEX = /^[A-Za-z0-9가-힣_-]{1,128}$/;
const PERIOD_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const CERTIFICATE_ID_REGEX = /^[A-Za-z0-9_-]{4,128}$/;
const PACKAGE_PROFILES = [
  "public-reader",
  "external-submission",
  "ip-sale",
  "internal-archive",
] as const satisfies readonly ReleaseEntitlementPlan["packageProfileId"][];

interface DebitInput {
  projectId: string;
  periodKey: string;
  packageProfileId: ReleaseEntitlementPlan["packageProfileId"];
  certificateId: string;
  workTitle: string | null;
}

function currentPeriodKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function parseDebitBody(raw: unknown): { input: DebitInput | null; issues: string[] } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const issues: string[] = [];

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  if (!PROJECT_ID_REGEX.test(projectId)) {
    issues.push("projectId: [A-Za-z0-9가-힣_-]{1,128} 형식이어야 합니다.");
  }

  const periodKey = typeof body.periodKey === "string" && body.periodKey.trim()
    ? body.periodKey.trim()
    : currentPeriodKey();
  if (!PERIOD_KEY_REGEX.test(periodKey)) {
    issues.push("periodKey: YYYY-MM 형식이어야 합니다.");
  }

  const packageProfileId = typeof body.packageProfileId === "string"
    ? body.packageProfileId.trim()
    : "";
  if (!(PACKAGE_PROFILES as readonly string[]).includes(packageProfileId)) {
    issues.push(`packageProfileId: ${PACKAGE_PROFILES.join("|")} 중 하나여야 합니다.`);
  }

  const certificateId = typeof body.certificateId === "string" ? body.certificateId.trim() : "";
  if (!CERTIFICATE_ID_REGEX.test(certificateId)) {
    issues.push("certificateId: [A-Za-z0-9_-]{4,128} 형식이어야 합니다.");
  }

  let workTitle: string | null = null;
  if (typeof body.workTitle === "string") {
    const trimmed = body.workTitle.trim();
    if (trimmed.length > 120) issues.push("workTitle: 120자 이하로 입력해야 합니다.");
    else workTitle = trimmed || null;
  }

  if (issues.length > 0) return { input: null, issues };
  return {
    input: {
      projectId,
      periodKey,
      packageProfileId: packageProfileId as ReleaseEntitlementPlan["packageProfileId"],
      certificateId,
      workTitle,
    },
    issues,
  };
}

async function loadOrInitializeProjectLedger(input: {
  uid: string;
  periodKey: string;
  projectId: string;
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
  if (!subscription.ok) {
    return {
      ok: false,
      error: "ledger_missing",
      status: 409,
      messageKo: "아직 이 프로젝트의 출고 크레딧 원장이 없습니다. 결제 동기화 또는 원장 초기화가 먼저 필요합니다.",
    };
  }
  if (!isPaidSubscriptionStatus(subscription.snapshot.status)) {
    return {
      ok: false,
      error: "subscription_not_active",
      status: 403,
      messageKo: "구독 상태가 활성화된 뒤 출고 크레딧 원장을 만들 수 있습니다.",
    };
  }

  const created = await ledgerStore.create({
    uid: input.uid,
    periodKey: input.periodKey,
    projectId: input.projectId,
    planId: subscription.snapshot.planId,
  });
  if (!created.ok && created.error !== "conflict") {
    return {
      ok: false,
      error: created.error === "service_misconfigured" ? "service_misconfigured" : "ledger_create_failed",
      status: created.error === "service_misconfigured" ? 503 : 502,
      messageKo: "프로젝트 출고 크레딧 원장을 만들지 못했습니다.",
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
  const ip = getClientIp(req.headers);
  const rateLimit = await checkRateLimitAsync(ip, "/api/release-credit/debit", {
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
  if (!auth) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { input, issues } = parseDebitBody(raw);
  if (!input) {
    return NextResponse.json({ error: "invalid_input", issues }, { status: 400 });
  }

  const ledgerResult = await loadOrInitializeProjectLedger({
    uid: auth.uid,
    periodKey: input.periodKey,
    projectId: input.projectId,
  });
  if (!ledgerResult.ok) {
    return NextResponse.json(
      {
        error: ledgerResult.error,
        messageKo: ledgerResult.messageKo,
      },
      { status: ledgerResult.status },
    );
  }
  const { loaded } = ledgerResult;

  const now = new Date().toISOString();
  const preview = buildReleaseCreditPreview({
    planId: loaded.snapshot.planId,
    packageProfileId: input.packageProfileId,
    projectId: loaded.snapshot.projectId,
    workTitle: input.workTitle,
    certificateId: input.certificateId,
    availableCreditsOverride: loaded.snapshot.balance,
  });
  const operation = buildReleaseCreditDebitOperationFromPreview(preview, {
    createdAt: now,
  });
  const result = applyReleaseCreditLedgerOperation(loaded.snapshot, operation);

  if (result.status === "duplicate") {
    return NextResponse.json({
      ok: true,
      status: "duplicate",
      messageKo: result.messageKo,
      balance: result.snapshot.balance,
      ledgerUpdatedAt: result.snapshot.updatedAt,
    });
  }

  if (result.status === "insufficient-credits") {
    return NextResponse.json(
      {
        error: "insufficient_release_credits",
        messageKo: result.messageKo,
        requiredCredits: operation.creditAmount,
        balance: loaded.snapshot.balance,
      },
      { status: 409 },
    );
  }

  if (result.status !== "applied" || !result.entry) {
    return NextResponse.json(
      { error: "invalid_ledger_operation", messageKo: result.messageKo },
      { status: 409 },
    );
  }

  const saved = await getReleaseCreditLedgerStore().save({
    snapshot: result.snapshot,
    expectedUpdateTime: loaded.updateTime,
  });
  if (!saved.ok) {
    const status = saved.error === "conflict" ? 409 : saved.error === "service_misconfigured" ? 503 : 502;
    return NextResponse.json(
      {
        error: saved.error === "conflict" ? "ledger_conflict_retry" : "ledger_save_failed",
        messageKo:
          saved.error === "conflict"
            ? "원장이 동시에 갱신되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요."
            : "차감 결과를 저장하지 못했습니다.",
      },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "applied",
    initialized: ledgerResult.initialized,
    balance: result.snapshot.balance,
    entry: result.entry,
    ledgerUpdatedAt: result.snapshot.updatedAt,
  });
}
