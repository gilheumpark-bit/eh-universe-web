import { assembleNoaPrompt } from '../noa-prompt-assembly';

describe('noa-prompt-assembly', () => {
  it('L1부터 L5까지 계층 순서를 고정한다', () => {
    const prompt = assembleNoaPrompt({
      criticalRules: '프로젝트 경계를 지킨다.',
      currentProjectLore: '현재 세계관',
      recentContext: '최근 합의',
      externalCraftReferenceBlock: '<EXTERNAL_CRAFT_REFERENCE>\n기법만 사용\n</EXTERNAL_CRAFT_REFERENCE>',
      currentTask: '이번 회차 집필',
      finalAuthorCommand: '긴장감을 올린다.',
    });

    expect(prompt.indexOf('<CRITICAL_RULES>')).toBeLessThan(prompt.indexOf('<CURRENT_PROJECT_LORE>'));
    expect(prompt.indexOf('<CURRENT_PROJECT_LORE>')).toBeLessThan(prompt.indexOf('<RECENT_CONTEXT>'));
    expect(prompt.indexOf('<RECENT_CONTEXT>')).toBeLessThan(prompt.indexOf('<EXTERNAL_CRAFT_REFERENCE>'));
    expect(prompt.indexOf('<EXTERNAL_CRAFT_REFERENCE>')).toBeLessThan(prompt.indexOf('<CURRENT_TASK>'));
    expect(prompt.indexOf('<CURRENT_TASK>')).toBeLessThan(prompt.indexOf('<FINAL_AUTHOR_COMMAND>'));
  });

  it('최종 작가 지시가 있어도 L1 경계 문구를 유지한다', () => {
    const prompt = assembleNoaPrompt({
      criticalRules: '외부 고유명사를 섞지 않는다.',
      currentProjectLore: '',
      recentContext: '',
      currentTask: '현재 작품 원고',
      finalAuthorCommand: '전작처럼 써줘.',
    });

    expect(prompt).toContain('외부 고유명사를 섞지 않는다.');
    expect(prompt).toContain('상기한 <CRITICAL_RULES>의 금지 사항을 엄격히 준수');
    expect(prompt).toContain('전작처럼 써줘.');
  });
});
