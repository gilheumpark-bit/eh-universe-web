// ============================================================
// PART 1 — Mock RAG service (반드시 import 전)
// ============================================================

jest.mock('@/services/ragService', () => ({
  buildRAGTranslationContext: jest.fn(),
  ragBuildPrompt: jest.fn(),
  ragSearch: jest.fn(),
}));

import {
  formatRAGBlock,
  buildTranslationSystemPrompt,
  buildTranslationSystemPromptWithRAG,
  applyVoiceGuard,
  isFidelityScore,
  isExperienceScore,
  parseScoreResponse,
  buildScoringPrompt,
  buildRecreatePrompt,
  verifyGlossary,
  verifyLength,
  hasCriticalAxisFailure,
  createConsistencyTracker,
  updateConsistencyTracker,
  buildAutoBridge,
  createEmptyTranslatorProfile,
  buildTranslatorProfileHint,
  updateTranslatorProfile,
  buildGenreTranslationDirective,
  buildCharacterRegisterDirective,
  staticValidate,
  getDefaultConfig,
  inferSpeakerFromContext,
  buildSegmentsFromChunk,
  type TranslationConfig,
  type RAGTranslationContext,
  type FidelityScoreDetail,
  type ExperienceScoreDetail,
  type GlossaryEntry,
  type VoiceRule,
  type TranslatedEpisode,
  type TranslatorProfile,
  type TranslationCharacterRegister,
} from '../translation';
import { buildRAGTranslationContext } from '@/services/ragService';

const mockBuildRAGCtx = buildRAGTranslationContext as jest.MockedFunction<
  typeof buildRAGTranslationContext
>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================
// PART 2 — formatRAGBlock (PART 5B)
// ============================================================

describe('formatRAGBlock', () => {
  const emptyCtx: RAGTranslationContext = {
    worldBible: '',
    pastTerms: [],
    pastEpisodeSummary: [],
    genreRules: '',
    fetched: false,
  };

  it('fetched=false → 빈 문자열', () => {
    expect(formatRAGBlock(emptyCtx)).toBe('');
  });

  it('null/undefined ctx → 빈 문자열', () => {
    expect(formatRAGBlock(null as unknown as RAGTranslationContext)).toBe('');
  });

  it('fetched=true 이지만 모든 필드 비어있음 → 빈 문자열', () => {
    const ctx: RAGTranslationContext = { ...emptyCtx, fetched: true };
    expect(formatRAGBlock(ctx)).toBe('');
  });

  it('worldBible만 → [WORLD CONTEXT] 블록만', () => {
    const ctx: RAGTranslationContext = {
      ...emptyCtx,
      worldBible: '세계관 설정',
      fetched: true,
    };
    const result = formatRAGBlock(ctx);
    expect(result).toContain('[WORLD CONTEXT');
    expect(result).toContain('세계관 설정');
    expect(result).not.toContain('[TERM HISTORY');
  });

  it('worldBible 2000자 제한', () => {
    // [C] 헤더와 겹치지 않는 문자(z) 사용 — 헤더는 'a' 등을 포함하므로 카운트 오염
    const ctx: RAGTranslationContext = {
      ...emptyCtx,
      worldBible: 'z'.repeat(5000),
      fetched: true,
    };
    const result = formatRAGBlock(ctx);
    const zCount = (result.match(/z/g) ?? []).length;
    expect(zCount).toBeLessThanOrEqual(2000);
  });

  it('pastTerms — [TERM HISTORY] 블록 + 매핑 형식', () => {
    const ctx: RAGTranslationContext = {
      ...emptyCtx,
      pastTerms: [
        { src: '검', tgt: 'sword', episode: 3 },
        { src: '민아', tgt: 'Mina', episode: 5 },
      ],
      fetched: true,
    };
    const result = formatRAGBlock(ctx);
    expect(result).toContain('[TERM HISTORY');
    expect(result).toContain('"검" → "sword"');
    expect(result).toContain('(ep.3)');
    expect(result).toContain('"민아" → "Mina"');
  });

  it('pastTerms 20개 제한', () => {
    const terms = Array.from({ length: 30 }, (_, i) => ({
      src: `s${i}`,
      tgt: `t${i}`,
      episode: i,
    }));
    const ctx: RAGTranslationContext = { ...emptyCtx, pastTerms: terms, fetched: true };
    const result = formatRAGBlock(ctx);
    expect(result).toContain('"s0"');
    expect(result).toContain('"s19"');
    expect(result).not.toContain('"s20"');
  });

  it('pastEpisodeSummary 최근 3개 slice', () => {
    const summaries = ['s1', 's2', 's3', 's4', 's5'];
    const ctx: RAGTranslationContext = {
      ...emptyCtx,
      pastEpisodeSummary: summaries,
      fetched: true,
    };
    const result = formatRAGBlock(ctx);
    // 마지막 3개 (s3, s4, s5)
    expect(result).toContain('s3');
    expect(result).toContain('s5');
    expect(result).not.toContain('s1');
    expect(result).not.toContain('s2');
  });

  it('genreRules 1500자 제한', () => {
    // [C] 헤더 [GENRE RULES]에 다른 문자 포함 — z 사용
    const ctx: RAGTranslationContext = {
      ...emptyCtx,
      genreRules: 'z'.repeat(3000),
      fetched: true,
    };
    const result = formatRAGBlock(ctx);
    const zCount = (result.match(/z/g) ?? []).length;
    expect(zCount).toBeLessThanOrEqual(1500);
  });

  it('모든 필드 채워진 경우 → 4개 블록 모두', () => {
    const ctx: RAGTranslationContext = {
      worldBible: 'WB',
      pastTerms: [{ src: 's', tgt: 't', episode: 1 }],
      pastEpisodeSummary: ['ep1'],
      genreRules: 'GR',
      fetched: true,
    };
    const result = formatRAGBlock(ctx);
    expect(result).toContain('[WORLD CONTEXT');
    expect(result).toContain('[TERM HISTORY');
    expect(result).toContain('[RECENT EPISODES');
    expect(result).toContain('[GENRE RULES');
  });
});

