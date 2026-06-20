// ============================================================
// extractor.ts — 사용자 입력 → MetaDefinition[].
//
// 패턴:
//   "X 는 Y" / "X = Y"                  → company / product / tech / category
//   "X = N억/만/천"                      → numeric
//   "X 마감 YYYY-MM-DD"                  → date
//   "내부: X" / "외부: Y"                → scope
//   "X 폐기" / "X 안 됨"                 → rejection
// ============================================================

import type { MetaDefinition, MetaKind, MetaScope } from './types';

interface Pattern {
  regex: RegExp;
  kind: MetaKind;
  scope?: MetaScope;
}

const PATTERNS: Pattern[] = [
  // X 는 회사 / 제품 / 기술
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*(?:는|은)\s*회사/g, kind: 'company' },
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*(?:는|은)?\s*1번\s*제품/g, kind: 'product' },
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*(?:는|은)?\s*제품/g, kind: 'product' },
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*(?:는|은)?\s*내부\s*(?:기술|용어)/g, kind: 'tech', scope: 'internal' },
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*(?:는|은)?\s*외부\s*(?:노출\s*X|제품)/g, kind: 'product', scope: 'external' },

  // X = Y 형식
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*=\s*([가-힣A-Za-z0-9_\- ]{2,40})/g, kind: 'hierarchy' },

  // 카테고리
  { regex: /(?:카테고리|category)(?:는|은|:)?\s*([가-힣A-Za-z0-9_\- ]{2,40})/gi, kind: 'category' },

  // 수치 (X 400억 / X 1조 / X 1000만)
  {
    regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*([0-9,]+(?:억|만|천|조))\s*=?\s*(매출|투자금|영업이익|valuation)?/g,
    kind: 'numeric',
  },

  // 날짜
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*마감\s*(\d{4}-\d{2}-\d{2})/g, kind: 'date' },
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*판단선\s*(\d{4}-\d{2})/g, kind: 'date' },

  // scope
  { regex: /내부[:：]\s*([가-힣A-Za-z0-9_\-, ]{2,80})/g, kind: 'hierarchy', scope: 'internal' },
  { regex: /외부[:：]\s*([가-힣A-Za-z0-9_\-, ]{2,80})/g, kind: 'hierarchy', scope: 'external' },

  // 거절 / 폐기
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*폐기/g, kind: 'rejection' },
  { regex: /([가-힣A-Za-z0-9_\-]{2,30})\s*안\s*됨/g, kind: 'rejection' },
];

export function extractMetaDefinitions(
  text: string,
  turnIdx: number,
  timestamp: number,
): MetaDefinition[] {
  if (!text) return [];
  const out: MetaDefinition[] = [];
  const seen = new Set<string>();

  for (const pat of PATTERNS) {
    pat.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pat.regex.exec(text)) !== null) {
      const key = (m[1] ?? '').trim();
      const value = (m[2] ?? m[1] ?? '').trim();
      if (key.length < 2 || key.length > 30) continue;
      const dedupKey = `${pat.kind}:${key}:${value}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      out.push({
        key,
        value: value || pat.kind,
        kind: pat.kind,
        ...(pat.scope ? { scope: pat.scope } : {}),
        turnIdx,
        timestamp,
        surface: m[0].trim(),
      });
    }
  }

  return out;
}
