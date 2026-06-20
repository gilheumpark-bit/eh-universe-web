// ============================================================
// claim-extractor.ts — AI 응답에서 "완료/통과/구현/wired/tested" 주장 + 파일 경로 + 함수명 추출.
// ============================================================

import type { Message } from '@/lib/studio-types';
import type { CompletionClaim } from './types';

// 주장 키워드 — 다국어
const CLAIM_PATTERNS: Array<{ regex: RegExp; kind: CompletionClaim['kind'] }> = [
  { regex: /([가-힣A-Za-z0-9_/.\- ]{2,80})\s*(?:완료|done|completed)/g, kind: 'completed' },
  { regex: /(?:테스트|tests?|verification)\s*(?:통과|passed|pass)/gi, kind: 'passed' },
  { regex: /([가-힣A-Za-z0-9_/.\- ]{2,80})\s*(?:구현됨|구현 완료|implemented)/g, kind: 'implemented' },
  { regex: /([가-힣A-Za-z0-9_/.\- ]{2,80})\s*(?:wired|wiring 완료|연결 완료)/gi, kind: 'wired' },
  { regex: /(?:타입 체크|type check|tsc)\s*(?:통과|0 errors)/gi, kind: 'tested' },
];

// 파일 경로 — Loreguard 패턴
const PATH_PATTERN = /(src\/[a-zA-Z0-9_\-/.]+\.(?:ts|tsx))/g;

// 함수/컴포넌트명 — camelCase / PascalCase
const SYMBOL_PATTERN = /\b(use[A-Z][a-zA-Z0-9]+|build[A-Z][a-zA-Z0-9]+|render[A-Z][a-zA-Z0-9]+|[A-Z][a-zA-Z0-9]+(?:Panel|Section|Component|Hook|Modal|Provider))\b/g;

export function extractCompletionClaims(
  messages: Message[] | null | undefined,
  recentN: number = 10,
): CompletionClaim[] {
  if (!messages || messages.length === 0) return [];

  // assistant 응답만 검사 (AI 가 한 주장)
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const recent = assistantMessages.slice(-recentN);

  const claims: CompletionClaim[] = [];

  recent.forEach((m, i) => {
    const turnIdx = recent.length - 1 - i;
    const text = m.content ?? '';
    if (!text) return;

    // 주장 키워드 매칭
    for (const pat of CLAIM_PATTERNS) {
      pat.regex.lastIndex = 0;
      let mm: RegExpExecArray | null;
      while ((mm = pat.regex.exec(text)) !== null) {
        // 같은 매칭 위치 ±200자 안에서 path / symbol 추출
        const start = Math.max(0, mm.index - 200);
        const end = Math.min(text.length, mm.index + mm[0].length + 200);
        const window = text.slice(start, end);

        const pathMatch = PATH_PATTERN.exec(window);
        PATH_PATTERN.lastIndex = 0;
        const symbolMatch = SYMBOL_PATTERN.exec(window);
        SYMBOL_PATTERN.lastIndex = 0;

        claims.push({
          turnIdx,
          timestamp: m.timestamp ?? 0,
          surface: mm[0].trim(),
          filePath: pathMatch?.[1],
          symbolName: symbolMatch?.[1],
          kind: pat.kind,
        });
      }
    }
  });

  // 중복 제거 (같은 surface + filePath 조합)
  const seen = new Set<string>();
  return claims.filter((c) => {
    const key = `${c.surface}|${c.filePath ?? ''}|${c.symbolName ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
