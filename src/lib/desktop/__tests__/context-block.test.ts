import { buildContextBlock, buildRetryHint, buildAIWritePrompt, contextItemsToAgentContext, AI_WRITE_SYSTEM, type ContextItem } from '../context-block';

const item = (label: string, fact: string, details: string): ContextItem => ({ tab: label, label, fact, details });

describe('buildContextBlock', () => {
  it('빈 배열 → "(아직 없음)"', () => {
    expect(buildContextBlock([])).toBe('(아직 없음)');
  });
  it('단일 항목: fact + details 둘 다 포함', () => {
    const block = buildContextBlock([item('세계관', '마법은 마나 소비', '· 한계: 마나 고갈 시 시전자 사망\n· 본문: 시전자가 …')]);
    expect(block).toContain('### 세계관');
    expect(block).toContain('마법은 마나 소비');
    expect(block).toContain('마나 고갈 시 시전자 사망'); // details 보존
    expect(block).toContain('시전자가 …');               // bodyRaw 보존
  });
  it('details == fact 일 때 details 중복 출력 안 함', () => {
    const block = buildContextBlock([item('캐릭터', '강민우', '강민우')]);
    expect(block.match(/강민우/g)?.length).toBe(1);
  });
  it('같은 탭 다중 항목: 번호 매기기', () => {
    const block = buildContextBlock([
      item('캐릭터', '강민우 (주인공)', '· 이름: 강민우\n· desire: 복수'),
      item('캐릭터', '이서연 (조연)', '· 이름: 이서연\n· desire: 생존'),
    ]);
    expect(block).toContain('### 캐릭터 (2건)');
    expect(block).toMatch(/\[1\][^[]*강민우/);
    expect(block).toMatch(/\[2\][^[]*이서연/);
  });
  it('다른 탭은 별 섹션', () => {
    const block = buildContextBlock([item('세계관', 'A', 'a'), item('캐릭터', 'B', 'b')]);
    expect(block).toContain('### 세계관');
    expect(block).toContain('### 캐릭터');
  });
});

describe('buildRetryHint', () => {
  it('빈 본문 → 빈 문자열', () => {
    expect(buildRetryHint('')).toBe('');
    expect(buildRetryHint('   ')).toBe('');
  });
  it('깨끗한 본문 → 빈 힌트 (이슈 없음)', () => {
    const clean = '"준비됐어?" 그가 검을 휘둘렀다. 빛이 갈라졌다. 그녀가 답했다. "지금이야!" 바람이 멈췄다.';
    expect(buildRetryHint(clean)).toBe('');
  });
  it('tell 과다 → 힌트 포함', () => {
    const tellHeavy = '그는 슬펐다고 느꼈다. 무섭다고 생각했다. 좋은 듯했다. 기뻤다고 느꼈다.';
    const h = buildRetryHint(tellHeavy);
    expect(h).toContain('설명형');
    expect(h).toMatch(/show/);
  });
  it('마크다운 잔여 → 출고 부적합 힌트', () => {
    const h = buildRetryHint('**강조**\n## 헤딩\n본문 본문 본문');
    expect(h).toContain('출고 부적합');
  });
  it('QA 감사원 결함이 있으면 관점 라벨 포함 (긴 본문)', () => {
    // 따옴표 짝 안 맞춤 → consistency 결함, 다수 문장
    const flawed = '"미완 따옴표 그는 갔다. ' + '비슷한 단어가 계속 비슷한 단어로 비슷하게 비슷한 비슷한.'.repeat(15);
    const h = buildRetryHint(flawed);
    // QA 감사원 라벨 또는 문체/페르소나 힌트 중 하나는 발동해야 함 (모듈 통합 확인)
    expect(h.length).toBeGreaterThan(0);
    expect(h).toMatch(/QA|문체|독자 패널|이탈/);
  });
  it('짧은 본문(<200자)에선 QA 감사원/페르소나 hint 발동 안 함 (잡음 차단)', () => {
    const short = '그는 갔다.';
    const h = buildRetryHint(short);
    expect(h).not.toContain('QA 감사원');
    expect(h).not.toContain('독자 패널');
  });
});

describe('contextItemsToAgentContext', () => {
  it('탭별로 registry 슬롯에 매핑', () => {
    const items: ContextItem[] = [
      { tab: '세계관', label: '세계관', fact: 'W', details: 'W-detail' },
      { tab: '캐릭터', label: '캐릭터', fact: 'C', details: 'C-detail' },
      { tab: '씬시트', label: '씬시트', fact: 'S', details: 'S-detail' },
      { tab: '연출', label: '연출', fact: 'D', details: 'D-detail' },
      { tab: '구성', label: '구성', fact: 'St', details: 'St-detail' },
    ];
    const ctx = contextItemsToAgentContext(items);
    expect(ctx['world-book']).toContain('W');
    expect(ctx['world-book']).toContain('W-detail');
    expect(ctx['character-dna']).toContain('C-detail');
    expect(ctx['scene-sheet']).toContain('S-detail');
    expect(ctx['act-guide']).toContain('D-detail');
    expect(ctx['story-summary']).toContain('St-detail');
    expect(ctx.language).toBe('ko');
  });
  it('빈 입력 → 모든 슬롯 undefined', () => {
    const ctx = contextItemsToAgentContext([]);
    expect(ctx['world-book']).toBeUndefined();
    expect(ctx['character-dna']).toBeUndefined();
  });
  it('같은 탭 다중 항목 → \\n\\n으로 join', () => {
    const ctx = contextItemsToAgentContext([
      { tab: '캐릭터', label: '캐릭터', fact: 'A', details: 'A-d' },
      { tab: '캐릭터', label: '캐릭터', fact: 'B', details: 'B-d' },
    ]);
    expect(ctx['character-dna']).toContain('A');
    expect(ctx['character-dna']).toContain('B');
    expect(ctx['character-dna']).toMatch(/A[\s\S]*\n\n[\s\S]*B/);
  });
});

describe('buildAIWritePrompt', () => {
  it('가드(시스템 프롬프트) 항상 포함', () => {
    const p = buildAIWritePrompt({ contextItems: [], scene: '주인공 등장', manuscript: '' });
    expect(p).toContain('한국어 본문만');
    expect(p).toContain('영어');
    expect(p).toContain('확정된 설정');
    expect(p).toContain(AI_WRITE_SYSTEM);
  });
  it('컨텍스트 풀텍스트 주입 (details 포함)', () => {
    const p = buildAIWritePrompt({
      contextItems: [item('세계관', '마법은 마나', '한계: 마나 고갈 시 사망')],
      scene: 'X',
      manuscript: '',
    });
    expect(p).toContain('마나 고갈 시 사망'); // details = AI에게 도달
  });
  it('직전 본문 있으면 이어쓰기 블록 포함', () => {
    const prior = '그는 검을 들었다.'.repeat(50);
    const p = buildAIWritePrompt({ contextItems: [], scene: 'X', manuscript: prior });
    expect(p).toContain('직전 본문');
    expect(p).toContain('이어쓰기');
  });
  it('직전 본문 약점 있으면 개선 지시 포함', () => {
    const tellHeavy = '그는 슬펐다고 느꼈다. 무섭다고 생각했다. 좋은 듯했다. 기뻤다고 느꼈다.';
    const p = buildAIWritePrompt({ contextItems: [], scene: 'X', manuscript: tellHeavy });
    expect(p).toContain('개선 지시');
    expect(p).toContain('설명형');
  });
  it('장르 prefix 적용', () => {
    const p = buildAIWritePrompt({ contextItems: [], scene: 'X', manuscript: '', genrePrefix: '장르: 헌터물 (템포 fast).' });
    expect(p).toContain('헌터물');
  });
  it('useAgentRegistry: true — 시스템에 registry 프롬프트 주입, 별도 [컨텍스트] 섹션 생략', () => {
    const p = buildAIWritePrompt({
      contextItems: [item('세계관', 'F', 'D')],
      scene: 'X',
      manuscript: '',
      useAgentRegistry: true,
    });
    // registry 프롬프트는 "임무:" 라벨로 시작 부분 식별
    expect(p).toMatch(/임무:/);
    // 중복 [컨텍스트] 섹션 없음 (registry 가 이미 주입)
    expect(p).not.toContain('[컨텍스트]\nF\n');
    // 장면 지시는 여전히 포함
    expect(p).toContain('[장면 지시]');
  });
  it('순서: 시스템 → 컨텍스트 → 개선지시(있으면) → 직전본문(있으면) → 장면 지시', () => {
    const p = buildAIWritePrompt({
      contextItems: [item('세계관', 'F', 'D')],
      scene: 'SCENE',
      manuscript: '그는 슬펐다고 느꼈다. 무섭다고 생각했다. 좋은 듯했다. 기뻤다고 느꼈다.',
    });
    // 시스템 프롬프트 안에도 토큰이 들어가니 lastIndexOf 로 실제 섹션 헤더 위치를 잡음.
    expect(p.lastIndexOf('[컨텍스트]')).toBeLessThan(p.lastIndexOf('[개선 지시'));
    expect(p.lastIndexOf('[개선 지시')).toBeLessThan(p.lastIndexOf('[직전 본문 — 자연스럽게'));
    expect(p.lastIndexOf('[직전 본문 — 자연스럽게')).toBeLessThan(p.lastIndexOf('[장면 지시]'));
    expect(p.lastIndexOf('[장면 지시]')).toBeLessThan(p.indexOf('SCENE'));
  });
});