// ============================================================
// PART 3 — buildTranslationSystemPromptWithRAG (PART 5B)
// ============================================================

describe('buildTranslationSystemPromptWithRAG', () => {
  it('정상 호출 → ragCtx + systemPrompt 반환', async () => {
    const ctx: RAGTranslationContext = {
      worldBible: 'WB',
      pastTerms: [],
      pastEpisodeSummary: [],
      genreRules: '',
      fetched: true,
    };
    mockBuildRAGCtx.mockResolvedValue(ctx);

    const config = getDefaultConfig('fidelity');
    const result = await buildTranslationSystemPromptWithRAG(config, {
      sourceText: '안녕',
      targetLang: 'EN',
    });

    expect(mockBuildRAGCtx).toHaveBeenCalled();
    expect(result.ragCtx.fetched).toBe(true);
    expect(result.systemPrompt).toContain('WB');
  });

  it('RAG fetched=false → systemPrompt에 RAG 블록 없음', async () => {
    const ctx: RAGTranslationContext = {
      worldBible: '',
      pastTerms: [],
      pastEpisodeSummary: [],
      genreRules: '',
      fetched: false,
    };
    mockBuildRAGCtx.mockResolvedValue(ctx);

    const config = getDefaultConfig('fidelity');
    const result = await buildTranslationSystemPromptWithRAG(config, {
      sourceText: '안녕',
      targetLang: 'EN',
    });
    expect(result.systemPrompt).not.toContain('[WORLD CONTEXT');
    expect(result.ragCtx.fetched).toBe(false);
  });

  it('options.timeoutMs를 RAG 빌더에 전달', async () => {
    mockBuildRAGCtx.mockResolvedValue({
      worldBible: '',
      pastTerms: [],
      pastEpisodeSummary: [],
      genreRules: '',
      fetched: true,
    });

    const config = getDefaultConfig('fidelity');
    await buildTranslationSystemPromptWithRAG(
      config,
      { sourceText: 'x', targetLang: 'EN' },
      { timeoutMs: 1000 },
    );
    expect(mockBuildRAGCtx).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeoutMs: 1000 }),
    );
  });

  it('systemPrompt는 항상 string 타입', async () => {
    mockBuildRAGCtx.mockResolvedValue({
      worldBible: '',
      pastTerms: [],
      pastEpisodeSummary: [],
      genreRules: '',
      fetched: false,
    });
    const config = getDefaultConfig('experience');
    const result = await buildTranslationSystemPromptWithRAG(config, {
      sourceText: 'x',
      targetLang: 'JP',
    });
    expect(typeof result.systemPrompt).toBe('string');
    expect(result.systemPrompt.length).toBeGreaterThan(0);
  });
});

// ============================================================
// PART 4 — applyVoiceGuard (PART 20)
// ============================================================

