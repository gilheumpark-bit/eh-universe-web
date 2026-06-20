import { auditMechanicalDefects } from '../mechanical-defect-audit';

describe('auditMechanicalDefects', () => {
  it('returns a passing empty audit for blank or non-string input', () => {
    expect(auditMechanicalDefects('').passed).toBe(true);
    expect(auditMechanicalDefects('   \n\t ').findings).toEqual([]);
    expect(auditMechanicalDefects(null).findings).toEqual([]);
  });

  it('detects markdown residue, emoji, and unresolved replacement markers', () => {
    const result = auditMechanicalDefects('# Chapter 1\n윤서는 {{이름}}을 보았다. 🔥');
    const types = result.findings.map((finding) => finding.type);

    expect(result.passed).toBe(false);
    expect(types).toEqual(expect.arrayContaining([
      'markdown-residue',
      'replacement-residue',
      'emoji',
    ]));
    expect(result.byType['replacement-residue']).toBe(1);
  });

  it('detects dialogue beats packed into one line without auto-fixing voice', () => {
    const result = auditMechanicalDefects('"가자." "싫어." "그래도 가야 해." 그가 문을 열었다.');
    const finding = result.findings.find((item) => item.type === 'dialogue-run-on');

    expect(finding).toBeDefined();
    expect(finding?.autoFixSafe).toBe(false);
  });

  it('detects spacing and boundary defects without treating ambiguous word spacing as safely patchable', () => {
    const result = auditMechanicalDefects('그 는 문 을 열 었 다.다음 문장이 붙었다.\n\n\n\n끝.');

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'broken-hangul-spacing', autoFixSafe: false }),
        expect.objectContaining({ type: 'glued-sentence-boundary', autoFixSafe: true }),
        expect.objectContaining({ type: 'excess-blank-lines', autoFixSafe: true }),
      ]),
    );
  });

  it('keeps line numbers and excerpts for approval-queue display', () => {
    const result = auditMechanicalDefects('첫 줄.\n\n제목: 내부 제목\n본문.');
    const titleFinding = result.findings.find((item) => item.type === 'title-body-boundary');

    expect(titleFinding?.line).toBe(3);
    expect(titleFinding?.excerpt).toContain('제목: 내부 제목');
  });
});
