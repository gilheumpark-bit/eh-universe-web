export interface PaywallPayload {
  error?: string;
  message?: string;
  paywall?: {
    reason?: string;
    feature?: string;
    currentTier?: string;
    requiredTier?: string;
    reset?: string;
    limit?: number;
    remaining?: number;
    unlocksWith?: string[];
    pricingUrl?: string;
    settingsTarget?: string;
  };
}

export interface PaywallNoticeDetail {
  message: string;
  feature: string;
  reason: string;
  currentTier: string;
  requiredTier: string;
  reset?: string;
  limit?: number;
  remaining?: number;
  unlocksWith: string[];
  pricingUrl: string;
  settingsTarget: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export function isPaywallPayload(value: unknown): value is PaywallPayload {
  if (!isObject(value)) return false;
  return value.error === 'plan_limit_reached' || isObject(value.paywall);
}

function cleanPaywallText(value: string): string {
  return value
    .replace(/사용자\s*API\s*키/g, '연결 키')
    .replace(/사용자\s*연결\s*키/g, '연결 키')
    .replace(/API\s*키/g, '연결 키')
    .replace(/\bBYOK\b/g, '연결 키');
}

function toDetail(payload: PaywallPayload): PaywallNoticeDetail {
  const paywall = payload.paywall ?? {};
  const feature = cleanPaywallText(paywall.feature?.trim() || '노아 기능');
  const reason = cleanPaywallText(
    paywall.reason?.trim() || payload.message?.trim() || '현재 플랜에서 사용할 수 있는 범위를 넘었습니다.',
  );
  return {
    message: cleanPaywallText(payload.message?.trim() || `${feature} 사용 범위에 도달했습니다.`),
    feature,
    reason,
    currentTier: paywall.currentTier?.trim() || 'free',
    requiredTier: paywall.requiredTier?.trim() || 'pro',
    reset: paywall.reset?.trim() || undefined,
    limit: typeof paywall.limit === 'number' ? paywall.limit : undefined,
    remaining: typeof paywall.remaining === 'number' ? paywall.remaining : undefined,
    unlocksWith: Array.isArray(paywall.unlocksWith)
      ? paywall.unlocksWith.filter(Boolean).map((item) => cleanPaywallText(item))
      : ['Pro 플랜', '연결 키 등록'],
    pricingUrl: paywall.pricingUrl?.trim() || '/pricing',
    settingsTarget: cleanPaywallText(paywall.settingsTarget?.trim() || '환경 설정 > 노아 운영'),
  };
}

export function notifyPaywall(payload: PaywallPayload): string {
  const detail = toDetail(payload);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:toast', {
      detail: { message: detail.message, variant: 'warn', duration: 9000 },
    }));
    window.dispatchEvent(new CustomEvent<PaywallNoticeDetail>('noa:paywall-notice', { detail }));
  }
  return `${detail.message} ${detail.reason}`;
}

export function checkPaywallJson(value: unknown): string | null {
  if (!isPaywallPayload(value)) return null;
  return notifyPaywall(value);
}
