// ============================================================
// Glossary Auto-Extractor — 원문에서 용어 자동 추출
// ============================================================

/** 추출된 용어 후보 */
export interface GlossaryCandidate {
  term: string;
  frequency: number;
  type: 'name' | 'place' | 'term' | 'title' | 'organization';
  confidence: number;
}

/** AI 용어 추출 프롬프트 생성 */
export function buildGlossaryExtractionPrompt(sourceText: string, sourceLang: string): string {
  return `Extract key terms that must be translated consistently from this ${sourceLang} text.
Focus on: character names, place names, technical terms, titles/ranks, organization names.

<source_text>
${sourceText.slice(0, 8000)}
</source_text>

Respond with ONLY a JSON array. Each item: {"term": "원문", "type": "name|place|term|title|organization", "confidence": 0.0-1.0}
Maximum 30 terms. Sort by importance.`;
}

/** AI 응답에서 용어 후보 파싱 */
export function parseGlossaryCandidates(raw: string): GlossaryCandidate[] {
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item: Record<string, unknown>) => item.term && typeof item.term === 'string')
      .map((item: Record<string, unknown>) => ({
        term: String(item.term),
        frequency: 1,
        type: (['name', 'place', 'term', 'title', 'organization'].includes(String(item.type)) ? item.type : 'term') as GlossaryCandidate['type'],
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      }))
      .slice(0, 30);
  } catch {
    return [];
  }
}

/** 규칙 기반 빠른 용어 추출 (AI 없이, 고유명사 패턴) */
export function extractTermsRuleBased(text: string): GlossaryCandidate[] {
  const candidates: Map<string, GlossaryCandidate> = new Map();

  // 한국어 고유명사 패턴: 2-4글자 한글 + 조사 앞
  const koNamePattern = /([가-힣]{2,4})(?:은|는|이|가|을|를|의|에게|에서|와|과|로|도|만|까지)/g;
  let match;
  while ((match = koNamePattern.exec(text)) !== null) {
    const term = match[1];
    // 일반 명사 필터 (너무 흔한 단어 제외)
    if (COMMON_KO_WORDS.has(term)) continue;
    const existing = candidates.get(term);
    if (existing) {
      existing.frequency++;
    } else {
      candidates.set(term, { term, frequency: 1, type: 'name', confidence: 0.3 });
    }
  }

  // 영문 고유명사: 대문자 시작 단어
  const enNamePattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
  while ((match = enNamePattern.exec(text)) !== null) {
    const term = match[1];
    if (COMMON_EN_WORDS.has(term.toLowerCase())) continue;
    const existing = candidates.get(term);
    if (existing) {
      existing.frequency++;
    } else {
      candidates.set(term, { term, frequency: 1, type: 'name', confidence: 0.4 });
    }
  }

  // 「」『』 안의 텍스트 (일본어 작품명/용어)
  const bracketPattern = /[「『]([^」』]+)[」』]/g;
  while ((match = bracketPattern.exec(text)) !== null) {
    const term = match[1];
    candidates.set(term, { term, frequency: 1, type: 'title', confidence: 0.6 });
  }

  // 빈도 2 이상만, 신뢰도 보정
  return Array.from(candidates.values())
    .map(c => ({ ...c, confidence: Math.min(1, c.confidence + (c.frequency > 3 ? 0.3 : c.frequency > 1 ? 0.15 : 0)) }))
    .filter(c => c.frequency >= 2 || c.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence || b.frequency - a.frequency)
    .slice(0, 30);
}

// 흔한 한국어 단어 (고유명사가 아닌 것)
const COMMON_KO_WORDS = new Set([
  '그것', '이것', '저것', '하지', '그리', '때문', '그래', '이런', '저런', '어떤',
  '사람', '시간', '세계', '나라', '모든', '우리', '그녀', '그들', '여기', '거기',
  '오늘', '내일', '어제', '지금', '다시', '정말', '아직', '이미', '먼저', '나중',
]);

const COMMON_EN_WORDS = new Set([
  'the', 'this', 'that', 'then', 'there', 'here', 'after', 'before',
  'however', 'therefore', 'meanwhile', 'chapter', 'part', 'section',
]);
