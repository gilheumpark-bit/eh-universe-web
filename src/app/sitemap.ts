import type { MetadataRoute } from 'next';

// ============================================================
// Sitemap — Next.js 16 Metadata Route
// robots.ts와 정합: 로그인 필요(=크롤러 차단) 경로는 포함하지 않는다.
// base URL은 env 우선 → 현행 운영 도메인 fallback.
// ============================================================

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eh-universe.com';
  const now = new Date().toISOString();

  return [
    // Core landing
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/welcome`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // Legal & disclosure
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/copyright`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/ai-disclosure`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // Public lore & codex (robots에서 허용된 영역만)
    { url: `${base}/codex`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/archive`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/reference`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/rulebook`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // Network — 공개 피드 (하위 세부는 동적이므로 루트만)
    { url: `${base}/network`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/network/guidelines`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },

    // Tools
    { url: `${base}/tools/soundtrack`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/galaxy-map`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/vessel`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/warp-gate`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/noa-tower`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/tools/neka-sound`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
