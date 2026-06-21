import {
  buildExternalCraftBridge,
  buildExternalCraftPromptBlock,
  scanExternalReferenceLeak,
} from '../cross-project-bridge';

describe('cross-project-bridge', () => {
  const sourceText = [
    '라하르는 「검은 성좌」의 문 앞에서 멈췄다.',
    '세린은 낮게 말했다. "문이 열리면 제국은 끝나."',
    '침묵 뒤에 딸깍, 작은 소리가 울렸다.',
    '그제야 라하르는 진실을 알게 되었다.',
  ].join('\n');

  it('외부 원문을 기법 참조로 바꾸고 고유명사를 금지어로 분리한다', () => {
    const result = buildExternalCraftBridge({
      currentProjectId: 'current-work',
      sourceProjectId: 'previous-work',
      sourceProjectTitle: '검은 성좌',
      objective: '1부 결말부처럼 긴장감을 올린다',
      sourceText,
    });

    expect(result.ok).toBe(true);
    expect(result.reference).toBeDefined();
    expect(result.reference!.sourceHash).toMatch(/^[0-9a-f]{8}$/);
    expect(result.reference!.patternSummary).not.toContain('라하르');
    expect(result.reference!.patternSummary).not.toContain('세린');
    expect(result.reference!.prohibitedTerms).toEqual(expect.arrayContaining(['라하르', '세린', '검은 성좌']));
  });

  it('프롬프트 블록에는 외부 원문과 금지어를 넣지 않는다', () => {
    const result = buildExternalCraftBridge({
      currentProjectId: 'current-work',
      sourceProjectId: 'previous-work',
      sourceProjectTitle: '검은 성좌',
      objective: '1부 결말부처럼 긴장감을 올린다',
      sourceText,
    });
    const block = buildExternalCraftPromptBlock(result.reference!);

    expect(block).toContain('<EXTERNAL_CRAFT_REFERENCE>');
    expect(block).toContain('외부 작품의');
    expect(block).not.toContain('라하르');
    expect(block).not.toContain('세린');
    expect(block).not.toContain('문 앞에서 멈췄다');
  });

  it('생성 결과에 외부 고유명사가 섞이면 누출로 잡는다', () => {
    const result = buildExternalCraftBridge({
      currentProjectId: 'current-work',
      sourceProjectId: 'previous-work',
      sourceProjectTitle: '검은 성좌',
      objective: '1부 결말부처럼 긴장감을 올린다',
      sourceText,
    });
    const leak = scanExternalReferenceLeak('라하르가 현재 작품의 문을 열었다.', result.reference!);

    expect(leak.leaked).toBe(true);
    expect(leak.hits).toContain('라하르');
  });
});
