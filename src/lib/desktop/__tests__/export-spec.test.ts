import { countChars, checkPlatformFit, stripForExport, getPlatformSpec, PLATFORM_SPECS } from '../export-spec';

describe('countChars', () => {
  it('공백 포함/제외', () => {
    expect(countChars('가 나 다', true)).toBe(5);
    expect(countChars('가 나 다', false)).toBe(3);
  });
});

describe('getPlatformSpec', () => {
  it('알 수 없는 id → free 폴백', () => {
    expect(getPlatformSpec('zzz').id).toBe('free');
  });
  it('문피아 스펙', () => {
    expect(getPlatformSpec('munpia').minChars).toBe(4500);
  });
});

describe('checkPlatformFit', () => {
  it('범위 내 = 적합', () => {
    const r = checkPlatformFit('가'.repeat(5500), 'munpia');
    expect(r.withinRange).toBe(true);
    expect(r.delta).toBe(0);
  });
  it('부족 = 음수 delta', () => {
    const r = checkPlatformFit('가'.repeat(1000), 'munpia');
    expect(r.withinRange).toBe(false);
    expect(r.delta).toBe(1000 - 4500);
    expect(r.note).toContain('부족');
  });
  it('초과 = 양수 delta', () => {
    const r = checkPlatformFit('가'.repeat(7000), 'munpia');
    expect(r.delta).toBe(7000 - 6500);
    expect(r.note).toContain('초과');
  });
  it('free = 항상 적합', () => {
    expect(checkPlatformFit('가', 'free').withinRange).toBe(true);
  });
});

describe('stripForExport', () => {
  it('마크다운/이모지 제거, 내용 보존', () => {
    const out = stripForExport('**강조**된 [링크](http://x) 그리고 😀 끝');
    expect(out).toContain('강조');
    expect(out).toContain('링크');
    expect(out).not.toContain('**');
    expect(out).not.toContain('](');
    expect(out).not.toMatch(/😀/u);
  });
  it('헤딩 마커 제거', () => {
    expect(stripForExport('## 제목\n본문')).not.toContain('## ');
  });
});

describe('PLATFORM_SPECS', () => {
  it('5 플랫폼 + free', () => {
    expect(PLATFORM_SPECS.length).toBe(6);
    expect(PLATFORM_SPECS.map((p) => p.id)).toContain('free');
  });
});
