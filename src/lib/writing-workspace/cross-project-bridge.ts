export interface ExternalProjectBridgeRequest {
  currentProjectId: string;
  sourceProjectId: string;
  sourceProjectTitle: string;
  objective: string;
  sourceText: string;
  maxPatternChars?: number;
}

export interface ExternalCraftReference {
  id: string;
  sourceProjectId: string;
  sourceProjectTitle: string;
  objective: string;
  patternSummary: string;
  rhythmNotes: string[];
  tensionMoves: string[];
  sceneTransitionMoves: string[];
  prohibitedTerms: string[];
  sourceHash: string;
  createdAt: string;
}

export interface ExternalBridgeResult {
  ok: boolean;
  reference?: ExternalCraftReference;
  blockedReasons: string[];
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…]|[가-힣]\.)\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length >= 2)));
}

function extractQuotedTerms(text: string): string[] {
  const terms: string[] = [];
  const quotePatterns = [
    /[「『《〈“"]([^「『《〈”"』》〉]{2,24})[」』》〉”"]/gu,
    /'([^']{2,24})'/gu,
  ];
  for (const pattern of quotePatterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1]) terms.push(match[1]);
    }
  }
  return terms;
}

function extractKoreanNameLikeTerms(text: string): string[] {
  const terms: string[] = [];
  const particles = /([가-힣]{2,8})(?=은|는|이|가|을|를|에게|와|과|의|도|로|으로)/gu;
  for (const match of text.matchAll(particles)) {
    const candidate = match[1] ?? '';
    if (!COMMON_KOREAN_WORDS.has(candidate)) terms.push(candidate);
  }
  return terms;
}

function extractLatinTerms(text: string): string[] {
  return (text.match(/\b[A-Z][A-Za-z0-9_-]{2,24}\b/g) ?? [])
    .filter((term) => !COMMON_LATIN_WORDS.has(term));
}

const COMMON_KOREAN_WORDS = new Set([
  '그는',
  '그녀',
  '나는',
  '세계',
  '문장',
  '장면',
  '사건',
  '인물',
  '주인공',
  '결말',
  '시작',
  '침묵',
  '대화',
  '시선',
  '긴장',
  '정보',
  '독자',
  '전환',
]);

const COMMON_LATIN_WORDS = new Set([
  'The',
  'This',
  'That',
  'Chapter',
  'Episode',
  'Scene',
  'Project',
]);

function extractProhibitedTerms(text: string, sourceProjectTitle: string): string[] {
  const raw = [
    sourceProjectTitle,
    ...extractQuotedTerms(text),
    ...extractKoreanNameLikeTerms(text),
    ...extractLatinTerms(text),
  ];
  return unique(raw)
    .filter((term) => term.length <= 24)
    .slice(0, 40);
}

function sanitizeTerms(text: string, terms: readonly string[]): string {
  let sanitized = text;
  for (const term of terms) {
    if (!term) continue;
    sanitized = sanitized.split(term).join('[외부 고유명사]');
  }
  return sanitized;
}

