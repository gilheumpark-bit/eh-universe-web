import { analyzeRevision, revisionIssues } from '../revision-analysis';

describe('analyzeRevision', () => {
  it('빈 텍스트 안전', () => {
    const m = analyzeRevision('');
    expect(m.chars).toBe(0);
    expect(m.tellPct).toBe(0);
    expect(m.artifacts).toEqual([]);
  });
  it('tell 표현 감지', () => {
    const m = analyzeRevision('그는 슬펐다고 느꼈다. 무섭다고 생각했다. 좋은 것 같았다.');
    expect(m.tellPct).toBeGreaterThan(0);
  });
  it('마크다운/이모지 잔여 검출', () => {
    const m = analyzeRevision('**강조**\n## 헤딩\n그리고 😀 이모지');
    expect(m.artifacts).toEqual(expect.arrayContaining(['**볼드**', '## 헤딩', '이모지']));
  });
  it('정상 본문은 잔여 0', () => {
    expect(analyzeRevision('그는 검을 들었다. 바람이 불었다.').artifacts).toEqual([]);
  });
});

describe('revisionIssues', () => {
  it('tell 과다 → 경고', () => {
    const issues = revisionIssues({ chars: 100, tellPct: 40, repetitionPct: 0, dialoguePct: 0, sentenceVariety: 50, avgLen: 20, artifacts: [] });
    expect(issues.some((i) => i.kind === 'tell-heavy')).toBe(true);
  });
  it('마크다운 잔여 → 경고', () => {
    const issues = revisionIssues({ chars: 100, tellPct: 0, repetitionPct: 0, dialoguePct: 30, sentenceVariety: 50, avgLen: 20, artifacts: ['이모지'] });
    expect(issues.some((i) => i.kind === 'markdown-residue')).toBe(true);
  });
  it('깨끗한 지표 → 이슈 0', () => {
    expect(revisionIssues({ chars: 600, tellPct: 5, repetitionPct: 10, dialoguePct: 30, sentenceVariety: 50, avgLen: 20, artifacts: [] })).toEqual([]);
  });
});
