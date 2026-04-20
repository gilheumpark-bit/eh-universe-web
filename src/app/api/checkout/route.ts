import { NextRequest, NextResponse } from 'next/server';
import { getStripeSession } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';

/**
 * Stripe Checkout for subscription (optional). Requires STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PRICE_ID in env.
 *
 * [M9 audit P0-1] Feature gate — this endpoint is intentionally disabled until the paywall UI lands.
 * The server code is fully authenticated + rate-limited, but no client surface fetches it yet
 * (see docs/m9-audit-unconnected-unfinished.md). To activate, set both:
 *   - STRIPE_SECRET_KEY (server)
 *   - FEATURE_STRIPE_CHECKOUT=on (opt-in flag)
 * Otherwise the route returns 503 immediately to prevent a dead-code endpoint surface.
 */
export async function POST(req: NextRequest) {
  // --- [M9] Feature gate (must be first, before any other work) ---
  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.FEATURE_STRIPE_CHECKOUT !== 'on'
  ) {
    return NextResponse.json({ error: 'checkout_disabled' }, { status: 503 });
  }

  // --- Rate limiting (10/min per IP) ---
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, '/api/checkout', RATE_LIMITS.imageGen);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  // --- Authentication required ---
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const auth = await verifyFirebaseIdToken(authHeader.replace('Bearer ', ''));
  if (!auth) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || '';
  if (!priceId) {
    return NextResponse.json({ error: 'Stripe 가격 ID가 설정되지 않았습니다.' }, { status: 501 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    // returnUrl을 sanitizeStripeReturnBase로 검증 — 오픈 리다이렉트 방지
    const rawReturnUrl = typeof body.returnUrl === 'string' ? body.returnUrl : undefined;
    const session = await getStripeSession(priceId, undefined, rawReturnUrl);
    if (!session.url) {
      return NextResponse.json({ error: 'Checkout 세션을 만들 수 없습니다.' }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    logger.error('api/checkout', 'checkout error', e);
    return NextResponse.json({ error: '결제 세션 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
