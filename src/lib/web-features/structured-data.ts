// ============================================================
// Structured Data — JSON-LD for SEO
// ============================================================
// 검색 엔진에서 공개 Docs 문서가 리치 결과로 표시되게

export function buildArticleJsonLd(article: {
  title: string;
  slug: string;
  description: string;
  category: string;
  dateModified: string;
  wordCount: number;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    articleSection: article.category,
    dateModified: article.dateModified,
    wordCount: article.wordCount,
    url: `https://eh-universe.com/docs/${article.slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'EH',
      alternateName: '로어가드 · Loreguard',
      url: 'https://eh-universe.com',
    },
    isAccessibleForFree: true,
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
  };
}

export function buildWebAppJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: '로어가드 (Loreguard)',
    alternateName: 'Loreguard · EH',
    description: 'Loreguard는 프로젝트 생성, 세계관, 씬시트, 집필, 퇴고, 번역, 출고를 한 흐름으로 관리하는 창작 전문 IDE입니다.',
    url: 'https://eh-universe.com',
    applicationCategory: 'CreativeWork',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Project creation',
      'Worldbuilding canvas',
      'Scene sheet workflow',
      'Translation and localization',
      'Release package',
    ],
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildFAQJsonLd(faqs: Array<{ question: string; answer: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/** JSON-LD를 script 태그 문자열로 변환 (Next.js head에 삽입용) */
export function jsonLdScript(data: object): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}
