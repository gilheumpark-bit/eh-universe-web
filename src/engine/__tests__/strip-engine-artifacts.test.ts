// ============================================================
// stripEngineArtifacts — Qwen 3.6-35B reasoning artifact 필터 테스트
// ============================================================
// 서버 AI 피드백 (2026-04-20): vLLM 플래그로는 Thinking Process 차단 불가.
// 클라이언트 필터가 유일 방어선. 실측 누출 패턴 기반 회귀 테스트.

import { stripEngineArtifacts } from '../pipeline';

describe('stripEngineArtifacts — reasoning artifact 제거', () => {
  // ──────────────────────────────────────────────────────────
  // PART 1 — 실측 누출 패턴 제거 검증
  // ──────────────────────────────────────────────────────────

  test("'Here's a thinking process:' 리드 + 번호 분석 + 한글 본문 — 영문 제거", () => {
    const input = `Here's a thinking process:

1.  **Analyze User Input:**
   - User provided: '바람이 불었다.' 다음 문장
   - Translation: 'The wind blew.'

2.  **Formulate Response:**
   - Need single Korean sentence.

그는 고개를 돌렸다.`;

    const output = stripEngineArtifacts(input);
    expect(output).toBe('그는 고개를 돌렸다.');
    expect(output).not.toContain('thinking process');
    expect(output).not.toContain('Analyze');
  });

  test("'We are given:' 리드 패턴 제거", () => {
    const input = `We are given: "테스트". This is Korean for "test".
The user wants a response.

안녕하세요, 작가님.`;

    const output = stripEngineArtifacts(input);
    expect(output).toBe('안녕하세요, 작가님.');
  });

  test("'Let me analyze' 리드 + 한글 본문", () => {
    const input = `Let me analyze this request.
The user is asking for a Korean sentence.

바람이 거세게 불었다.`;

    const output = stripEngineArtifacts(input);
    expect(output).toBe('바람이 거세게 불었다.');
  });

  test('영문 리드 + 한글 0자 = 빈 문자열', () => {
    const input = `Here's a thinking process:
1. Analyze
2. Respond
3. Done`;

    const output = stripEngineArtifacts(input);
    expect(output).toBe('');
  });

  test('<think> 태그 블록 제거 + 본문 유지', () => {
    const input = `<think>
The user asks for Korean.
Let me construct a sentence.
</think>
그녀는 조용히 문을 닫았다.`;

    const output = stripEngineArtifacts(input);
    expect(output).toContain('그녀는 조용히 문을 닫았다.');
    expect(output).not.toContain('<think>');
    expect(output).not.toContain('Let me construct');
  });

  test('열린 태그 없이 닫힌 </think> 단독 — 그 이후만 본문', () => {
    const input = `Here's a thinking process:
1. Analyze
2. Self-Correction
</think>

그는 칼을 뽑았다.`;

    const output = stripEngineArtifacts(input);
    expect(output).toBe('그는 칼을 뽑았다.');
    expect(output).not.toContain('Self-Correction');
    expect(output).not.toContain('</think>');
  });

  test('Qwen "Draft → Self-Correction → Final" 패턴 — Final 이후만 취함', () => {
    const input = `Here's a thinking process:

1. Analyze User: Korean request
2. Draft: 안녕하세요
3. Self-Correction: Check grammar
4. Verification: OK
</think>

안녕하세요! 한국어 답변입니다.`;

    const output = stripEngineArtifacts(input);
    expect(output).toBe('안녕하세요! 한국어 답변입니다.');
  });

  test('**Final Output:** 마커 이후만 취함', () => {
    const input = `Analysis: The request is Korean.
Plan: Write one sentence.

**Final Output:**
그는 하늘을 바라보았다.`;

    const output = stripEngineArtifacts(input);
    expect(output).toBe('그는 하늘을 바라보았다.');
  });

  // ──────────────────────────────────────────────────────────
  // PART 2 — 정당한 영어 프리픽스 보존 (false positive 방어)
  // ──────────────────────────────────────────────────────────

  test('영어 고유명사로 시작하는 정당한 한국어 응답 — 보존', () => {
    // artifact 키워드 없으면 첫 영어는 그대로 유지
    const input = 'NOA는 작가를 돕는 AI 엔진이다. API 호출은 간단하다.';
    const output = stripEngineArtifacts(input);
    expect(output).toBe(input);
    expect(output).toContain('NOA');
    expect(output).toContain('API');
  });

  test('따옴표 안 영어 인용 — 보존', () => {
    const input = '그는 "Hello, world"라고 속삭였다.';
    const output = stripEngineArtifacts(input);
    expect(output).toBe(input);
  });

  test('순수 한글 응답 — 무변형', () => {
    const input = '검은 탑의 문이 열렸다.\n\n그는 숨을 들이쉬었다.';
    const output = stripEngineArtifacts(input);
    expect(output).toBe(input);
  });

  test('첫 문자가 이미 한글 — artifact 키워드 있어도 안전 (오탐 방지)', () => {
    // 이론상 "thinking process" 키워드가 본문 내용에 포함될 수 있음
    const input = '그는 생각했다. "Thinking process 가 느리다." 라고.';
    const output = stripEngineArtifacts(input);
    // 첫 글자가 한글이므로 원본 유지
    expect(output).toBe(input);
  });

  // ──────────────────────────────────────────────────────────
  // PART 3 — JSON 리포트 블록 제거 (기존 동작 유지)
  // ──────────────────────────────────────────────────────────

  test('trailing JSON grade 블록 제거', () => {
    const input = `본문 내용입니다.

{"grade": "A", "metrics": {"tension": 7}}`;
    const output = stripEngineArtifacts(input);
    expect(output).toContain('본문 내용입니다.');
    expect(output).not.toContain('grade');
  });

  test("'알겠습니다, 작가님.' AI 프리픽스 제거", () => {
    const input = '알겠습니다, 작가님. 그는 검을 뽑았다.';
    const output = stripEngineArtifacts(input);
    expect(output).toBe('그는 검을 뽑았다.');
  });
});
