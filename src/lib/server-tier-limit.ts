import { NextResponse } from 'next/server';

import { reserveTokenBudgetUpstash, type UpstashConfig } from '@/lib/rate-limit-upstash';
import { getTierLimits, type UserTier } from '@/lib/tier-gate';

type VerifiedUser = { uid: string; tier?: UserTier } | null;

export type ServerTierFeature =
  | 'chat'
  | 'inline-completion'
  | 'structured-generate'
  | 'chapter-analysis'
  | 'translation'
  | 'image-generation';

interface ServerTierLimitInput {
  headers: Headers;
  ip: string;
  route: string;
  feature: ServerTierFeature;
  hasByok: boolean;
  requestId?: string;
  verifiedUser?: VerifiedUser;
}

type ServerTierLimitResult =
  | { ok: true; userId: string | null; tier: UserTier; mode: 'byok' | 'hosted' }
  | { ok: false; response: NextResponse };

const DAY_MS = 86_400_000;
const usageMap = new Map<string, { used: number; resetAt: number }>();

const FEATURE_LABELS: Record<ServerTierFeature, string> = {
  chat: '노아 대화',
  'inline-completion': '집필 이어쓰기',
  'structured-generate': '구조화 제안',
  'chapter-analysis': '회차 분석',
  translation: '번역·현지화',
  'image-generation': '시각 자료 생성',
};

function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token, prefix: 'tier-usage:', timeoutMs: 1500 } : null;
}

function getBearerToken(headers: Headers): string {
  const auth = headers.get('authorization') || headers.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim() ?? '';
}

function getDailyLimit(tier: UserTier, feature: ServerTierFeature): number {
  const limits = getTierLimits(tier);
  if (feature === 'translation') return limits.translation.dailyChapters;
  return limits.novel.dailyGenerations;
}

function reserveMemory(key: string, amount: number, limit: number): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const current = usageMap.get(key);
  if (!current || now > current.resetAt) {
    const used = Math.max(0, amount);
    usageMap.set(key, { used, resetAt: now + DAY_MS });
    return { allowed: used <= limit, remaining: Math.max(0, limit - used), resetMs: DAY_MS };
  }

  const nextUsed = current.used + Math.max(0, amount);
  const resetMs = Math.max(0, current.resetAt - now);
  if (current.used >= limit || nextUsed > limit) {
    return { allowed: false, remaining: 0, resetMs };
  }
  current.used = nextUsed;
  return { allowed: true, remaining: Math.max(0, limit - nextUsed), resetMs };
}

async function reserveDailyUsage(key: string, limit: number): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  if (limit === 0) return { allowed: true, remaining: Number.POSITIVE_INFINITY, resetMs: DAY_MS };
  const upstash = getUpstashConfig();
  if (upstash) {
    const reserved = await reserveTokenBudgetUpstash(upstash, key, 1, limit, DAY_MS);
    return { allowed: reserved.allowed, remaining: reserved.remaining, resetMs: reserved.resetMs };
  }
  return reserveMemory(key, 1, limit);
}

function loginRequiredResponse(route: string, feature: ServerTierFeature, requestId?: string): NextResponse {
  return NextResponse.json(
    {
      error: 'login_or_byok_required',
      message: `로그인하거나 연결 키를 등록하면 ${FEATURE_LABELS[feature]}을 사용할 수 있습니다.`,
      paywall: {
        reason: '로그인 상태와 연결 키를 확인하지 못했습니다.',
        feature: FEATURE_LABELS[feature],
        currentTier: 'none',
        requiredTier: 'free',
        unlocksWith: ['로그인하고 기본 제공량 사용', '연결 키 등록', 'Pro 플랜'],
        pricingUrl: '/pricing',
        settingsTarget: '환경 설정 > 노아 운영',
      },
      route,
      requestId,
    },
    { status: 401 },
  );
}

function limitReachedResponse(input: {
  route: string;
  feature: ServerTierFeature;
  tier: UserTier;
  limit: number;
  remaining: number;
  resetMs: number;
  requestId?: string;
}): NextResponse {
  const retrySec = Math.max(60, Math.ceil(input.resetMs / 1000));
  return NextResponse.json(
    {
      error: 'plan_limit_reached',
      message: `오늘 사용할 수 있는 ${FEATURE_LABELS[input.feature]} 기본 제공량을 모두 사용했습니다.`,
      paywall: {
        reason: `현재 플랜의 하루 제공량 ${input.limit}회를 모두 사용했습니다.`,
        feature: FEATURE_LABELS[input.feature],
        currentTier: input.tier,
        requiredTier: 'pro',
        reset: 'daily',
        limit: input.limit,
        remaining: input.remaining,
        unlocksWith: ['Pro 플랜', '연결 키 등록'],
        pricingUrl: '/pricing',
        settingsTarget: '환경 설정 > 노아 운영',
      },
      route: input.route,
      requestId: input.requestId,
    },
    { status: 402, headers: { 'Retry-After': String(retrySec), ...(input.requestId ? { 'X-Request-Id': input.requestId } : {}) } },
  );
}

export async function enforceServerTierLimit(input: ServerTierLimitInput): Promise<ServerTierLimitResult> {
  if (input.hasByok) {
    return { ok: true, userId: null, tier: 'free', mode: 'byok' };
  }

  let verified = input.verifiedUser;
  if (!verified) {
    const token = getBearerToken(input.headers);
    if (token) {
      try {
        const { verifyFirebaseIdToken } = await import('@/lib/firebase-id-token');
        verified = await verifyFirebaseIdToken(token);
      } catch {
        verified = null;
      }
    }
  }
  if (!verified) {
    return { ok: false, response: loginRequiredResponse(input.route, input.feature, input.requestId) };
  }

  const tier: UserTier = verified.tier === 'pro' ? 'pro' : 'free';
  const limit = getDailyLimit(tier, input.feature);
  const reserved = await reserveDailyUsage(`${input.route}:uid:${verified.uid}`, limit);
  if (!reserved.allowed) {
    return {
      ok: false,
      response: limitReachedResponse({
        route: input.route,
        feature: input.feature,
        tier,
        limit,
        remaining: reserved.remaining,
        resetMs: reserved.resetMs,
        requestId: input.requestId,
      }),
    };
  }

  return { ok: true, userId: verified.uid, tier, mode: 'hosted' };
}

export function resetServerTierLimitForTests(): void {
  usageMap.clear();
}
