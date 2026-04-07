import { buildSystemInstruction, buildUserPrompt } from '../pipeline';
import { StoryConfig, Genre, PlatformType } from '../../lib/studio-types';

const mockConfig: StoryConfig = {
  genre: Genre.SF,
  povCharacter: 'K-042',
  setting: 'Sector 7',
  primaryEmotion: '공포와 호기심',
  episode: 5,
  title: '테스트 소설',
  totalEpisodes: 25,
  synopsis: 'AI가 지배하는 도시에서 로봇이 감정을 찾는 이야기.',
  guardrails: { min: 3000, max: 5000 },
  characters: [
    { id: 'c1', name: '민아', role: 'hero', traits: '용감함', appearance: '', dna: 80, personality: '냉소적이지만 따뜻함', speechStyle: '반말, 짧은 문장', speechExample: '"...그래서 뭐 어쩌라고."' },
    { id: 'c2', name: '다크', role: 'villain', traits: '교활함', appearance: '', dna: 60 },
  ],
  charRelations: [{ from: 'c1', to: 'c2', type: 'enemy', desc: '과거 동료였으나 배신' }],
  platform: PlatformType.MOBILE,
  sceneDirection: {
    hooks: [{ position: 'opening', hookType: 'shock', desc: '긴박한 진입' }],
    goguma: [{ type: 'goguma', intensity: 'medium', desc: '배신 암시' }],
    cliffhanger: { cliffType: 'info-before', desc: '"사실 너는—"' },
  },
  simulatorRef: {
    worldConsistency: true,
    genreLevel: true,
    ruleLevel: 3,
    civNames: ['테라 연방', '네오코프'],
  },
};

describe('buildSystemInstruction', () => {
  it('includes engine version', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('ANS 10.0');
  });

  it('includes genre and episode', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('Genre: SF');
    expect(result).toContain('Episode: 5 / 25');
  });

  it('includes character names and traits', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('민아');
    expect(result).toContain('다크');
  });

  it('includes personality and speech style', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('냉소적이지만 따뜻함');
    expect(result).toContain('반말, 짧은 문장');
    expect(result).toContain('"...그래서 뭐 어쩌라고."');
  });

  it('includes character relations', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('민아');
    expect(result).toContain('다크');
    expect(result).toContain('적');
  });

  it('includes primary emotion', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('공포와 호기심');
  });

  it('includes scene direction data', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('SCENE DIRECTION');
    expect(result).toContain('긴박한 진입');
    expect(result).toContain('배신 암시');
  });

  it('includes simulator reference', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('WORLD SIMULATOR');
    expect(result).toContain('테라 연방');
  });

  it('includes formatting rules in KO', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    expect(result).toContain('서식 규칙 7조');
  });

  it('includes formatting rules in EN', () => {
    const result = buildSystemInstruction(mockConfig, 'EN');
    expect(result).toContain('FORMATTING RULES');
  });

  it('includes EH rules when ruleLevel > 1', () => {
    const result = buildSystemInstruction(mockConfig, 'KO', PlatformType.MOBILE, 3);
    expect(result).toContain('EH ENGINE v1.4');
    expect(result).toContain('인과율 금지어');
  });
});

describe('buildUserPrompt', () => {
  it('includes episode and genre', () => {
    const result = buildUserPrompt(mockConfig, '첫 장면을 써줘');
    expect(result).toContain('Episode: 5');
    expect(result).toContain('Genre: SF');
  });

  it('includes synopsis', () => {
    const result = buildUserPrompt(mockConfig, '시작');
    expect(result).toContain('AI가 지배하는 도시');
  });

  it('includes draft text', () => {
    const result = buildUserPrompt(mockConfig, '폭발이 일어난다');
    expect(result).toContain('폭발이 일어난다');
  });
});
