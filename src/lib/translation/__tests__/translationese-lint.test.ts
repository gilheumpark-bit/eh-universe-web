// ============================================================
// translationese-lint — [Z1a-5] KO→EN 번역투 + AI티 결정론적 린트 검증.
// ============================================================

import { lintTranslationese } from '../translationese-lint';

describe('lintTranslationese — 입력 방어', () => {
  it('빈 문자열 → hits 0 · score 0', () => {
    const r = lintTranslationese('');
    expect(r.hits).toHaveLength(0);
    expect(r.score).toBe(0);
    expect(r.metrics.sentences).toBe(0);
  });

  it('공백만 → 빈 결과', () => {
    expect(lintTranslationese('   \n  ').hits).toHaveLength(0);
  });

  it('비문자열 (런타임 방어) → 빈 결과', () => {
    expect(lintTranslationese(null as unknown as string).hits).toHaveLength(0);
  });
});

describe('번역투 — name-repetition (이름 반복)', () => {
  it('이름이 거의 매 문장 반복 (6회+·밀도 0.4+) → warn', () => {
    const text = [
      'Cheolsu opened the door.',
      'Cheolsu looked around the room.',
      'Then Cheolsu sat down.',
      'Cheolsu picked up the cup.',
      'After a while Cheolsu sighed.',
      'Cheolsu closed his eyes.',
      'Outside, rain kept falling.',
    ].join(' ');
    const r = lintTranslationese(text);
    const hit = r.hits.find((h) => h.kind === 'name-repetition');
    expect(hit).toBeDefined();
    expect(hit!.pattern).toBe('Cheolsu');
    expect(hit!.severity).toBe('warn');
    expect(hit!.count).toBeGreaterThanOrEqual(6);
  });

  it('대명사를 적절히 쓰는 자연 영어 → 미검출', () => {
    const text = [
      'Cheolsu opened the door.',
      'He looked around the room.',
      'Then he sat down and picked up the cup.',
      'After a while he sighed.',
      'He closed his eyes.',
      'Outside, rain kept falling.',
    ].join(' ');
    expect(lintTranslationese(text).hits.find((h) => h.kind === 'name-repetition')).toBeUndefined();
  });

  it('문장 5개 미만 (표본 부족) → 미검출 (오탐 방지)', () => {
    const text = 'Cheolsu ran. Cheolsu fell. Cheolsu cried with Cheolsu and Cheolsu and Cheolsu.';
    expect(lintTranslationese(text).hits.find((h) => h.kind === 'name-repetition')).toBeUndefined();
  });
});

describe('번역투 — honorific-literal (존칭 로마자 직역)', () => {
  it('-nim / -ssi 잔존 → info', () => {
    const r = lintTranslationese('Welcome back, Kim-ssi. The chairman-nim is waiting.');
    const hit = r.hits.find((h) => h.kind === 'honorific-literal' && h.pattern.includes('-nim'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('info');
    expect(hit!.count).toBe(2);
  });

  it('로마자 친족 호칭 (oppa/hyung) → info', () => {
    const r = lintTranslationese('"Oppa, wait for me!" she called. Her hyung just laughed.');
    const hit = r.hits.find((h) => h.kind === 'honorific-literal' && h.pattern.includes('kinship'));
    expect(hit).toBeDefined();
    expect(hit!.count).toBe(2);
  });
});

describe('번역투 — said-bookism (과잉 대사 동사)', () => {
  it('bookism 3회+ 그리고 said/asked 초과 → warn', () => {
    const text =
      '"No," she exclaimed. "Why," he retorted. "Stop," she declared. "Fine," he interjected.';
    const hit = lintTranslationese(text).hits.find((h) => h.kind === 'said-bookism');
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('warn');
    expect(hit!.count).toBe(4);
  });

  it('said 가 우세하면 미검출 (정상 영어)', () => {
    const text =
      '"No," she said. "Why," he said. "Stop," she said. "Fine," he said. "Really," she exclaimed. "Wow," he declared. "Huh," she retorted.';
    expect(lintTranslationese(text).hits.find((h) => h.kind === 'said-bookism')).toBeUndefined();
  });

  it('bookism 2회 이하 → 미검출', () => {
    const text = '"No," she exclaimed. "Why," he retorted.';
    expect(lintTranslationese(text).hits.find((h) => h.kind === 'said-bookism')).toBeUndefined();
  });
});

describe('AI티 — em-dash-overuse', () => {
  it('em-dash 4회+ 그리고 문장당 0.25 초과 → warn', () => {
    const text =
      'He paused — briefly. She turned — slowly. They waited — silently. It ended — finally.';
    const hit = lintTranslationese(text).hits.find((h) => h.kind === 'em-dash-overuse');
    expect(hit).toBeDefined();
    expect(hit!.count).toBe(4);
  });

  it('em-dash 적정 사용 (긴 본문에 1~2개) → 미검출', () => {
    const text =
      'He paused. She turned slowly. They waited in the dark. It ended at dawn — finally. The morning came. Birds sang outside the window. Nothing else moved. The house was quiet.';
    expect(lintTranslationese(text).hits.find((h) => h.kind === 'em-dash-overuse')).toBeUndefined();
  });
});

describe('AI티 — smart-quotes', () => {
  it('곡선 따옴표 잔존 → info', () => {
    const hit = lintTranslationese('“Hello,” she said. ‘Hmm.’').hits.find((h) => h.kind === 'smart-quotes');
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('info');
    expect(hit!.count).toBe(4);
  });

  it('직선 따옴표만 → 미검출', () => {
    expect(lintTranslationese('"Hello," she said.').hits.find((h) => h.kind === 'smart-quotes')).toBeUndefined();
  });
});

describe('score — hit 단위 가중 (warn 20 / info 5 · 100 클램프)', () => {
  it('깨끗한 자연 영어 → score 0', () => {
    const text =
      'He opened the door and stepped inside. The room smelled of old paper. "Anyone home?" he asked. Nobody answered, so he waited by the window.';
    const r = lintTranslationese(text);
    expect(r.hits).toHaveLength(0);
    expect(r.score).toBe(0);
  });

  it('warn 2 + info 1 → score 45', () => {
    const text =
      '"No," she exclaimed — sharply. "Why," he retorted — coldly. "Stop," she declared — flatly. "Enough," he interjected — and “done.”';
    const r = lintTranslationese(text);
    // said-bookism(warn 20) + em-dash(warn 20) + smart-quotes(info 5) = 45
    expect(r.score).toBe(45);
  });
});
