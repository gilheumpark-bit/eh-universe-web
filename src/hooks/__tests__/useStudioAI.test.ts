 
/**
 * Unit tests for useStudioAI hook
 */
describe('useStudioAI', () => {
  it('module loads without error', () => { expect(() => require('../useStudioAI')).not.toThrow(); });
  it('exports hook', () => { expect(typeof require('../useStudioAI')).toBe('object'); });

  it('노아 기록 경계는 localStorage 미러가 아니라 현재 프로젝트 ID를 따른다', () => {
    window.localStorage.setItem('noa_studio_currentProjectId', 'project-polluted');
    const { resolveNoaProjectScopeId } = require('../useStudioAI');

    expect(resolveNoaProjectScopeId(' project-current ')).toBe('project-current');
    expect(resolveNoaProjectScopeId('')).toBeNull();
    expect(resolveNoaProjectScopeId(undefined)).toBeNull();
    expect(resolveNoaProjectScopeId(null)).toBeNull();
    expect(window.localStorage.getItem('noa_studio_currentProjectId')).toBe('project-polluted');
  });

  // [2026-06-26 버그수정] 인터뷰 디렉티브 라우팅 — world/project 소설-오출력 차단.
  describe('detectConsultDirective — 인터뷰 디렉티브 감지', () => {
    const { detectConsultDirective } = require('../useStudioAI');

    it("'[세계관 설계]' prefix → world consult 경로", () => {
      expect(detectConsultDirective('[세계관 설계] 기억이 지워지는 도시의 규칙 제안해줘')).toBe('world');
    });

    it("'[작품 기준선 만들기]' prefix(개행 포함) → world consult 경로", () => {
      expect(detectConsultDirective('[작품 기준선 만들기]\n작품명: 미정\n아래 5문항으로…')).toBe('world');
    });

    it('선두 공백이 있어도 trimStart 후 prefix 매칭', () => {
      expect(detectConsultDirective('  \n[세계관 설계] 규칙')).toBe('world');
    });

    it('집필 의도(태그 없는 일반 텍스트) → null (집필 파이프라인 회귀 방지)', () => {
      expect(detectConsultDirective('다음 장면을 1000자로 이어서 써줘')).toBeNull();
      expect(detectConsultDirective('[NOA WRITE] 본문 생성')).toBeNull();
    });

    it('태그가 본문 중간에 있으면 오분기 금지 (적대 케이스)', () => {
      expect(detectConsultDirective('주인공이 칠판에 "[세계관 설계]"라고 적었다')).toBeNull();
    });

    it('빈/공백 입력 → null', () => {
      expect(detectConsultDirective('')).toBeNull();
      expect(detectConsultDirective('   ')).toBeNull();
    });
  });
});
