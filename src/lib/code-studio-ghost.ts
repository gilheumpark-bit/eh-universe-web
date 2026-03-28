// ============================================================
// Code Studio — Ghost Text (AI Inline Completion)
// ============================================================
//
// Monaco의 InlineCompletionProvider를 사용하여 커서 위치에서
// AI가 코드를 인라인으로 제안한다.
// Tab으로 수락, Escape로 거부.

import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';

// 디바운스 + 취소 제어
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let abortController: AbortController | null = null;
let lastContext = '';

const DEBOUNCE_MS = 600;
const MAX_CONTEXT_CHARS = 1500;

// 완성 캐시 (같은 컨텍스트에 재요청 방지)
const completionCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

// 수락률 추적
let totalSuggestions = 0;
let acceptedSuggestions = 0;

export function getAcceptanceRate(): number {
  return totalSuggestions > 0 ? acceptedSuggestions / totalSuggestions : 0;
}

export function trackAccepted(): void {
  acceptedSuggestions++;
}

export function trackSuggested(): void {
  totalSuggestions++;
}

const GHOST_SYSTEM = `You are a code completion engine. Output ONLY the code that should be inserted at the cursor position.
Rules:
- No explanations, no markdown, no backticks
- Output raw code only
- Can be multi-line if appropriate
- Match the existing code style (indentation, naming conventions)
- If unsure, output nothing`;

/** Ghost Text 취소 */
export function cancelGhostText(): void {
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = undefined; }
  if (abortController) { abortController.abort(); abortController = null; }
}

/** Ghost Text 완성 요청 */
export async function requestGhostCompletion(
  codeBefore: string,
  codeAfter: string,
  language: string,
  signal?: AbortSignal,
): Promise<string> {
  const provider = getActiveProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) return '';

  // 컨텍스트 제한
  const before = codeBefore.slice(-MAX_CONTEXT_CHARS);
  const after = codeAfter.slice(0, 500);

  // 디듀플리케이션 + 캐시
  const contextKey = `${before}|${after}`;
  if (contextKey === lastContext) return '';
  lastContext = contextKey;

  // 캐시 히트
  const cached = completionCache.get(contextKey);
  if (cached) { trackSuggested(); return cached; }

  const prompt = `Language: ${language}
Code before cursor:
\`\`\`
${before}
\`\`\`

Code after cursor:
\`\`\`
${after}
\`\`\`

Complete the code at the cursor position:`;

  let result = '';
  try {
    await streamChat({
      systemInstruction: GHOST_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 150,
      signal,
      onChunk: (text: string) => { result += text; },
    });
  } catch {
    return '';
  }

  // 클린업: 백틱/마크다운 제거
  const cleaned = result
    .replace(/^```\w*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  // 캐시 저장
  if (cleaned) {
    if (completionCache.size >= MAX_CACHE_SIZE) {
      const firstKey = completionCache.keys().next().value;
      if (firstKey) completionCache.delete(firstKey);
    }
    completionCache.set(contextKey, cleaned);
    trackSuggested();
  }

  return cleaned;
}

/**
 * Monaco InlineCompletionProvider 등록.
 * editor.onMount에서 호출한다.
 */
export function registerGhostTextProvider(
  monaco: typeof import('monaco-editor'),
  language: string = '*',
): void {
  monaco.languages.registerInlineCompletionsProvider(language, {
    provideInlineCompletions: async (model: import('monaco-editor').editor.ITextModel, position: import('monaco-editor').Position, _context: unknown, token: import('monaco-editor').CancellationToken) => {
      cancelGhostText();

      // API 키 없으면 스킵
      if (!getApiKey(getActiveProvider())) return { items: [] };

      return new Promise((resolve) => {
        debounceTimer = setTimeout(async () => {
          if (token.isCancellationRequested) { resolve({ items: [] }); return; }

          const controller = new AbortController();
          abortController = controller;

          // 커서 전후 코드 추출
          const fullText = model.getValue();
          const offset = model.getOffsetAt(position);
          const codeBefore = fullText.slice(0, offset);
          const codeAfter = fullText.slice(offset);
          const lang = model.getLanguageId();

          try {
            const completion = await requestGhostCompletion(codeBefore, codeAfter, lang, controller.signal);
            if (!completion || token.isCancellationRequested) {
              resolve({ items: [] });
              return;
            }

            resolve({
              items: [{
                insertText: completion,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              }],
            });
          } catch {
            resolve({ items: [] });
          }
        }, DEBOUNCE_MS);
      });
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

// IDENTITY_SEAL: role=GhostText | inputs=codeBefore,codeAfter,language | outputs=inline completion
