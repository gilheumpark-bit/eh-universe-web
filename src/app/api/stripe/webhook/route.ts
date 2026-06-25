// ============================================================
// /api/stripe/webhook — Stripe webhook event handler
// ============================================================
// [A4 2026-04-24] Stripe 결제 이벤트 수신 + 시그너처 검증 + 구조화 로깅.
//
// [REVENUE PATH 2026-06-06 wired] checkout.session.completed → setStripeRoleClaim(uid) 배선 완료.
//   - uid: checkout 시 client_reference_id / subscription metadata 에 심은 신뢰값(인증된 auth.uid).
//   - claim set: firebase-auth-admin-rest.ts (Identity Toolkit accounts:update + service-account JWT).
//   - subscription.deleted → clearStripeRoleClaim. 모든 claim 동기화 fail-safe (실패해도 webhook 200).
//   ⚠️ 활성 조건(사용자 config): VERTEX_AI_CREDENTIALS service account 에 **Firebase Authentication Admin**
//      역할 부여 + Identity Toolkit 엔드포인트/스코프 런타임 검증. claim 은 다음 ID token refresh 시 전파.
//
// 현재 범위: 시그너처 검증 + 주요 이벤트 dispatch + apiLog.
//
// 설정 가이드:
//   1) Stripe Dashboard → Webhooks → Endpoint 추가
//   2) URL: https://ehsu.app/api/stripe/webhook
//   3) 이벤트: checkout.session.completed · customer.subscription.* · invoice.paid · invoice.payment_failed
//   4) Signing secret 을 STRIPE_WEBHOOK_SECRET 환경 변수에 설정
//   5) STRIPE_SECRET_KEY 도 Vercel 환경 변수에 설정 (Production scope 한정)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiLog } from '@/lib/api-logger';
import { sendReceiptEmail, sendPaymentFailedEmail } from '@/lib/email-service';
import { setStripeRoleClaim, clearStripeRoleClaim } from '@/lib/firebase-auth-admin-rest';
import { firestoreCreateDocument, firestoreGetDocument } from '@/lib/firestore-service-rest';
import {
  applyReleaseCreditLedgerOperation,
  compactReleaseCreditScopeKey,
  type ReleaseCreditLedgerOperation,
} from '@/lib/billing/release-credit-ledger';
import { getReleaseCreditLedgerStore } from '@/lib/billing/release-credit-ledger-store';
import {
  getSubscriptionEntitlementStore,
  isPaidSubscriptionStatus,
  normalizeStripeSubscriptionStatus,
  resolvePlanIdFromStripeMetadata,
  type SubscriptionEntitlementStatus,
} from '@/lib/billing/subscription-entitlement-store';
import {
  getCertificateProduct,
  RELEASE_PRODUCT_REQUIREMENTS,
  type CertificateProductId,
  type LoreguardPlanId,
  type ReleaseEntitlementPlan,
} from '@/lib/billing/loreguard-plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** stripeRole claim 동기화 + 결과 로그. claim setter 가 fail-safe 라 throw 없음. */
async function applyStripeRoleClaim(uid: string, action: 'set' | 'clear', eventId: string): Promise<void> {
  const result = action === 'set' ? await setStripeRoleClaim(uid) : await clearStripeRoleClaim(uid);
  apiLog({
    level: result.ok ? 'info' : 'warn',
    event: result.ok ? 'stripe_claim_synced' : 'stripe_claim_sync_failed',
    route: '/api/stripe/webhook',
    meta: result.ok ? { action, eventId } : { action, eventId, error: result.error },
  });
}