function sentenceStats(sentences: readonly string[]): { avgLength: number; shortRatio: number; dialogueRatio: number } {
  if (sentences.length === 0) return { avgLength: 0, shortRatio: 0, dialogueRatio: 0 };
  const lengths = sentences.map((sentence) => sentence.length);
  const avgLength = Math.round(lengths.reduce((sum, length) => sum + length, 0) / sentences.length);
  const shortRatio = sentences.filter((sentence) => sentence.length <= 35).length / sentences.length;
  const dialogueRatio = sentences.filter((sentence) => /["“”]|[“「『]/u.test(sentence) || sentence.includes(':')).length / sentences.length;
  return { avgLength, shortRatio, dialogueRatio };
}

function makePatternSummary(input: {
  objective: string;
  sentences: readonly string[];
  prohibitedTerms: readonly string[];
  maxPatternChars: number;
}): string {
  const stats = sentenceStats(input.sentences);
  const tensionMarkers = input.sentences.filter((sentence) => /침묵|멈|숨|문|피|비밀|진실|반전|끝|열쇠|추적/u.test(sentence)).length;
  const parts = [
    `목표는 ${sanitizeTerms(input.objective, input.prohibitedTerms) || '외부 작품의 장면 작동 원리 참조'}입니다.`,
    `평균 문장 길이는 약 ${stats.avgLength}자이며, 짧은 문장 비율 ${(stats.shortRatio * 100).toFixed(0)}%로 장면 압박을 만듭니다.`,
    `대화/발화 신호 비율은 ${(stats.dialogueRatio * 100).toFixed(0)}%이고, 긴장 표지는 ${tensionMarkers}개 감지되었습니다.`,
    '외부 고유명사와 사건명은 생성 프롬프트에 넣지 않고 금지어 목록으로만 보관합니다.',
  ];
  return parts.join(' ').slice(0, input.maxPatternChars);
}

function makeRhythmNotes(sentences: readonly string[]): string[] {
  const stats = sentenceStats(sentences);
  const notes = [
    stats.shortRatio >= 0.45
      ? '짧은 문장을 연속 배치해 장면의 체감 속도를 높임'
      : '중간 길이 문장으로 설명과 행동을 균형 있게 교차',
    stats.dialogueRatio >= 0.25
      ? '발화 뒤에 행동 반응을 붙여 관계 압력을 만듦'
      : '행동 묘사 뒤에 내면 판단을 붙여 긴장 축적',
    '핵심 정보는 한 번에 풀지 않고 장면 말미로 밀어 독자의 추적감을 유지',
  ];
  return notes;
}

function makeTensionMoves(sentences: readonly string[]): string[] {
  const hasSilence = sentences.some((sentence) => /침묵|조용|멈/u.test(sentence));
  const hasReveal = sentences.some((sentence) => /진실|드러|알게|밝/u.test(sentence));
  const hasObject = sentences.some((sentence) => /문|열쇠|검|인장|기록|방/u.test(sentence));
  return [
    hasSilence ? '침묵 또는 멈춤을 먼저 두고 다음 행동의 무게를 키움' : '행동 직전의 관찰 묘사로 기대 압력을 만듦',
    hasReveal ? '정보 공개를 후반에 배치해 반전 효과를 만듦' : '정보의 일부만 보여 주고 원인 설명은 다음 장면으로 넘김',
    hasObject ? '사물 또는 공간을 갈등의 물리적 표식으로 사용' : '인물의 시선과 거리 변화로 갈등을 시각화',
  ];
}

function makeSceneTransitionMoves(sentences: readonly string[]): string[] {
  const hasDoor = sentences.some((sentence) => /문|닫|열/u.test(sentence));
  const hasSound = sentences.some((sentence) => /소리|울|딸깍|쿵/u.test(sentence));
  return [
    hasDoor ? '문, 입구, 경계면을 컷 전환 장치로 사용' : '시선 이동 또는 위치 변화로 장면을 넘김',
    hasSound ? '소리 신호를 장면 말미에 두어 다음 장면의 리듬을 열어 둠' : '마지막 문장에 미해결 질문을 남겨 다음 장면을 유도',
  ];
}

export function buildExternalCraftBridge(request: ExternalProjectBridgeRequest): ExternalBridgeResult {
  const sourceText = normalizeText(request.sourceText);
  const sourceProjectTitle = normalizeText(request.sourceProjectTitle);
  const objective = normalizeText(request.objective);
  if (request.currentProjectId === request.sourceProjectId) {
    return {
      ok: false,
      blockedReasons: ['Source project cannot be the same as the current project.'],
    };
  }
  if (!sourceText) {
    return {
      ok: false,
      blockedReasons: ['Source text is empty.'],
    };
  }

  const sentences = splitSentences(sourceText);
  const prohibitedTerms = extractProhibitedTerms(sourceText, sourceProjectTitle);
  const sourceHash = stableHash(`${request.sourceProjectId}\n${sourceText}`);
  const maxPatternChars = Math.max(240, Math.min(request.maxPatternChars ?? 900, 1600));
  const reference: ExternalCraftReference = {
    id: `external-craft-${sourceHash}`,
    sourceProjectId: request.sourceProjectId,
    sourceProjectTitle,
    objective: sanitizeTerms(objective, prohibitedTerms),
    patternSummary: makePatternSummary({ objective, sentences, prohibitedTerms, maxPatternChars }),
    rhythmNotes: makeRhythmNotes(sentences).map((note) => sanitizeTerms(note, prohibitedTerms)),
    tensionMoves: makeTensionMoves(sentences).map((move) => sanitizeTerms(move, prohibitedTerms)),
    sceneTransitionMoves: makeSceneTransitionMoves(sentences).map((move) => sanitizeTerms(move, prohibitedTerms)),
    prohibitedTerms,
    sourceHash,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    reference,
    blockedReasons: [],
  };
}

/**
 * 프롬프트에 주입할 외부 연출 패턴 블록(L3.5 계층)을 생성합니다.
 */
export function buildExternalCraftPromptBlock(reference: ExternalCraftReference): string {
  let block = `<EXTERNAL_CRAFT_REFERENCE>\n`;
  block += `[주의: 본 블록은 외부 작품의 '스타일 및 연출 기법'만을 참고하기 위한 일회용 브릿지입니다.]\n`;
  block += `참고 목적: ${reference.objective}\n`;
  block += `패턴 요약: ${reference.patternSummary}\n\n`;
  
  block += `[적용할 연출 기법]\n`;
  reference.rhythmNotes.forEach(note => block += `- 리듬: ${note}\n`);
  reference.tensionMoves.forEach(move => block += `- 텐션: ${move}\n`);
  reference.sceneTransitionMoves.forEach(move => block += `- 전환: ${move}\n`);
  
  block += `</EXTERNAL_CRAFT_REFERENCE>`;
  return block;
}

/**
 * 생성된 텍스트(Output)에 외부 고유명사가 누출되었는지 검사합니다.
 */
export function scanExternalReferenceLeak(output: string, reference: ExternalCraftReference): { leaked: boolean; hits: string[] } {
  const hits: string[] = [];
  
  for (const term of reference.prohibitedTerms) {
    if (output.includes(term)) {
      hits.push(term);
    }
  }

  return {
    leaked: hits.length > 0,
    hits,
  };
}
