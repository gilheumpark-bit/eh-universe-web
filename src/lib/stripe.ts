import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-03-25.dahlia',
  appInfo: {
    name: 'EH-Translator-V3',
    version: '3.0.0',
  },
});

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
