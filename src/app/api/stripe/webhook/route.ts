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
import { setStripeRoleClaim, clearStripeRoleClaim } from '@/lib/firebase-auth-admin-rest';

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
  const stripe = new Stripe(stripeKey);

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

  // [revenue path 2026-06-06] 결제 상태 → Firebase stripeRole claim 동기화. fail-safe (실패해도 200).
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = typeof session.client_reference_id === 'string' ? session.client_reference_id : '';
      if (uid) await applyStripeRoleClaim(uid, 'set', event.id);
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const uid = typeof sub.metadata?.firebaseUid === 'string' ? sub.metadata.firebaseUid : '';
      const active = sub.status === 'active' || sub.status === 'trialing';
      if (uid) await applyStripeRoleClaim(uid, active ? 'set' : 'clear', event.id);
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const uid = typeof sub.metadata?.firebaseUid === 'string' ? sub.metadata.firebaseUid : '';
      if (uid) await applyStripeRoleClaim(uid, 'clear', event.id);
    }
  } catch (err) {
    apiLog({
      level: 'error',
      event: 'stripe_claim_sync_threw',
      route: '/api/stripe/webhook',
      error: err instanceof Error ? err.message : 'unknown',
    });
  }

  // [C] 200 반환 필수 — Stripe 는 non-2xx 를 재전송 시도. 처리 완료 신호.
  return NextResponse.json({ received: true, eventId: event.id });
}

// IDENTITY_SEAL: stripe-webhook | role=payment-event-ingestion | inputs=raw+signature | outputs=200|400|503
