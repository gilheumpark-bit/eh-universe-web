import type { MetadataRoute } from 'next';

// ============================================================
// Sitemap — Next.js 16 Metadata Route
// ============================================================
// robots.ts 와 정합: 로그인 필요(=크롤러 차단) 경로는 포함하지 않는다.
// base URL 은 env 우선 → 현행 운영 도메인 fallback.
//
// [2026-04-24] hreflang alternates 추가 — Google Search Console 권장 구조.
// 각 URL 에 ko/en/ja/zh 4언어 variant 를 명시, 다국어 SERP 노출 개선.
// ============================================================

// 단일 언어 대응 (하위 영역 세부) — 언어 alternates 불필요한 URL 용
interface SimpleEntry {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}

// 다국어 대응 entry — landing/legal/공개 페이지
const MULTILANG_PATHS: SimpleEntry[] = [
  { path: '/',                  changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/welcome',           changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about',             changeFrequency: 'monthly', priority: 0.5 },
  { path: '/privacy',           changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/terms',             changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/copyright',         changeFrequency: 'yearly',  priority: 0.3 },
  { path: '/ai-disclosure',     changeFrequency: 'monthly', priority: 0.5 },
  { path: '/codex',             changeFrequency: 'monthly', priority: 0.8 },
  { path: '/archive',           changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/reference',         changeFrequency: 'monthly', priority: 0.6 },
  { path: '/rulebook',          changeFrequency: 'monthly', priority: 0.6 },
  { path: '/docs',              changeFrequency: 'monthly', priority: 0.6 },
  { path: '/network',           changeFrequency: 'daily',   priority: 0.8 },
  { path: '/network/guidelines',changeFrequency: 'monthly', priority: 0.4 },
  { path: '/tools/soundtrack',  changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/galaxy-map',  changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/vessel',      changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/warp-gate',   changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/noa-tower',   changeFrequency: 'monthly', priority: 0.5 },
  { path: '/tools/neka-sound',  changeFrequency: 'monthly', priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eh-universe.com';
  const now = new Date().toISOString();

  return MULTILANG_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        'ko-KR': `${base}${path}`,
        'en-US': `${base}${path}${path.includes('?') ? '&' : '?'}lang=en`,
        'ja-JP': `${base}${path}${path.includes('?') ? '&' : '?'}lang=ja`,
        'zh-CN': `${base}${path}${path.includes('?') ? '&' : '?'}lang=zh`,
      },
    },
  }));
}