describe('applyVoiceGuard', () => {
  it('빈 rules → needsRetry false, violations 비어있음', () => {
    const result = applyVoiceGuard(
      { translatedText: 'hello', segments: [{ translation: 'hi', speaker: 'A' }] },
      { rules: [], targetLang: 'EN' },
    );
    expect(result.needsRetry).toBe(false);
    expect(result.voiceViolations).toEqual([]);
    expect(result.retryHint).toBe('');
  });

  it('opts 없음 → 즉시 통과', () => {
    const result = applyVoiceGuard(
      { translatedText: 'hello' },
      undefined as unknown as { rules: VoiceRule[]; targetLang: 'EN' },
    );
    expect(result.needsRetry).toBe(false);
  });

  it('segments 없음 (translatedText만) → 검증 skip', () => {
    const rule: VoiceRule = {
      character: 'A',
      tone: 'formal',
      mustUse: [],
      mustNotUse: [/forbidden/i],
    };
    const result = applyVoiceGuard(
      { translatedText: 'forbidden text' },
      { rules: [rule], targetLang: 'EN' },
    );
    expect(result.needsRetry).toBe(false);
  });

  it('segments에 speaker 매핑 없음 → 검증 skip', () => {
    const rule: VoiceRule = {
      character: 'A',
      tone: 'formal',
      mustUse: [],
      mustNotUse: [/yo dude/i],
    };
    const result = applyVoiceGuard(
      { segments: [{ translation: 'yo dude' }] },
      { rules: [rule], targetLang: 'EN' },
    );
    expect(result.needsRetry).toBe(false);
  });

  it('규칙 위반 (error) → needsRetry true, retryHint 비어있지 않음', () => {
    const rule: VoiceRule = {
      character: 'A',
      tone: 'formal',
      mustUse: [],
      mustNotUse: [/yo dude/i],
    };
    const result = applyVoiceGuard(
      {
        segments: [
          { translation: 'yo dude what is up', speaker: 'A' },
        ],
      },
      { rules: [rule], targetLang: 'EN' },
    );
    expect(result.needsRetry).toBe(true);
    expect(result.retryHint).not.toBe('');
    expect(result.voiceViolations.length).toBeGreaterThan(0);
  });

  it('warn만 있고 error 없음 → needsRetry false', () => {
    const rule: VoiceRule = {
      character: 'A',
      tone: 'formal',
      mustUse: [/존재하지않는패턴abc/],
      mustNotUse: [],
    };
    const result = applyVoiceGuard(
      {
        segments: [
          { translation: '이것은 충분히 긴 대사입니다 그런데 패턴 없음', speaker: 'A' },
        ],
      },
      { rules: [rule], targetLang: 'KO' },
    );
    // warn은 카운트되지만 needsRetry는 false (error만 트리거)
    expect(result.needsRetry).toBe(false);
    expect(result.voiceViolations.length).toBeGreaterThan(0);
  });

  it('result 객체는 그대로 반환됨', () => {
    const orig = { translatedText: 'x', extra: 'data' };
    const result = applyVoiceGuard(orig, { rules: [], targetLang: 'EN' });
    expect(result.result).toBe(orig);
  });
});

// ============================================================
// PART 5 — buildTranslationSystemPrompt (sync, PART 5)
// ============================================================

describe('buildTranslationSystemPrompt', () => {
  it('ragBlock 없음 → 기본 시스템 프롬프트', () => {
    const config = getDefaultConfig('fidelity');
    const prompt = buildTranslationSystemPrompt(config);
    expect(prompt).toContain('translator');
    expect(prompt).toContain('English');
  });

  it('ragBlock 주입 시 가장 앞에 위치', () => {
    const config = getDefaultConfig('fidelity');
    const ragBlock = '[WORLD CONTEXT]\nFooBar';
    const prompt = buildTranslationSystemPrompt(config, ragBlock);
    expect(prompt.indexOf('[WORLD CONTEXT]')).toBe(0);
  });

  it('experience 모드 → "literary author" 포함', () => {
    const config = getDefaultConfig('experience');
    const prompt = buildTranslationSystemPrompt(config);
    expect(prompt).toContain('literary author');
  });

  it('빈 ragBlock 무시', () => {
    const config = getDefaultConfig('fidelity');
    const prompt = buildTranslationSystemPrompt(config, '   ');
    // 공백 ragBlock은 prepend 안 됨
    expect(prompt.indexOf('translator')).toBeLessThan(50);
  });

  it('glossary 항목 → [Glossary] 블록 포함', () => {
    const glossary: GlossaryEntry[] = [
      { source: '민아', target: 'Mina', locked: true },
    ];
    const config: TranslationConfig = { ...getDefaultConfig('fidelity'), glossary };
    const prompt = buildTranslationSystemPrompt(config);
    expect(prompt).toContain('[Glossary');
    expect(prompt).toContain('"민아"');
    expect(prompt).toContain('"Mina"');
    expect(prompt).toContain('[LOCKED]');
  });

  it('빈 glossary → [Glossary] 블록 없음', () => {
    const config = getDefaultConfig('fidelity');
    const prompt = buildTranslationSystemPrompt(config);
    expect(prompt).not.toContain('[Glossary');
  });

  it('contextBridge 길이 클램프 (2000자)', () => {
    const long = 'X'.repeat(5000);
    const config: TranslationConfig = { ...getDefaultConfig('fidelity'), contextBridge: long };
    const prompt = buildTranslationSystemPrompt(config);
    const xCount = (prompt.match(/X/g) ?? []).length;
    expect(xCount).toBeLessThanOrEqual(2000);
  });
});

// ============================================================
// PART 6 — Type guards & score parsing
// ============================================================

