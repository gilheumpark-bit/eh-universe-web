// worldgraph FILL 엔진 — chat→form 채움 흐름 (Phase 1).
import { guessCategory, firstSentence, localFillDraft, buildFillPrompt, parseAIFill, commitAsCanon } from '../fill';

describe('guessCategory', () => {
  it('키워드 → enum', () => {
    expect(guessCategory('마법은 마나를 소비한다')).toBe('magic');
    expect(guessCategory('북부 길드와 남부 세력의 전쟁')).toBe('faction');
    expect(guessCategory('수도 아르카디아 도시')).toBe('location');
    expect(guessCategory('각성 등급 시스템')).toBe('power_system');
  });
  it('매칭 없으면 rule', () => {
    expect(guessCategory('그냥 평범한 설명')).toBe('rule');
  });
});

describe('firstSentence', () => {
  it('첫 문장만 추출', () => {
    expect(firstSentence('마법은 마나를 쓴다. 두번째 문장.')).toBe('마법은 마나를 쓴다.');
    expect(firstSentence('줄바꿈\n다음줄')).toBe('줄바꿈');
  });
  it('빈 입력 → 빈 문자열', () => {
    expect(firstSentence('   ')).toBe('');
  });
});

describe('localFillDraft', () => {
  const draft = localFillDraft('마법은 시전자의 마나를 소비하며 고갈 시 발동 불가하다. 추가 설명.', { workId: 'w1', id: 'fact_x', now: 1000 });
  it('ENGINE_DRAFT provenance + HOLD confidence', () => {
    expect(draft.provenance?.origin).toBe('ENGINE_DRAFT');
    expect(draft.frontMatter.confidence).toBe(0.5);
    expect(draft.frontMatter.arcsStatus).toBe('HOLD');
  });
  it('fact = 첫 문장, category 추론, body = 전체 brainstorm', () => {
    expect(draft.frontMatter.fact).toBe('마법은 시전자의 마나를 소비하며 고갈 시 발동 불가하다.');
    expect(draft.frontMatter.category).toBe('magic');
    expect(draft.bodyRaw).toContain('추가 설명');
  });
  it('id/now 주입 결정론', () => {
    expect(draft.frontMatter.id).toBe('fact_x');
    expect(draft.frontMatter.createdAt).toBe(new Date(1000).toISOString());
  });
});

describe('parseAIFill', () => {
  it('유효 JSON → entry (ENGINE_DRAFT)', () => {
    const raw = 'noise {"id":"f1","category":"magic","tier":2,"fact":"마법은 마나를 쓴다","confidence":0.8} trailing';
    const e = parseAIFill(raw, '원본 채팅', 2000);
    expect(e).not.toBeNull();
    expect(e!.frontMatter.category).toBe('magic');
    expect(e!.frontMatter.tier).toBe(2);
    expect(e!.provenance?.origin).toBe('ENGINE_DRAFT');
  });
  it('fact 없으면 null', () => {
    expect(parseAIFill('{"category":"magic"}', 'x')).toBeNull();
  });
  it('JSON 아니면 null', () => {
    expect(parseAIFill('no json here', 'x')).toBeNull();
  });
});

describe('commitAsCanon', () => {
  it('origin USER 승격 + editedBy 기록 + PASS', () => {
    const draft = localFillDraft('마법 설명', { id: 'f', now: 1 });
    const c = commitAsCanon(draft, 5000);
    expect(c.provenance?.origin).toBe('USER');
    expect(c.provenance?.editedBy?.at(-1)).toEqual({ origin: 'USER', at: 5000 });
    expect(c.frontMatter.arcsStatus).toBe('PASS');
  });
});

describe('buildFillPrompt', () => {
  it('프롬프트에 brainstorm + 스키마 지시 포함', () => {
    const p = buildFillPrompt('마법 세계', 'SF');
    expect(p).toContain('마법 세계');
    expect(p).toContain('WorldFact');
    expect(p).toContain('SF');
  });
});