function stripeObjectId(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

async function syncSubscriptionEntitlement(input: {
  uid: string;
  planId: LoreguardPlanId | null;
  status: SubscriptionEntitlementStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  eventId: string;
}): Promise<void> {
  if (!input.uid || !input.planId) {
    apiLog({
      level: 'warn',
      event: 'stripe_subscription_entitlement_skipped',
      route: '/api/stripe/webhook',
      meta: {
        eventId: input.eventId,
        reason: !input.uid ? 'missing_uid' : 'missing_plan_id',
      },
    });
    return;
  }

  const result = await getSubscriptionEntitlementStore().upsert({
    uid: input.uid,
    planId: input.planId,
    status: input.status,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    sourceEventId: input.eventId,
    updatedAt: new Date().toISOString(),
  });
  apiLog({
    level: result.ok ? 'info' : 'warn',
    event: result.ok ? 'stripe_subscription_entitlement_synced' : 'stripe_subscription_entitlement_failed',
    route: '/api/stripe/webhook',
    meta: result.ok
      ? { eventId: input.eventId, planId: input.planId, status: input.status }
      : { eventId: input.eventId, planId: input.planId, status: input.status, error: result.error },
  });
}

function metadataValue(metadata: Stripe.Metadata | null | undefined, key: string): string {
  return typeof metadata?.[key] === 'string' ? metadata[key] : '';
}

function parseReleaseCreditPurchaseMetadata(
  session: Stripe.Checkout.Session,
): {
  uid: string;
  projectId: string;
  periodKey: string;
  productId: CertificateProductId;
  packageProfileId: ReleaseEntitlementPlan['packageProfileId'];
  creditAmount: number;
  certificateId: string | null;
} | null {
  const metadata = session.metadata;
  const uid = metadataValue(metadata, 'firebaseUid') || (typeof session.client_reference_id === 'string' ? session.client_reference_id : '');
  const projectId = metadataValue(metadata, 'projectId');
  const periodKey = metadataValue(metadata, 'periodKey');
  const productId = metadataValue(metadata, 'loreguardProductId') as CertificateProductId;
  const packageProfileId = metadataValue(metadata, 'loreguardPackageProfileId') as ReleaseEntitlementPlan['packageProfileId'];
  const creditAmount = Number.parseInt(metadataValue(metadata, 'releaseCreditAmount'), 10);
  const certificateId = metadataValue(metadata, 'certificateId') || null;

  if (!uid || !projectId || !periodKey) return null;
  if (!(productId in RELEASE_PRODUCT_REQUIREMENTS)) return null;
  if (RELEASE_PRODUCT_REQUIREMENTS[productId].packageProfileId !== packageProfileId) return null;
  if (!Number.isFinite(creditAmount) || creditAmount < 1) return null;
  return { uid, projectId, periodKey, productId, packageProfileId, creditAmount, certificateId };
}

/**
 * [C1 fix] 재시도 가능한 일시 장애 마커. 이 에러로 throw 된 경우에만 webhook 이 500 을 반환해
 * Stripe 재전송을 유도한다. (구독·환불·이메일 등 self-heal/멱등 경로는 기존 fail-safe 200 유지.)
 */
class RetryableWebhookError extends Error {}

async function syncReleaseCreditPurchase(session: Stripe.Checkout.Session, eventId: string): Promise<void> {
  const parsed = parseReleaseCreditPurchaseMetadata(session);
  if (!parsed) {
    apiLog({
      level: 'warn',
      event: 'stripe_release_credit_purchase_skipped',
      route: '/api/stripe/webhook',
      meta: { eventId, reason: 'invalid_metadata' },
    });
    return;
  }

  const ledgerStore = getReleaseCreditLedgerStore();
  let loaded = await ledgerStore.load({
    uid: parsed.uid,
    periodKey: parsed.periodKey,
    projectId: parsed.projectId,
  });

  if (!loaded.ok && loaded.error === 'not_found') {
    const subscription = await getSubscriptionEntitlementStore().load(parsed.uid);
    const planId = subscription.ok && isPaidSubscriptionStatus(subscription.snapshot.status)
      ? subscription.snapshot.planId
      : 'free';
    const created = await ledgerStore.create({
      uid: parsed.uid,
      periodKey: parsed.periodKey,
      projectId: parsed.projectId,
      planId,
    });
    if (!created.ok && created.error !== 'conflict') {
      apiLog({
        level: 'warn',
        event: 'stripe_release_credit_ledger_create_failed',
        route: '/api/stripe/webhook',
        meta: { eventId, error: created.error },
      });
      // [C1 fix] 일시 장애 → throw 하여 핸들러가 500 반환·Stripe 재시도 (멱등키로 안전).
      throw new RetryableWebhookError(`release_credit_purchase ledger create failed: ${created.error}`);
    }
    loaded = await ledgerStore.load({
      uid: parsed.uid,
      periodKey: parsed.periodKey,
      projectId: parsed.projectId,
    });
  }

  if (!loaded.ok) {
    apiLog({
      level: 'warn',
      event: 'stripe_release_credit_ledger_load_failed',
      route: '/api/stripe/webhook',
      meta: { eventId, error: loaded.error },
    });
    // [C1 fix] 일시 장애 → throw 하여 핸들러가 500 반환·Stripe 재시도 (멱등키로 안전).
    throw new RetryableWebhookError(`release_credit_purchase ledger load failed: ${loaded.error}`);
  }

  const operation: ReleaseCreditLedgerOperation = {
    kind: 'purchase-grant',
    idempotencyKey: `release-credit-purchase:stripe:${eventId}`,
    creditAmount: parsed.creditAmount,
    projectId: compactReleaseCreditScopeKey(parsed.projectId, 'project-draft'),
    planId: loaded.snapshot.planId,
    packageProfileId: parsed.packageProfileId,
    productId: parsed.productId,
    certificateId: parsed.certificateId,
    reasonKo: `${getCertificateProduct(parsed.productId).labelKo} 별도 구매 반영`,
    createdAt: new Date().toISOString(),
  };
  const applied = applyReleaseCreditLedgerOperation(loaded.snapshot, operation);
  if (applied.status === 'duplicate') {
    apiLog({
      level: 'info',
      event: 'stripe_release_credit_purchase_duplicate',
      route: '/api/stripe/webhook',
      meta: { eventId },
    });
    return;
  }
  if (applied.status !== 'applied') {
    apiLog({
      level: 'warn',
      event: 'stripe_release_credit_purchase_rejected',
      route: '/api/stripe/webhook',
      meta: { eventId, status: applied.status },
    });
    return;
  }

  const saved = await ledgerStore.save({
    snapshot: applied.snapshot,
    expectedUpdateTime: loaded.updateTime,
  });
  if (saved.ok) {
    apiLog({
      level: 'info',
      event: 'stripe_release_credit_purchase_synced',
      route: '/api/stripe/webhook',
      meta: { eventId, balance: applied.snapshot.balance, productId: parsed.productId },
    });
    return;
  }
  // [C1 fix] conflict = 동시 전달이 먼저 저장 성공 → 멱등키로 안전, 정상 처리로 간주.
  if (saved.error === 'conflict') {
    apiLog({
      level: 'info',
      event: 'stripe_release_credit_purchase_save_conflict',
      route: '/api/stripe/webhook',
      meta: { eventId },
    });
    return;
  }
  // [C1 fix] 그 외(timeout 등 일시 장애) = throw → 핸들러 500 반환 → Stripe 재시도.
  // ledger idempotencyKey(release-credit-purchase:stripe:eventId)로 재시도 중복 grant 차단.
  apiLog({
    level: 'warn',
    event: 'stripe_release_credit_purchase_save_failed',
    route: '/api/stripe/webhook',
    meta: { eventId, error: saved.error },
  });
  throw new RetryableWebhookError(`release_credit_purchase save failed: ${saved.error}`);
}

// ============================================================
// PART 1.5 — Idempotency (Stripe event.id 기준 중복 차단)
// ============================================================
//
// [H1 stripe-ready] Stripe 는 webhook 을 at-least-once 로 전송 (retry·중복 가능).
// event.id 를 documentId 로 Firestore `stripe_processed_events` 에 create —
// 이미 존재하면 409 ALREADY_EXISTS → duplicate 판정 → side effect skip.
// 정리: expiresAt 필드에 +30일 timestamp 기록. Firestore 콘솔에서 해당 필드에
// TTL 정책을 1회 설정하면 자동 삭제 (서버 코드 추가 불필요).
// fail-open: dedupe 저장 불가(SA 미설정·timeout) 시 처리 진행 — claim set/clear 는
// 멱등 연산이라 중복 재처리가 안전하고, 결제 이벤트 유실이 더 치명적.

const DEDUPE_COLLECTION = 'stripe_processed_events';
const DEDUPE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

/** side effect(claim 갱신) 있는 이벤트만 dedupe — 로그-only 이벤트는 쓰기 비용 절약. */
const SIDE_EFFECT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
]);

