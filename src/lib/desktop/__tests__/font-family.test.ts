import {
  FONT_FAMILIES,
  fontStackById,
  fontLabel,
  listFonts,
  isFontFamilyId,
  type FontFamilyId,
  type FontFamilyOption,
} from '../font-family';

describe('FONT_FAMILIES 카탈로그', () => {
  it('8 개 옵션 + 필수 id 전부 포함', () => {
    const ids = FONT_FAMILIES.map(o => o.id);
    expect(ids).toEqual(
      expect.arrayContaining<FontFamilyId>([
        'system',
        'serif',
        'sans',
        'mono',
        'pretendard',
        'noto-sans-kr',
        'nanum-myeongjo',
        'kopubworld-batang',
      ]),
    );
    expect(FONT_FAMILIES.length).toBe(8);
  });

  it('각 항목의 stack/label/kind 가 모두 채워져 있음', () => {
    for (const opt of FONT_FAMILIES) {
      expect(typeof opt.stack).toBe('string');
      expect(opt.stack.length).toBeGreaterThan(0);
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
      expect(['serif', 'sans', 'mono']).toContain(opt.kind);
    }
  });

  it('한글 친화 한국 웹폰트가 일반 generic 보다 앞에 노출', () => {
    const ids = FONT_FAMILIES.map(o => o.id);
    const idxPretendard = ids.indexOf('pretendard');
    const idxNoto = ids.indexOf('noto-sans-kr');
    const idxNanum = ids.indexOf('nanum-myeongjo');
    const idxKoPub = ids.indexOf('kopubworld-batang');
    const idxGenericSans = ids.indexOf('sans');
    const idxGenericSerif = ids.indexOf('serif');
    expect(idxPretendard).toBeLessThan(idxGenericSans);
    expect(idxNoto).toBeLessThan(idxGenericSans);
    expect(idxNanum).toBeLessThan(idxGenericSerif);
    expect(idxKoPub).toBeLessThan(idxGenericSerif);
  });

  it('카탈로그가 동결되어 변형 불가 (런타임 보호)', () => {
    expect(Object.isFrozen(FONT_FAMILIES)).toBe(true);
    expect(() => {
      (FONT_FAMILIES as unknown as FontFamilyOption[]).push({
        id: 'sans',
        label: 'x',
        stack: 'x',
        kind: 'sans',
      });
    }).toThrow();
  });
});

describe('fontStackById', () => {
  it('알려진 id → 해당 stack', () => {
    expect(fontStackById('pretendard')).toMatch(/Pretendard/);
    expect(fontStackById('noto-sans-kr')).toMatch(/Noto Sans KR/);
    expect(fontStackById('nanum-myeongjo')).toMatch(/Nanum Myeongjo/);
    expect(fontStackById('kopubworld-batang')).toMatch(/KoPubWorld Batang/);
    expect(fontStackById('mono')).toMatch(/monospace/);
  });

  it('system stack 은 sans-serif 폴백을 포함', () => {
    expect(fontStackById('system')).toMatch(/sans-serif/);
  });

  it('미지/빈/null/undefined/비문자열 → system 폴백 stack (빈 문자열 금지)', () => {
    const sys = fontStackById('system');
    expect(fontStackById('unknown-id')).toBe(sys);
    expect(fontStackById('')).toBe(sys);
    expect(fontStackById(null)).toBe(sys);
    expect(fontStackById(undefined)).toBe(sys);
    expect(fontStackById(123 as unknown as string)).toBe(sys);
    expect(fontStackById({} as unknown as string)).toBe(sys);
    // 어떤 경우에도 빈 문자열은 돌려주지 않음
    expect(fontStackById('zzz').length).toBeGreaterThan(0);
  });
});

describe('fontLabel', () => {
  it('알려진 id → 해당 라벨', () => {
    expect(fontLabel('pretendard')).toBe('Pretendard');
    expect(fontLabel('noto-sans-kr')).toBe('Noto Sans KR');
    expect(fontLabel('nanum-myeongjo')).toBe('나눔명조');
    expect(fontLabel('kopubworld-batang')).toBe('KoPubWorld 바탕');
    expect(fontLabel('system')).toBe('시스템 기본');
  });

  it('미지/빈/null/undefined/비문자열 → system 라벨 폴백', () => {
    const sysLabel = fontLabel('system');
    expect(fontLabel('unknown-id')).toBe(sysLabel);
    expect(fontLabel('')).toBe(sysLabel);
    expect(fontLabel(null)).toBe(sysLabel);
    expect(fontLabel(undefined)).toBe(sysLabel);
    expect(fontLabel(0 as unknown as string)).toBe(sysLabel);
  });
});

describe('listFonts', () => {
  it('카탈로그 순서 그대로 8 개 id 반환', () => {
    const ids = listFonts();
    expect(ids.length).toBe(8);
    expect(ids[0]).toBe('system');
    expect(ids).toEqual(FONT_FAMILIES.map(o => o.id));
  });

  it('반환값 변형이 카탈로그를 오염시키지 않음 (사본 보장)', () => {
    const a = listFonts();
    a.pop();
    a.push('system');
    const b = listFonts();
    expect(b.length).toBe(8);
    expect(b).toEqual(FONT_FAMILIES.map(o => o.id));
  });
});

describe('isFontFamilyId', () => {
  it('카탈로그 id 는 모두 true', () => {
    for (const id of listFonts()) {
      expect(isFontFamilyId(id)).toBe(true);
    }
  });

  it('미지/빈/null/undefined/비문자열 → false', () => {
    expect(isFontFamilyId('unknown')).toBe(false);
    expect(isFontFamilyId('')).toBe(false);
    expect(isFontFamilyId(null)).toBe(false);
    expect(isFontFamilyId(undefined)).toBe(false);
    expect(isFontFamilyId(123)).toBe(false);
    expect(isFontFamilyId({})).toBe(false);
    expect(isFontFamilyId([])).toBe(false);
  });
});

describe('통합 — 모든 id 의 stack 이 CSS font-family 값으로 적합', () => {
  it('각 stack 이 비어있지 않고 폴백 generic family 로 끝남', () => {
    const genericEnd = /(sans-serif|serif|monospace)\s*$/;
    for (const id of listFonts()) {
      const stack = fontStackById(id);
      expect(stack.length).toBeGreaterThan(0);
      expect(stack).toMatch(genericEnd);
    }
  });
});