describe('isFidelityScore / isExperienceScore', () => {
  it('FidelityScoreDetail 인식', () => {
    const f: FidelityScoreDetail = {
      overall: 0.8,
      translationese: 0.2,
      fidelity: 0.9,
      naturalness: 0.8,
      consistency: 1,
    };
    expect(isFidelityScore(f)).toBe(true);
    expect(isExperienceScore(f)).toBe(false);
  });

  it('ExperienceScoreDetail 인식', () => {
    const e: ExperienceScoreDetail = {
      overall: 0.8,
      immersion: 0.8,
      emotionResonance: 0.8,
      culturalFit: 0.8,
      consistency: 1,
      groundedness: 0.9,
      voiceInvisibility: 0.9,
    };
    expect(isExperienceScore(e)).toBe(true);
    expect(isFidelityScore(e)).toBe(false);
  });
});

describe('parseScoreResponse', () => {
  it('fidelity — 정상 JSON 파싱', () => {
    const raw = '{"translationese":0.2,"fidelity":0.9,"naturalness":0.8,"consistency":1}';
    const score = parseScoreResponse(raw, 'fidelity');
    expect(isFidelityScore(score)).toBe(true);
    expect(score.overall).toBeGreaterThan(0);
  });

  it('fidelity — 잘못된 JSON → fallback (0.5)', () => {
    const score = parseScoreResponse('garbage', 'fidelity');
    expect(score.overall).toBeGreaterThan(0);
  });

  it('experience — 정상 6축 파싱', () => {
    const raw =
      '{"immersion":0.9,"emotionResonance":0.8,"culturalFit":0.8,"consistency":1,"groundedness":0.9,"voiceInvisibility":0.9}';
    const score = parseScoreResponse(raw, 'experience');
    expect(isExperienceScore(score)).toBe(true);
    if (isExperienceScore(score)) {
      expect(score.immersion).toBe(0.9);
    }
  });

  it('범위 밖 값 clamp (0~1)', () => {
    const raw = '{"translationese":-5,"fidelity":99,"naturalness":0.5,"consistency":0.5}';
    const score = parseScoreResponse(raw, 'fidelity');
    if (isFidelityScore(score)) {
      expect(score.translationese).toBe(0);
      expect(score.fidelity).toBe(1);
    }
  });
});

// ============================================================
// PART 7 — buildScoringPrompt / buildRecreatePrompt
// ============================================================

describe('buildScoringPrompt', () => {
  it('fidelity 모드 → 4축 채점 지시', () => {
    const cfg = getDefaultConfig('fidelity');
    const prompt = buildScoringPrompt('소스', '번역', cfg);
    expect(prompt).toContain('translationese');
    expect(prompt).toContain('fidelity');
  });

  it('experience 모드 → 6축 채점 지시', () => {
    const cfg = getDefaultConfig('experience');
    const prompt = buildScoringPrompt('소스', '번역', cfg);
    expect(prompt).toContain('immersion');
    expect(prompt).toContain('groundedness');
    expect(prompt).toContain('voiceInvisibility');
  });
});

describe('buildRecreatePrompt', () => {
  it('issue 검출 → 지시문 생성', () => {
    const score: FidelityScoreDetail = {
      overall: 0.4,
      translationese: 0.7,
      fidelity: 0.4,
      naturalness: 0.5,
      consistency: 0.5,
    };
    const prompt = buildRecreatePrompt('소스', '실패번역', score, 1, 'fidelity');
    expect(prompt).toContain('Reads like a translation');
    expect(prompt.toLowerCase()).toContain('translation');
    expect(prompt).toContain('--- SOURCE ---');
  });
});

// ============================================================
// PART 8 — verifyGlossary (PART 17)
// ============================================================

describe('verifyGlossary', () => {
  it('빈 glossary → passed=true', () => {
    const result = verifyGlossary('소스', '번역', []);
    expect(result.passed).toBe(true);
    expect(result.totalChecked).toBe(0);
  });

  it('locked 항목 누락 → passed=false', () => {
    const glossary: GlossaryEntry[] = [
      { source: '민아', target: 'Mina', locked: true },
    ];
    const result = verifyGlossary('민아가 갔다', 'She went', glossary);
    expect(result.passed).toBe(false);
    expect(result.missingLocked).toHaveLength(1);
  });

  it('locked 항목 존재 → passed=true', () => {
    const glossary: GlossaryEntry[] = [
      { source: '민아', target: 'Mina', locked: true },
    ];
    const result = verifyGlossary('민아가 갔다', 'Mina went', glossary);
    expect(result.passed).toBe(true);
  });

  it('비-locked 누락 → missingOptional', () => {
    const glossary: GlossaryEntry[] = [
      { source: '검', target: 'sword', locked: false },
    ];
    const result = verifyGlossary('검을 들었다', 'Held it', glossary);
    expect(result.missingOptional).toHaveLength(1);
    expect(result.passed).toBe(true); // locked가 아니므로 통과
  });

  it('소스에 없는 용어는 무시', () => {
    const glossary: GlossaryEntry[] = [
      { source: '민아', target: 'Mina', locked: true },
    ];
    const result = verifyGlossary('영희가 갔다', 'Younghee went', glossary);
    expect(result.totalChecked).toBe(0);
  });
});