async function markEventProcessed(eventId: string): Promise<'first' | 'duplicate' | 'unavailable'> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId || !eventId) return 'unavailable';
  try {
    const now = new Date();
    // firestore-service-rest 의 fetch 에는 자체 timeout 이 없음 — webhook hang 방지 5초 race.
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('dedupe timeout')), 5_000);
    });
    const r = await Promise.race([
      firestoreCreateDocument(
        projectId,
        DEDUPE_COLLECTION,
        {
          eventId: { stringValue: eventId },
          processedAt: { timestampValue: now.toISOString() },
          expiresAt: { timestampValue: new Date(now.getTime() + DEDUPE_TTL_MS).toISOString() },
        },
        { documentId: eventId },
      ),
      timeout,
    ]);
    if (r.ok) return 'first';
    return r.error === 'http_409' ? 'duplicate' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * [C1 fix] 읽기전용 dedup 체크 — side effect 실행 *전*에 이미 처리된 이벤트인지 확인.
 * mark(쓰기)는 side effect 성공 후로 미뤄, 처리 실패 시 dedup 이 재시도를 막지 않게 한다.
 * 체크 실패(SA 미설정·timeout)는 fail-open(false) — side effect 가 멱등이라 재처리 안전.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId || !eventId) return false;
  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('dedupe check timeout')), 5_000);
    });
    const r = await Promise.race([
      firestoreGetDocument(projectId, `${DEDUPE_COLLECTION}/${eventId}`),
      timeout,
    ]);
    return r.ok === true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 1.6 — Refund → uid 역추적 (charge.refunded)
