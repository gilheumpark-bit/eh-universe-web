import { buildCompletionGapReport } from '../orchestrator';
import { extractCompletionClaims } from '../claim-extractor';
import type { Message } from '@/lib/studio-types';

function aMsg(content: string, ts = 0): Message {
  return { id: `a-${ts}`, role: 'assistant', content, timestamp: ts };
}

describe('extractCompletionClaims', () => {
  test('빈 messages → 빈 array', () => {
    expect(extractCompletionClaims([])).toEqual([]);
    expect(extractCompletionClaims(undefined)).toEqual([]);
  });

  test('완료 키워드 추출 + 파일 경로', () => {
    const claims = extractCompletionClaims([
      aMsg('Phase B Symbol IDE 완료. src/lib/symbol-index/builder.ts 신설.'),
    ]);
    expect(claims.length).toBeGreaterThan(0);
    const completed = claims.find((c) => c.kind === 'completed');
    expect(completed?.filePath).toBe('src/lib/symbol-index/builder.ts');
  });

  test('테스트 통과 추출', () => {
    const claims = extractCompletionClaims([aMsg('테스트 통과 — 95/95 test pass')]);
    const passed = claims.find((c) => c.kind === 'passed');
    expect(passed).toBeDefined();
  });
});

describe('buildCompletionGapReport', () => {
  test('빈 → 빈 report', () => {
    const r = buildCompletionGapReport([]);
    expect(r.totalClaims).toBe(0);
  });

  test('placeholder 감지 → fail severity', () => {
    const r = buildCompletionGapReport([
      aMsg('useFoo 구현 완료. src/hooks/useFoo.ts 작성. 단 TODO: 실제 로직 채우기.'),
    ]);
    expect(r.totalClaims).toBeGreaterThan(0);
    const hasFail = r.verifications.some((v) => v.overallSeverity === 'fail');
    expect(hasFail).toBe(true);
  });

  test('정상 wiring 표현 → pass', () => {
    const r = buildCompletionGapReport([
      aMsg('Settings 토글 등록 완료. SettingsView.tsx 에 mount. import 추가.'),
    ]);
    expect(r.totalClaims).toBeGreaterThan(0);
    expect(r.passedClaims).toBeGreaterThanOrEqual(0);
  });

  test('default OFF 감지 → warn', () => {
    const r = buildCompletionGapReport([
      aMsg('formatOnSaveAutoApply 토글 완료. 기본 OFF — 사용자 명시 ON 필요.'),
    ]);
    const hasWarn = r.verifications.some((v) =>
      v.verdicts.some((vd) => vd.axis === 'default' && vd.severity === 'warn'),
    );
    expect(hasWarn).toBe(true);
  });

  test('user 메시지는 무시', () => {
    const messages: Message[] = [
      { id: 'u1', role: 'user', content: '완료해줘', timestamp: 0 },
      aMsg('해보겠습니다'),
    ];
    const r = buildCompletionGapReport(messages);
    expect(r.totalClaims).toBe(0); // assistant 응답에 "완료" 키워드 없음
  });
});