// ============================================================
// PART 9 — verifyLength (PART 18)
// ============================================================

describe('verifyLength', () => {
  it('빈 입력 → 길이 0', () => {
    const result = verifyLength('', '', 'EN', 'fidelity');
    expect(result.sourceLengthChars).toBe(0);
    expect(result.translatedLengthChars).toBe(0);
  });

  it('너무 짧으면 issue 추가', () => {
    const src = 'a'.repeat(100);
    const tgt = 'b'.repeat(50); // 0.5x — EN 최소 1.10 미만
    const result = verifyLength(src, tgt, 'EN', 'fidelity');
    expect(result.issues.some((i) => i.includes('length_too_short'))).toBe(true);
  });

  it('너무 길면 issue 추가', () => {
    const src = 'a';
    const tgt = 'a'.repeat(1000);
    const result = verifyLength(src, tgt, 'EN', 'fidelity');
    expect(result.issues.some((i) => i.includes('length_too_long'))).toBe(true);
  });

  it('정상 비율 → passed=true', () => {
    const src = '안녕하세요';
    const tgt = 'Hello there'.repeat(1); // 약 1.5배
    const result = verifyLength(src, tgt, 'EN', 'fidelity');
    expect(result.lengthRatio).toBeGreaterThan(1);
  });
});

// ============================================================
// PART 10 — hasCriticalAxisFailure (PART 19)
// ============================================================

describe('hasCriticalAxisFailure', () => {
  it('fidelity — translationese 0.65 → true', () => {
    const score: FidelityScoreDetail = {
      overall: 0.5,
      translationese: 0.65,
      fidelity: 0.8,
      naturalness: 0.8,
      consistency: 1,
    };
    expect(hasCriticalAxisFailure(score, 'fidelity')).toBe(true);
  });

  it('fidelity — fidelity 0.3 → true', () => {
    const score: FidelityScoreDetail = {
      overall: 0.5,
      translationese: 0.2,
      fidelity: 0.3,
      naturalness: 0.8,
      consistency: 1,
    };
    expect(hasCriticalAxisFailure(score, 'fidelity')).toBe(true);
  });

  it('experience — groundedness 0.4 → true', () => {
    const score: ExperienceScoreDetail = {
      overall: 0.5,
      immersion: 0.8,
      emotionResonance: 0.8,
      culturalFit: 0.8,
      consistency: 1,
      groundedness: 0.4,
      voiceInvisibility: 0.9,
    };
    expect(hasCriticalAxisFailure(score, 'experience')).toBe(true);
  });

  it('experience — voiceInvisibility 0.4 → true', () => {
    const score: ExperienceScoreDetail = {
      overall: 0.5,
      immersion: 0.8,
      emotionResonance: 0.8,
      culturalFit: 0.8,
      consistency: 1,
      groundedness: 0.9,
      voiceInvisibility: 0.4,
    };
    expect(hasCriticalAxisFailure(score, 'experience')).toBe(true);
  });

  it('정상 점수 → false', () => {
    const score: FidelityScoreDetail = {
      overall: 0.85,
      translationese: 0.2,
      fidelity: 0.9,
      naturalness: 0.85,
      consistency: 1,
    };
    expect(hasCriticalAxisFailure(score, 'fidelity')).toBe(false);
  });
});

// ============================================================
// PART 11 — Consistency tracker (PART 19)
// ============================================================

describe('createConsistencyTracker / updateConsistencyTracker', () => {
  it('초기 상태 — 빈 Map, 빈 inconsistencies', () => {
    const tracker = createConsistencyTracker();
    expect(tracker.termUsage.size).toBe(0);
    expect(tracker.inconsistencies).toEqual([]);
  });

  it('첫 청크 — 용어 등록', () => {
    const tracker = createConsistencyTracker();
    const glossary: GlossaryEntry[] = [{ source: '민아', target: 'Mina', locked: true }];
    updateConsistencyTracker(tracker, 0, 'Mina entered the hall', glossary);
    expect(tracker.termUsage.get('민아')).toBe('Mina');
  });

  it('일관된 용어 — inconsistencies 추가 없음', () => {
    const tracker = createConsistencyTracker();
    const glossary: GlossaryEntry[] = [{ source: '민아', target: 'Mina', locked: true }];
    updateConsistencyTracker(tracker, 0, 'Mina entered', glossary);
    updateConsistencyTracker(tracker, 1, 'Mina spoke', glossary);
    expect(tracker.inconsistencies).toEqual([]);
  });
});

// ============================================================
// PART 12 — buildAutoBridge (PART 12)
// ============================================================

