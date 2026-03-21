import { calculateEOSScore, calculateGrade, analyzeMetrics } from '../scoring';

// ============================================================
// calculateEOSScore() — 감정 밀도 점수
// ============================================================

describe('calculateEOSScore', () => {
  it('returns 0 for empty or short text', () => {
    expect(calculateEOSScore('')).toBe(0);
    expect(calculateEOSScore('짧은')).toBe(0);
  });

  it('returns value between 0 and 100', () => {
    const text = '그녀의 눈물이 흘러내렸다. 심장이 뛰었다. "살려줘!" 그는 미소를 지었다. 목소리가 떨렸다. 손끝이 차가웠다. 바람 소리가 울렸다. 어둠 속에서 빛이 새어나왔다. 그리움이 밀려왔다.';
    const score = calculateEOSScore(text);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('emotional text scores higher than dry text', () => {
    const emotional = '눈물이 흘렀다. 심장이 터질 것 같았다. "제발..." 그는 웃음을 참지 못했다. 손끝이 떨렸다. 그리움이 밀려왔다. 슬픔이 가득했다. 두려움에 숨이 멎었다. 목소리가 떨리고 있었다. 어둠 속에서 빛이 사라졌다. 냄새가 코를 찔렀다. 차가운 바람이 피부를 스쳤다.';
    const dry = '그는 문을 열었다. 방에 들어갔다. 의자에 앉았다. 책을 펼쳤다. 페이지를 넘겼다. 글자를 읽었다. 다시 닫았다. 밖으로 나갔다. 계단을 내려갔다. 현관을 지나쳤다. 대문을 열었다. 길을 걸었다.';
    expect(calculateEOSScore(emotional)).toBeGreaterThan(calculateEOSScore(dry));
  });

  it('dialogue-heavy text gets dialogue score', () => {
    const dialogue = '"안녕하세요." 그가 말했다. "오랜만이네요." 그녀가 답했다. "어디 가셨어요?" 그가 물었다. "멀리 갔다 왔어요." 그녀가 웃었다. "다음에 또 만나요." 그가 손을 흔들었다. "네, 꼭요." 그녀가 고개를 끄덕였다.';
    const score = calculateEOSScore(dialogue);
    expect(score).toBeGreaterThan(0);
  });
});

// ============================================================
// calculateGrade() — 등급 계산
// ============================================================

describe('calculateGrade', () => {
  it('returns S++ for 95+', () => {
    expect(calculateGrade(95)).toBe('S++');
    expect(calculateGrade(100)).toBe('S++');
  });

  it('returns correct grades for boundaries', () => {
    expect(calculateGrade(90)).toBe('S+');
    expect(calculateGrade(85)).toBe('S');
    expect(calculateGrade(80)).toBe('A+');
    expect(calculateGrade(75)).toBe('A');
    expect(calculateGrade(70)).toBe('B+');
    expect(calculateGrade(65)).toBe('B');
    expect(calculateGrade(55)).toBe('C+');
    expect(calculateGrade(54)).toBe('C');
    expect(calculateGrade(0)).toBe('C');
  });

  it('grade improves with higher score', () => {
    const grades = ['C', 'C+', 'B', 'B+', 'A', 'A+', 'S', 'S+', 'S++'];
    const g1 = grades.indexOf(calculateGrade(30));
    const g2 = grades.indexOf(calculateGrade(70));
    const g3 = grades.indexOf(calculateGrade(95));
    expect(g3).toBeGreaterThan(g2);
    expect(g2).toBeGreaterThan(g1);
  });
});

// ============================================================
// analyzeMetrics() — 텐션/페이싱/몰입 분석
// ============================================================

describe('analyzeMetrics', () => {
  const mockConfig = { genre: 'SF', episode: 1, totalEpisodes: 25, povCharacter: '', setting: '', primaryEmotion: '', title: '', guardrails: { min: 3000, max: 5000 }, characters: [], platform: 'MOBILE' as const };

  it('returns zeros for empty text', () => {
    const result = analyzeMetrics('', mockConfig as any);
    expect(result.tension).toBe(0);
    expect(result.pacing).toBe(0);
    expect(result.immersion).toBe(0);
  });

  it('returns values between 0 and 100', () => {
    const text = '위험한 상황이 벌어졌다. 갑자기 폭발이 일어났다. 비명 소리가 울렸다. "도망쳐!" 그는 달렸다. 심장이 터질 듯 뛰었다. 긴장된 순간이었다.';
    const result = analyzeMetrics(text, mockConfig as any);
    expect(result.tension).toBeGreaterThanOrEqual(0);
    expect(result.tension).toBeLessThanOrEqual(100);
    expect(result.pacing).toBeGreaterThanOrEqual(0);
    expect(result.pacing).toBeLessThanOrEqual(100);
    expect(result.immersion).toBeGreaterThanOrEqual(0);
    expect(result.immersion).toBeLessThanOrEqual(100);
  });

  it('action-heavy text has higher tension', () => {
    const action = '폭발이 일어났다. 비명 소리가 울렸다. 전투가 시작됐다. 위험한 적이 나타났다. 충돌하는 소리가 들렸다. 긴장된 대치가 계속됐다. 급하게 달렸다. 갑자기 문이 열렸다. 위험한 상황이 벌어졌다. 폭발음이 다시 울렸다. 전투의 열기가 고조됐다. 비명이 멈추지 않았다.';
    const calm = '바다가 잔잔했다. 하늘이 맑았다. 새가 지저귀었다. 평화로운 오후였다. 구름이 흘러갔다. 풀밭에 누웠다. 바람이 살랑 불었다. 따뜻한 햇살이 내리쬐었다. 물결이 반짝였다. 조용한 시간이 흘렀다. 나비가 날아갔다. 꽃향기가 퍼졌다.';
    expect(analyzeMetrics(action, mockConfig as any).tension).toBeGreaterThan(analyzeMetrics(calm, mockConfig as any).tension);
  });
});