// ============================================================
//
// [H1 stripe-ready] charge 자체에는 firebaseUid metadata 가 없음 —
// charge.invoice → invoice.subscription (구 API) 또는
// invoice.parent.subscription_details.subscription (2025 basil+) → subscription.metadata.firebaseUid.
// 전부 fail-safe: 역추적 실패 시 '' 반환 (로그만, webhook 200 유지).

async function resolveUidFromCharge(stripe: Stripe, charge: Stripe.Charge): Promise<string> {
  const invoiceRef = (charge as unknown as { invoice?: unknown }).invoice;
  const invoiceId = typeof invoiceRef === 'string' ? invoiceRef : '';
  if (!invoiceId) return '';
  const invoice = (await stripe.invoices.retrieve(invoiceId)) as unknown as {
    subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } };
  };
  const subRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  const subId = typeof subRef === 'string' ? subRef : '';
  if (!subId) return '';
  const sub = await stripe.subscriptions.retrieve(subId);
  return typeof sub.metadata?.firebaseUid === 'string' ? sub.metadata.firebaseUid : '';
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  // [C] env 미설정 시 503 — 서비스 상태 명시적으로 전달 (Stripe retry 대상)
  if (!stripeKey || !webhookSecret) {
    apiLog({
      level: 'warn',
      event: 'stripe_webhook_misconfigured',
      route: '/api/stripe/webhook',
    });
    return NextResponse.json(
      { error: 'Stripe not configured on this deployment' },
      { status: 503 },
    );
  }

  // SDK 기본 API 버전 사용 — apiVersion 명시 생략해 SDK 버전 업그레이드 시 자동 추종
  // 외부 API 호출(resolveUidFromCharge의 invoices/subscriptions.retrieve) 무한 hang 차단.
  const stripe = new Stripe(stripeKey, {
    timeout: 8000,
    maxNetworkRetries: 1,
  });

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // 시그너처 검증을 위해 raw body 가 필요 (req.json() 사용 금지)
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    apiLog({
      level: 'error',
      event: 'stripe_webhook_invalid_signature',
      route: '/api/stripe/webhook',
      error: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ============================================================
  // PART 2 — Event dispatch
  // ============================================================
  //
  // 현재: 구조화 로그만. Firebase 커스텀 클레임 갱신은 firebase-admin 통합 후속 커밋.
  //
  // 핸들해야 할 주요 이벤트:
  //   - checkout.session.completed      → 초기 구독 활성 (stripeRole 부여)
  //   - customer.subscription.created   → 구독 생성
  //   - customer.subscription.updated   → tier 변경 · 갱신
  //   - customer.subscription.deleted   → 해지 → stripeRole 제거
  //   - invoice.paid                    → 정기 결제 성공 (기록용)
  //   - invoice.payment_failed          → 결제 실패 (retry 알림 대상)

  const KNOWN_EVENTS = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.paid',
    'invoice.payment_failed',
    'charge.refunded',
  ];
  apiLog(
    KNOWN_EVENTS.includes(event.type)
      ? {
          level: event.type === 'invoice.payment_failed' ? 'warn' : 'info',
          event: `stripe_${event.type.replace(/\./g, '_')}`,
          route: '/api/stripe/webhook',
          meta: { type: event.type, id: event.id, created: event.created, livemode: event.livemode },
        }
      : {
          level: 'info',
          event: 'stripe_unhandled_event',
          route: '/api/stripe/webhook',
          meta: { type: event.type, id: event.id },
        },
  );

  // [C1 fix] 멱등성 — 읽기전용으로 이미 처리됐는지 *먼저* 확인 (여기서 mark 하지 않음).
  // mark(쓰기)는 side effect 성공 후로 미뤄, 처리 실패 시 dedup 이 재시도를 막지 않게 한다.
  if (SIDE_EFFECT_EVENTS.has(event.type) && (await isEventProcessed(event.id))) {
    apiLog({
      level: 'info',
      event: 'stripe_event_duplicate_skipped',
      route: '/api/stripe/webhook',
      meta: { type: event.type, id: event.id },
    });
    return NextResponse.json({ received: true, eventId: event.id, duplicate: true });
  }

  // [revenue path 2026-06-06] 결제 상태 → Firebase stripeRole claim 동기화.
  // [C1 fix] side effect 실패(throw)는 삼키지 않고 500 반환 → Stripe 재시도 (멱등키로 안전).
  try {
    if (event.type === 'checkout.session.completed') {
      // [#13 fix] payment_status 검사 없이 client_reference_id 만으로 pro 부여하면
      // unpaid/pending 세션도 pro 가 됨. 실제 결제 완료('paid') + 세션 'complete' 일 때만 set.
      // no_payment_required/unpaid 는 보류 — 정기 결제 활성은 invoice.paid 또는
      // subscription status(active/trialing) 단일 소스에서 부여됨.
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = typeof session.client_reference_id === 'string' ? session.client_reference_id : '';
      const paid = session.payment_status === 'paid' && session.status === 'complete';
      const checkoutKind = metadataValue(session.metadata, 'loreguardCheckoutKind');
      if (paid && checkoutKind === 'release_credit_purchase') {
        await syncReleaseCreditPurchase(session, event.id);
      } else if (uid && paid) {
        await syncSubscriptionEntitlement({
          uid,
          planId: resolvePlanIdFromStripeMetadata(session.metadata),
          status: 'active',
          stripeCustomerId: stripeObjectId(session.customer),
          stripeSubscriptionId: stripeObjectId(session.subscription),
          eventId: event.id,
        });
        await applyStripeRoleClaim(uid, 'set', event.id);
      } else if (uid) {
        apiLog({
          level: 'info',
          event: 'stripe_checkout_unpaid_skipped',
          route: '/api/stripe/webhook',
          meta: {
            id: event.id,
            payment_status: session.payment_status,
            status: session.status,
          },
        });
      }
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const uid = typeof sub.metadata?.firebaseUid === 'string' ? sub.metadata.firebaseUid : '';
      const active = sub.status === 'active' || sub.status === 'trialing';
      if (uid) {
        await syncSubscriptionEntitlement({
          uid,
          planId: resolvePlanIdFromStripeMetadata(sub.metadata),
          status: normalizeStripeSubscriptionStatus(sub.status),
          stripeCustomerId: stripeObjectId(sub.customer),
          stripeSubscriptionId: sub.id,
          eventId: event.id,
        });
        await applyStripeRoleClaim(uid, active ? 'set' : 'clear', event.id);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const uid = typeof sub.metadata?.firebaseUid === 'string' ? sub.metadata.firebaseUid : '';
      if (uid) {
        await syncSubscriptionEntitlement({
          uid,
          planId: resolvePlanIdFromStripeMetadata(sub.metadata),
          status: 'canceled',
          stripeCustomerId: stripeObjectId(sub.customer),
          stripeSubscriptionId: sub.id,
          eventId: event.id,
        });
        await applyStripeRoleClaim(uid, 'clear', event.id);
      }
    } else if (event.type === 'charge.refunded') {
      // [#14 fix] 부분 환불(amount_refunded < amount)에도 무조건 강등하면 소액 환불로
      // 정당한 구독이 끊김. 전액 환불(amount_refunded >= amount)일 때만 clear,
      // 부분 환불은 로그만 남기고 권한 유지. 강등의 권위 소스는 여전히
      // customer.subscription.deleted/updated(status) — 여기는 전액 환불 보조 경로.
      const charge = event.data.object as Stripe.Charge;
      const amount = typeof charge.amount === 'number' ? charge.amount : 0;
      const refunded = typeof charge.amount_refunded === 'number' ? charge.amount_refunded : 0;
      // amount<=0 (비정상/제로 charge) 은 부분환불 판정 불가 → 강등 보류(fail-secure: 권한 유지).
      const fullRefund = amount > 0 && refunded >= amount;
      if (!fullRefund) {
        apiLog({
          level: 'info',
          event: 'stripe_partial_refund_no_downgrade',
          route: '/api/stripe/webhook',
          meta: { id: event.id, amount, amount_refunded: refunded },
        });
      } else {
        const uid = await resolveUidFromCharge(stripe, charge);
        if (uid) {
          await applyStripeRoleClaim(uid, 'clear', event.id);
        } else {
          apiLog({
            level: 'warn',
            event: 'stripe_refund_uid_unresolved',
            route: '/api/stripe/webhook',
            meta: { id: event.id },
          });
        }
      }
    } else if (event.type === 'invoice.paid') {
      // [B1] 정기 결제 성공 → 영수증 이메일 (멱등키=event.id, 발송 실패해도 webhook 200).
      const invoice = event.data.object as Stripe.Invoice;
      const to = invoice.customer_email ?? '';
      if (to) {
        await sendReceiptEmail({
          to,
          customerName: invoice.customer_name,
          amount: typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0,
          currency: invoice.currency ?? 'krw',
          invoiceNumber: invoice.number,
          invoiceUrl: invoice.hosted_invoice_url,
          idempotencyKey: event.id,
        });
      }
    } else if (event.type === 'invoice.payment_failed') {
      // [B1] 결제 실패 → dunning(재시도 안내) 이메일. hosted_invoice_url 로 결제수단 갱신 유도.
      const invoice = event.data.object as Stripe.Invoice;
      const to = invoice.customer_email ?? '';
      if (to) {
        await sendPaymentFailedEmail({
          to,
          customerName: invoice.customer_name,
          amount: typeof invoice.amount_due === 'number' ? invoice.amount_due : 0,
          currency: invoice.currency ?? 'krw',
          updatePaymentUrl: invoice.hosted_invoice_url,
          idempotencyKey: event.id,
        });
      }
    }
  } catch (err) {
    apiLog({
      level: 'error',
      event: 'stripe_claim_sync_threw',
      route: '/api/stripe/webhook',
      error: err instanceof Error ? err.message : 'unknown',
    });
    // [C1 fix] credit-purchase 같은 self-heal 불가 경로의 일시 장애만 500 으로 재시도 유도.
    // dedup mark 를 하지 않으므로 Stripe 재전송이 다시 처리할 수 있고, ledger idempotencyKey 로
    // 중복 grant 는 발생하지 않는다. 그 외(구독·환불·이메일)는 기존 fail-safe(200) 유지.
    if (err instanceof RetryableWebhookError) {
      return NextResponse.json({ error: 'event_processing_failed_retry' }, { status: 500 });
    }
  }

  // [C1 fix] side effect 성공(또는 fail-safe 경로) 후에만 dedup mark (best-effort).
  // credit-purchase 실패 시엔 위에서 500 으로 빠져 여기에 도달하지 않는다.
  if (SIDE_EFFECT_EVENTS.has(event.type)) {
    const mark = await markEventProcessed(event.id);
    if (mark === 'unavailable') {
      apiLog({
        level: 'warn',
        event: 'stripe_event_dedupe_unavailable',
        route: '/api/stripe/webhook',
        meta: { type: event.type, id: event.id },
      });
    }
  }
  // [C] 정상 처리 완료 — 200.
  return NextResponse.json({ received: true, eventId: event.id });
}

// IDENTITY_SEAL: stripe-webhook | role=payment-event-ingestion | inputs=raw+signature | outputs=200|400|503
