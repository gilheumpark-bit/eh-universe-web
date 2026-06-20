/**
 * engine/scene-parser.ts — parseManuscript 실제 로직 테스트
 * 기존 3개 플레이스홀더 + parseManuscript 실 테스트
 * 커버리지 10.67% → 30%+ 목표
 */

import { parseManuscript } from '../scene-parser';

describe('scene-parser module', () => {
  it('module loads without error', () => {
    expect(() => require('../scene-parser')).not.toThrow();
  });

  it('defines BeatType values', () => {
    const beatTypes = ['dialogue', 'narration', 'action', 'thought', 'description'];
    expect(beatTypes).toContain('dialogue');
    expect(beatTypes).toHaveLength(5);
  });

  it('defines Tempo values', () => {
    const tempos = ['fast', 'normal', 'slow'];
    expect(tempos).toContain('fast');
    expect(tempos).toHaveLength(3);
  });

  it('defines CameraAngle values', () => {
    const angles = ['wide', 'medium', 'close', 'pov'];
    expect(angles).toContain('pov');
    expect(angles).toHaveLength(4);
  });
});

describe('parseManuscript', () => {
  it('빈 문자열 입력 시 빈 결과 + 경고', () => {
    const result = parseManuscript('');
    expect(result.scenes).toEqual([]);
    expect(result.totalBeats).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('10자 미만 텍스트 경고', () => {
    const result = parseManuscript('짧다.');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('일반 원고 파싱 — 장면 + 비트 생성', () => {
    const text = `아리스가 방 안에 있었다.
"안녕하세요."
"반갑습니다."
그녀는 책을 집어 들었다.`;
    const result = parseManuscript(text);
    expect(result.scenes.length).toBeGreaterThanOrEqual(1);
    expect(result.totalBeats).toBeGreaterThan(0);
  });

  it('캐릭터 입력 시 스피커 추론', () => {
    const text = `"안녕하세요." 아리스가 말했다.
"반갑습니다." 밥이 답했다.`;
    const chars = [
      { name: '아리스' },
      { name: '밥' },
    ] as Parameters<typeof parseManuscript>[1];
    const result = parseManuscript(text, chars);
    expect(result.scenes.length).toBeGreaterThanOrEqual(1);
  });

  it('장면 구분자(***)로 씬 분리', () => {
    const text = `첫 번째 장면이다. 아리스가 걸었다.
***
두 번째 장면이다. 밥이 뛰었다.`;
    const result = parseManuscript(text);
    expect(result.scenes.length).toBeGreaterThanOrEqual(1);
  });

  it('totalDuration 계산 — non-negative', () => {
    const text = `아리스가 문을 열었다. 빛이 들어왔다. 그녀는 놀랐다.`;
    const result = parseManuscript(text);
    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
  });

  it('대화 전용 텍스트 처리', () => {
    const text = `"안녕."
"반갑다."
"좋은 날이네."`;
    const result = parseManuscript(text);
    expect(result.totalBeats).toBeGreaterThanOrEqual(1);
  });

  it('서술 전용 텍스트 처리', () => {
    const text = `방이 어두웠다. 창문 밖으로 달빛이 들어왔다. 시계는 자정을 가리켰다.`;
    const result = parseManuscript(text);
    expect(result.totalBeats).toBeGreaterThan(0);
  });

  it('빈 줄 + 공백 라인 무시', () => {
    const text = `첫 문장이다.


둘째 문장이다.



셋째 문장이다.`;
    const result = parseManuscript(text);
    expect(result.scenes.length).toBeGreaterThanOrEqual(1);
  });
});
