import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { verifyFirebaseIdToken } from "@/lib/firebase-id-token";
import { checkSameOriginHeaders } from "@/lib/api-origin-guard";
import { apiLog, createRequestTimer } from "@/lib/api-logger";
import { getStripeReleaseCreditSession } from "@/lib/stripe";
import {
  RELEASE_PRODUCT_REQUIREMENTS,
  resolveCertificateProductPriceId,
  type CertificateProductId,
} from "@/lib/billing/loreguard-plans";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID_REGEX = /^[A-Za-z0-9가-힣_-]{1,128}$/;
const PERIOD_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const CERTIFICATE_ID_REGEX = /^[A-Za-z0-9_-]{4,128}$/;

interface ReleaseCreditCheckoutInput {
  productId: CertificateProductId;
  projectId: string;
  periodKey: string;
  certificateId: string | null;
  returnUrl: string | undefined;
}

function parseBody(raw: unknown): { input: ReleaseCreditCheckoutInput | null; issues: string[] } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const issues: string[] = [];

  const rawProductId = typeof body.productId === "string" ? body.productId.trim() : "";
  const productId = rawProductId in RELEASE_PRODUCT_REQUIREMENTS ? rawProductId as CertificateProductId : null;
  if (!productId) issues.push("productId: 지원하는 출고 상품이어야 합니다.");

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  if (!PROJECT_ID_REGEX.test(projectId)) issues.push("projectId: [A-Za-z0-9가-힣_-]{1,128} 형식이어야 합니다.");

  const periodKey = typeof body.periodKey === "string" ? body.periodKey.trim() : "";
  if (!PERIOD_KEY_REGEX.test(periodKey)) issues.push("periodKey: YYYY-MM 형식이어야 합니다.");

  let certificateId: string | null = null;
  if (body.certificateId !== undefined && body.certificateId !== null && body.certificateId !== "") {
    const value = typeof body.certificateId === "string" ? body.certificateId.trim() : "";
    if (!CERTIFICATE_ID_REGEX.test(value)) issues.push("certificateId: [A-Za-z0-9_-]{4,128} 형식이어야 합니다.");
    else certificateId = value;
  }

  const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : undefined;
  if (issues.length > 0) return { input: null, issues };
  return { input: { productId: productId as CertificateProductId, projectId, periodKey, certificateId, returnUrl }, issues };
}

export async function POST(req: NextRequest) {
  const timer = createRequestTimer();
  const ip = getClientIp(req.headers);
  const originCheck = checkSameOriginHeaders(req.headers);
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.FEATURE_STRIPE_CHECKOUT !== "on") {
    return NextResponse.json({ error: "checkout_disabled" }, { status: 503 });
  }

  const rateLimit = await checkRateLimitAsync(ip, "/api/release-credit/checkout", {
    windowMs: 60_000,
    maxRequests: 10,
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

  const { input, issues } = parseBody(raw);
  if (!input) return NextResponse.json({ error: "invalid_input", issues }, { status: 400 });

  const requirement = RELEASE_PRODUCT_REQUIREMENTS[input.productId];
  if (requirement.requiredCredits === null) {
    return NextResponse.json({ error: "checkout_product_not_supported" }, { status: 400 });
  }

  const price = resolveCertificateProductPriceId(input.productId, process.env);
  if (!price.checkoutEligible || !price.priceId) {
    return NextResponse.json({ error: "certificate_price_not_configured" }, { status: 501 });
  }

  try {
    const session = await getStripeReleaseCreditSession({
      priceId: price.priceId,
      returnUrl: input.returnUrl,
      firebaseUid: auth.uid,
      projectId: input.projectId,
      periodKey: input.periodKey,
      productId: input.productId,
      packageProfileId: requirement.packageProfileId,
      creditAmount: requirement.requiredCredits,
      certificateId: input.certificateId,
    });
    if (!session.url) {
      return NextResponse.json({ error: "checkout_session_failed" }, { status: 500 });
    }
    apiLog({
      level: "info",
      event: "release_credit_checkout_created",
      route: "/api/release-credit/checkout",
      ip,
      status: 200,
      durationMs: timer.elapsed(),
      meta: {
        uid: auth.uid,
        projectId: input.projectId,
        productId: input.productId,
        creditAmount: requirement.requiredCredits,
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    logger.error("api/release-credit/checkout", "checkout error", err);
    return NextResponse.json({ error: "checkout_session_failed" }, { status: 500 });
  }
}
