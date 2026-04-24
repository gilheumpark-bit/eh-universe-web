import type { MetadataRoute } from 'next';

// ============================================================
// Robots — Next.js 16 Metadata Route
// 정책:
//   1) 일반 봇: 공개 페이지 허용, API/로그인 필요 경로 차단
//   2) 작가 콘텐츠를 AI 재학습에 쓰지 않도록 GPTBot/Google-Extended/CCBot 전면 차단
// ============================================================

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eh-universe.com';

  return {
    rules: [
      // 일반 검색엔진 — 공개 콘텐츠만 허용
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/studio/',
          '/translation-studio/',
          '/code-studio/',
          '/preview/',
          '/_backup_2026-04-02/',
          '/_backup_theme_original/',
        ],
      },
      // AI 재학습 차단 — 사용자가 쓴 글이 LLM 학습 셋에 들어가지 않도록
      // (2026-04-24 갱신: 2026-Q1 기준 적극 크롤러 9 → 21개로 확장)
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'OAI-SearchBot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'Claude-Web', disallow: '/' },
      { userAgent: 'cohere-ai', disallow: '/' },
      { userAgent: 'PerplexityBot', disallow: '/' },
      { userAgent: 'Amazonbot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'Applebot-Extended', disallow: '/' },
      { userAgent: 'FacebookBot', disallow: '/' },
      { userAgent: 'meta-externalagent', disallow: '/' },
      { userAgent: 'Meta-ExternalAgent', disallow: '/' },
      { userAgent: 'Diffbot', disallow: '/' },
      { userAgent: 'omgilibot', disallow: '/' },
      { userAgent: 'DuckAssistBot', disallow: '/' },
      { userAgent: 'AI2Bot', disallow: '/' },
      { userAgent: 'Timpibot', disallow: '/' },
      { userAgent: 'ImagesiftBot', disallow: '/' },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
