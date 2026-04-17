import Stripe from 'stripe';

// Stripe 초기화: 환경변수 없으면 null 반환 — placeholder 키 사용 금지
// apiVersion은 Stripe SDK 타입이 요구하는 버전 문자열.
// 배포 시점에 Stripe SDK 패키지가 지원하는 최신 안정 버전을 사용 (빈 객체로 기본값에 위임).
const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
export const stripe = stripeKey ? new Stripe(stripeKey, {
  appInfo: {
    name: 'EH-Universe',
    version: '3.0.0',
  },
}) : null;

/** Open redirect 방지: NEXT_PUBLIC_APP_URL과 동일 origin만 허용, 결과는 origin 문자열만 사용 */
export function sanitizeStripeReturnBase(raw: string | undefined): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  let allowedOrigin: string;
  try {
    allowedOrigin = new URL(env).origin;
  } catch {
    allowedOrigin = 'http://localhost:3000';
  }
  if (!raw || typeof raw !== 'string') return allowedOrigin;
  try {
    const u = new URL(raw.trim());
    if (u.origin !== allowedOrigin) return allowedOrigin;
    return allowedOrigin;
  } catch {
    return allowedOrigin;
  }
}

export const getStripeSession = async (priceId: string, customerId?: string, returnUrl?: string) => {
  if (!stripe) throw new Error('Stripe is not configured');
  const base = sanitizeStripeReturnBase(returnUrl);
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/?success=true`,
    cancel_url: `${base}/?cancel=true`,
    customer: customerId,
  });
};
