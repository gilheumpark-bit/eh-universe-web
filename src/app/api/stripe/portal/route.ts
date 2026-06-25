import { NextRequest, NextResponse } from 'next/server';
import { stripe, sanitizeStripeReturnBase } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { checkSameOriginHeaders } from '@/lib/api-origin-guard';
import { getSubscriptionEntitlementStore } from '@/lib/billing/subscription-entitlement-store';
import { apiLog, createRequestTimer } from '@/lib/api-logger';

/**
 * Stripe Customer Portal — 구독 셀프서비스 (해지·결제수단 변경·청구서 조회).
 *
 * [상용화 blocker B2] checkout 과 동일한 feature gate. 인증 사용자의 stripeCustomerId 로
 * billing portal 세션을 생성해 URL 반환. 클라이언트는 그 URL 로 리다이렉트.
 * 활성 조건: STRIPE_SECRET_KEY (server) + FEATURE_STRIPE_CHECKOUT=on. 아니면 503.
 */
export async function POST(req: NextRequest) {
  const timer = createRequestTimer();

  // --- Feature gate (checkout 과 동일) ---
  if (!process.env.STRIPE_SECRET_KEY || process.env.FEATURE_STRIPE_CHECKOUT !== 'on') {
    return NextResponse.json({ error: 'billing_disabled' }, { status: 503 });
  }
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  // --- Origin ---
  const originCheck = checkSameOriginHeaders(req.headers);
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  // --- Rate limit ---
  const ip = getClientIp(req.headers);
  const rl = await checkRateLimitAsync(ip, '/api/stripe/portal', RATE_LIMITS.imageGen);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  // --- Auth ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const auth = await verifyFirebaseIdToken(authHeader.replace('Bearer ', ''));
  if (!auth) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // --- stripeCustomerId 조회 (구독 entitlement 스냅샷) ---
  const loaded = await getSubscriptionEntitlementStore().load(auth.uid);
  const customerId = loaded.ok ? loaded.snapshot.stripeCustomerId : null;
  if (!customerId) {
    // 구독/결제 이력이 없는 사용자 — 포털 대상 아님.
    return NextResponse.json({ error: 'no_subscription' }, { status: 404 });
  }

  let body: { returnUrl?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* 빈 body 허용 — 기본 return_url 사용 */
  }
  const base = sanitizeStripeReturnBase(typeof body.returnUrl === 'string' ? body.returnUrl : undefined);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${base}/account/billing`,
    });
    if (!session.url) {
      return NextResponse.json({ error: 'portal_session_failed' }, { status: 500 });
    }
    apiLog({
      level: 'info',
      event: 'billing_portal_created',
      route: '/api/stripe/portal',
      ip,
      status: 200,
      durationMs: timer.elapsed(),
      meta: { uid: auth.uid },
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    logger.error('api/stripe/portal', 'portal session error', e);
    return NextResponse.json({ error: '구독 관리 페이지를 여는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
