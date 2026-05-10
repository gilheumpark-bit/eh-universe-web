import { extractMetaDefinitions } from '../extractor';

describe('extractMetaDefinitions', () => {
  test('빈 입력 → 빈 array', () => {
    expect(extractMetaDefinitions('', 0, 0)).toEqual([]);
  });

  test('"X 는 회사" 추출', () => {
    const r = extractMetaDefinitions('EH 는 회사이다', 0, 0);
    expect(r.find((d) => d.kind === 'company' && d.key === 'EH')).toBeDefined();
  });

  test('"X = Y" hierarchy 추출', () => {
    const r = extractMetaDefinitions('Loreguard = 1번 제품', 0, 0);
    const def = r.find((d) => d.key === 'Loreguard');
    expect(def).toBeDefined();
  });

  test('내부/외부 scope', () => {
    const r1 = extractMetaDefinitions('ARCS 는 내부 기술', 0, 0);
    expect(r1.find((d) => d.key === 'ARCS')?.scope).toBe('internal');
    // "외부 노출 X" — 외부 scope 정의 추출
    const r2 = extractMetaDefinitions('Loreguard 는 외부 제품이다', 0, 0);
    expect(r2.find((d) => d.key === 'Loreguard')?.scope).toBe('external');
  });

  test('수치 추출', () => {
    const r = extractMetaDefinitions('뤼튼 400억 = 매출', 0, 0);
    const def = r.find((d) => d.kind === 'numeric');
    expect(def).toBeDefined();
  });

  test('날짜 추출', () => {
    const r = extractMetaDefinitions('PCT 마감 2027-03-03', 0, 0);
    const def = r.find((d) => d.kind === 'date');
    expect(def).toBeDefined();
    expect(def?.value).toBe('2027-03-03');
  });

  test('폐기 추출', () => {
    const r = extractMetaDefinitions('VS Code 폐기', 0, 0);
    const def = r.find((d) => d.kind === 'rejection');
    expect(def).toBeDefined();
  });
});