describe('buildAutoBridge', () => {
  it('null prevResult → 빈 문자열', () => {
    expect(buildAutoBridge(null, [])).toBe('');
    expect(buildAutoBridge(undefined, [])).toBe('');
  });

  it('빈 translatedText → 빈 문자열', () => {
    const prev: TranslatedEpisode = {
      episode: 1,
      sourceLang: 'KO',
      targetLang: 'EN',
      mode: 'fidelity',
      band: 0.5,
      sourceText: '소스',
      translatedText: '',
      chunks: [],
      avgScore: 0,
      glossarySnapshot: [],
      timestamp: 0,
    };
    expect(buildAutoBridge(prev, [])).toBe('');
  });

  it('정상 — 마지막 3문장 + 모드/밴드 표시', () => {
    const prev: TranslatedEpisode = {
      episode: 5,
      sourceLang: 'KO',
      targetLang: 'EN',
      mode: 'fidelity',
      band: 0.5,
      sourceText: 'src',
      translatedText: 'First sentence. Second one. Third one.',
      chunks: [],
      avgScore: 0.8,
      glossarySnapshot: [],
      timestamp: 0,
    };
    const bridge = buildAutoBridge(prev, []);
    expect(bridge).toContain('Episode 5');
    expect(bridge).toContain('MODE=fidelity');
    expect(bridge).toContain('band=');
  });
});

// ============================================================
// PART 13 — TranslatorProfile (PART 15)
// ============================================================

describe('createEmptyTranslatorProfile', () => {
  it('초기값 — episodeCount 0, avgScore 0', () => {
    const p = createEmptyTranslatorProfile();
    expect(p.id).toBe('default');
    expect(p.episodeCount).toBe(0);
    expect(p.commonErrors).toEqual({});
  });

  it('id 지정 가능', () => {
    const p = createEmptyTranslatorProfile('custom-id');
    expect(p.id).toBe('custom-id');
  });
});

describe('buildTranslatorProfileHint', () => {
  it('episodeCount < 3 → 빈 문자열 (학습 데이터 부족)', () => {
    const p = createEmptyTranslatorProfile();
    p.episodeCount = 2;
    expect(buildTranslatorProfileHint(p)).toBe('');
  });

  it('episodeCount 3+ + 오류 있음 → 힌트 생성', () => {
    const p = createEmptyTranslatorProfile();
    p.episodeCount = 5;
    p.commonErrors = { 'A error': 5, 'B error': 2 };
    const hint = buildTranslatorProfileHint(p);
    expect(hint).toContain('Translator Pattern Correction');
    expect(hint).toContain('A error');
  });

  it('termConsistency 낮음 → 경고 추가', () => {
    const p = createEmptyTranslatorProfile();
    p.episodeCount = 5;
    p.termConsistencyRate = 0.5;
    const hint = buildTranslatorProfileHint(p);
    expect(hint).toContain('Terminology Alert');
  });

  it('toneAlignment 낮음 → 경고 추가', () => {
    const p = createEmptyTranslatorProfile();
    p.episodeCount = 5;
    p.toneAlignmentRate = 0.5;
    const hint = buildTranslatorProfileHint(p);
    expect(hint).toContain('Tone Alignment Alert');
  });
});

describe('updateTranslatorProfile', () => {
  it('첫 호출 → EMA 무시, 점수 그대로', () => {
    const p = createEmptyTranslatorProfile();
    const updated = updateTranslatorProfile(p, 0.9, 1, 1, []);
    expect(updated.episodeCount).toBe(1);
    expect(updated.avgScore).toBe(0.9);
  });

  it('두 번째 호출 → EMA 적용', () => {
    let p: TranslatorProfile = createEmptyTranslatorProfile();
    p = updateTranslatorProfile(p, 1.0, 1, 1, []);
    p = updateTranslatorProfile(p, 0.5, 1, 1, []);
    // alpha=0.3 → 0.3*0.5 + 0.7*1.0 = 0.85
    expect(p.avgScore).toBeCloseTo(0.85, 2);
  });

  it('errors 누적', () => {
    let p: TranslatorProfile = createEmptyTranslatorProfile();
    p = updateTranslatorProfile(p, 0.8, 1, 1, ['err1', 'err1', 'err2']);
    expect(p.commonErrors['err1']).toBe(2);
    expect(p.commonErrors['err2']).toBe(1);
  });
});

// ============================================================
// PART 14 — buildGenreTranslationDirective (PART 13)
// ============================================================

describe('buildGenreTranslationDirective', () => {
  it('알 수 없는 장르 → 빈 문자열', () => {
    expect(buildGenreTranslationDirective('UNKNOWN_GENRE_XYZ', 'EN')).toBe('');
  });
});

// ============================================================
// PART 15 — buildCharacterRegisterDirective (PART 14)
// ============================================================

describe('buildCharacterRegisterDirective', () => {
  it('빈 배열 → 빈 문자열', () => {
    expect(buildCharacterRegisterDirective([], 'EN')).toBe('');
  });

  it('정상 — speech 매핑 + 언어 명시', () => {
    const regs: TranslationCharacterRegister[] = [
      { name: 'Mina', relation: 'friend', age: 'young_adult', profanity: 'none' },
    ];
    const result = buildCharacterRegisterDirective(regs, 'EN');
    expect(result).toContain('Mina');
    expect(result).toContain('English');
    expect(result).toContain('casual/warm');
  });
});

