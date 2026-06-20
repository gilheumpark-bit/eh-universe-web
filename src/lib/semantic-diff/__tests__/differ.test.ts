import { computeSemanticDiff } from '../differ';

describe('computeSemanticDiff', () => {
  test('동일 텍스트 → 변화 0', () => {
    const r = computeSemanticDiff('동일한 텍스트', '동일한 텍스트');
    expect(r.overallChange).toBeLessThan(20);
  });

  test('격식 → 캐주얼 톤 변화', () => {
    const r = computeSemanticDiff('하셨습니다 되었습니다', 'ㅋㅋ ㅎㅎ ~');
    const tone = r.axes.find((a) => a.axis === 'tone');
    expect(tone?.changeIntensity).toBeGreaterThan(30);
  });

  test('떡밥 추가 → foreshadow axis 활성', () => {
    const r = computeSemanticDiff('아무 내용', '[떡밥-검은검] [떡밥-숨겨진왕가]');
    const f = r.axes.find((a) => a.axis === 'foreshadow');
    expect(f?.changeIntensity).toBeGreaterThan(30);
  });

  test('텐션 신호 변화', () => {
    const r = computeSemanticDiff('평온한 하루였다', '외쳤다! 폭발했다! 비명을 질렀다!');
    const t = r.axes.find((a) => a.axis === 'tension');
    expect(t?.changeIntensity).toBeGreaterThan(20);
  });

  test('primaryAxis 가장 큰 변화 axis 식별', () => {
    const r = computeSemanticDiff('아무 내용', '[떡밥-A] [떡밥-B] [떡밥-C] [떡밥-D] [떡밥-E]');
    expect(r.primaryAxis).toBe('foreshadow');
  });
});