// ============================================================
// PART 16 — staticValidate (PART 11)
// ============================================================

describe('staticValidate', () => {
  it('정상 호출 → 결과 객체 (NaN 없음)', () => {
    const result = staticValidate('한국어 원문입니다.', 'English translation.');
    expect(typeof result.aiToneScore).toBe('number');
    expect(typeof result.sentenceVariationIssues).toBe('number');
    expect(typeof result.emotionOvershoot).toBe('number');
    expect(Array.isArray(result.extractedNames)).toBe(true);
  });

  it('translatedText가 영어 → aiToneScore=0', () => {
    const result = staticValidate('한국어', 'pure english text');
    expect(result.aiToneScore).toBe(0);
  });
});

// ============================================================
// PART 17 — inferSpeakerFromContext (PART 21)
// ============================================================

describe('inferSpeakerFromContext', () => {
  it('대사 마커 없는 나레이션 → isDialogue: false', () => {
    const result = inferSpeakerFromContext(
      '바람이 불었다. 민아는 천천히 걸었다.',
      'The wind blew. Mina walked slowly.',
      ['민아'],
      'EN',
    );
    expect(result.isDialogue).toBe(false);
    expect(result.speaker).toBeUndefined();
  });

  it('빈 문자열 / null sourceText → 안전 가드', () => {
    expect(inferSpeakerFromContext('', 'x', ['민아'], 'KO')).toEqual({
      isDialogue: false,
    });
    expect(
      inferSpeakerFromContext(
        null as unknown as string,
        'x',
        ['민아'],
        'KO',
      ),
    ).toEqual({ isDialogue: false });
  });

  it('KO — "민아가 말했다" 패턴 → speaker=민아', () => {
    const result = inferSpeakerFromContext(
      '"안녕하세요." 민아가 말했다.',
      '"Hello." Mina said.',
      ['민아'],
      'KO',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBe('민아');
  });

  it('EN — "Mina said" 패턴 → speaker=Mina', () => {
    const result = inferSpeakerFromContext(
      '"Hello there," Mina said softly.',
      '"안녕하세요," 민아가 부드럽게 말했다.',
      ['Mina'],
      'EN',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBe('Mina');
  });

  it('JP — 「こんにちは」と ミナは言った 패턴 → speaker=ミナ', () => {
    const result = inferSpeakerFromContext(
      '「こんにちは」と ミナは言った。',
      '"안녕하세요" 미나가 말했다.',
      ['ミナ'],
      'JP',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBe('ミナ');
  });

  it('CN — "你好" 敏雅说 패턴 → speaker=敏雅', () => {
    const result = inferSpeakerFromContext(
      '"你好。" 敏雅说。',
      '"안녕." 민아가 말했다.',
      ['敏雅'],
      'CN',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBe('敏雅');
  });

  it('characterNames 빈 배열 → 패턴에서 잡힌 후보 그대로', () => {
    const result = inferSpeakerFromContext(
      '"가자." 알 수 없는 사람이 말했다.',
      '"Let\'s go."',
      [],
      'KO',
    );
    expect(result.isDialogue).toBe(true);
    // 빈 배열이어도 패턴 매칭된 candidate 반환
    expect(typeof result.speaker).toBe('string');
    expect(result.speaker?.length).toBeGreaterThan(0);
  });

  it('대사 있지만 화자 패턴 미매칭 → isDialogue: true, speaker undefined', () => {
    const result = inferSpeakerFromContext(
      '"이것은 화자 없는 대사입니다."',
      '"This is a speakerless line."',
      ['민아'],
      'KO',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBeUndefined();
  });

  it('characterNames fuzzy 매칭 — 부분 포함 일치', () => {
    // 패턴이 "민아"만 잡아도 캐릭터 풀에 "민아 (주인공)"이 있으면 매칭
    const result = inferSpeakerFromContext(
      '"안녕." 민아가 말했다.',
      '"Hi." Mina said.',
      ['민아 (주인공)', '준호'],
      'KO',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBe('민아 (주인공)');
  });

  it('targetLang 가 4개 외 값이면 KO 패턴 fallback', () => {
    const result = inferSpeakerFromContext(
      '"안녕." 민아가 말했다.',
      '"Hi."',
      ['민아'],
      // @ts-expect-error 의도적 잘못된 값 — KO fallback 검증
      'XX',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBe('민아');
  });

  it('JP — 『...』 형태 대사도 dialogue로 인식', () => {
    const result = inferSpeakerFromContext(
      '『よし』と ミナは叫んだ。',
      '"좋아" 미나가 외쳤다.',
      ['ミナ'],
      'JP',
    );
    expect(result.isDialogue).toBe(true);
    expect(result.speaker).toBe('ミナ');
  });

  it('EN — replied/whispered 동사 다양성', () => {
    const r1 = inferSpeakerFromContext(
      '"Yes," John replied calmly.',
      '"네," 존이 차분하게 답했다.',
      ['John'],
      'EN',
    );
    expect(r1.speaker).toBe('John');

    const r2 = inferSpeakerFromContext(
      '"Run!" Sarah whispered urgently.',
      '"뛰어!" 사라가 다급히 속삭였다.',
      ['Sarah'],
      'EN',
    );
    expect(r2.speaker).toBe('Sarah');
  });
});

// ============================================================
// PART 18 — buildSegmentsFromChunk (PART 21)
// ============================================================

describe('buildSegmentsFromChunk', () => {
  it('빈 입력 → 빈 배열', () => {
    expect(buildSegmentsFromChunk('', '', [], 'KO')).toEqual([]);
    expect(buildSegmentsFromChunk('   ', '   ', [], 'KO')).toEqual([]);
  });

  it('나레이션만 → segments 모두 isDialogue=false', () => {
    const segments = buildSegmentsFromChunk(
      '바람이 불었다. 민아는 천천히 걸었다.',
      'The wind blew. Mina walked slowly.',
      ['민아'],
      'EN',
    );
    expect(segments.length).toBeGreaterThan(0);
    segments.forEach(s => {
      expect(s.isDialogue).toBe(false);
      expect(s.speaker).toBeUndefined();
    });
  });

  it('대사 + 나레이션 혼재 → 세그먼트별 speaker 분리', () => {
    const source = '"안녕하세요." 민아가 말했다.\n바람이 불었다.';
    const translation = '"Hello." Mina said.\nThe wind blew.';
    const segments = buildSegmentsFromChunk(
      source,
      translation,
      ['민아'],
      'KO',
    );
    expect(segments.length).toBeGreaterThanOrEqual(2);
    // 첫 세그먼트 — 대사
    const dialogueSeg = segments.find(s => s.isDialogue === true);
    expect(dialogueSeg).toBeDefined();
    expect(dialogueSeg?.speaker).toBe('민아');
    // 마지막 세그먼트 — 나레이션 (바람이 불었다)
    const narrationSeg = segments.find(s => s.isDialogue === false);
    expect(narrationSeg).toBeDefined();
    expect(narrationSeg?.speaker).toBeUndefined();
  });

  it('characterNames 비어도 안전 — segments 생성됨', () => {
    const segments = buildSegmentsFromChunk(
      '"안녕." 민아가 말했다.',
      '"Hi." Mina said.',
      [],
      'EN',
    );
    expect(segments.length).toBeGreaterThan(0);
    // 매칭 캐릭터 없어도 패턴 candidate 사용
    const dialogueSeg = segments.find(s => s.isDialogue === true);
    expect(dialogueSeg?.speaker).toBeDefined();
  });

  it('각 세그먼트는 sourceText/translation 페어 보존', () => {
    const segments = buildSegmentsFromChunk(
      '첫 문장. 두 번째 문장.',
      'First sentence. Second sentence.',
      [],
      'EN',
    );
    expect(segments.length).toBeGreaterThanOrEqual(2);
    expect(segments[0].sourceText).toBe('첫 문장.');
    expect(segments[0].translation).toBe('First sentence.');
  });

  it('원문/번역 문장 수 다름 → max 기준 정렬, 빈 문자열 fallback', () => {
    // 원문 2문장, 번역 1문장 → 두 번째 세그먼트의 translation은 빈 문자열
    const segments = buildSegmentsFromChunk(
      '문장 하나. 문장 둘.',
      'Single sentence.',
      [],
      'EN',
    );
    expect(segments.length).toBe(2);
    expect(segments[1].translation).toBe('');
  });
});

// ============================================================
// PART 19 — applyVoiceGuard 통합 검증 (segments 자동 빌드 + 화자 매칭)
// ============================================================

describe('applyVoiceGuard + buildSegmentsFromChunk 통합', () => {
  it('buildSegmentsFromChunk 결과를 applyVoiceGuard 가 그대로 검증', () => {
    const segments = buildSegmentsFromChunk(
      '"존댓말입니다." 민아가 말했다.',
      '"yo dude!" Mina said.',
      ['민아'],
      'EN',
    );
    // 민아 세그먼트가 있어야 검증 가능
    const dialogueSeg = segments.find(s => s.speaker);
    expect(dialogueSeg).toBeDefined();

    const rule: VoiceRule = {
      character: dialogueSeg?.speaker ?? '민아',
      tone: 'formal',
      mustUse: [],
      mustNotUse: [/yo dude/i],
    };
    const guarded = applyVoiceGuard(
      { translatedText: '...', segments },
      { rules: [rule], targetLang: 'EN' },
    );
    expect(guarded.needsRetry).toBe(true);
    expect(guarded.voiceViolations.length).toBeGreaterThan(0);
  });
});
