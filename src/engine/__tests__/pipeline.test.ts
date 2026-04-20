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

  // M3 — 감사 구멍 #2 해결: 자동 이전 화 주입
  it('M3 — 자동 이전 화 요약 주입 (manuscripts 있을 때)', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      episode: 5,
      manuscripts: [{
        episode: 4,
        title: 'Ep 4',
        content: '4화 본문',
        charCount: 5,
        lastUpdate: 0,
        summary: '4화 요약: 주인공이 적과 마주침',
      }],
    };
    const result = buildUserPrompt(cfg, '5화 시작');
    expect(result).toContain('PREVIOUS EPISODE');
    expect(result).toContain('4화 요약');
  });

  it('M3 — disableAutoPreviousEpisode 옵션 존중', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      episode: 5,
      manuscripts: [{
        episode: 4,
        title: 'Ep 4',
        content: '4화 본문',
        charCount: 5,
        lastUpdate: 0,
        summary: '4화 요약',
      }],
    };
    const result = buildUserPrompt(cfg, '5화 시작', { disableAutoPreviousEpisode: true });
    expect(result).not.toContain('PREVIOUS EPISODE');
  });

  it('M3 — 사용자 previousContent 우선', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      episode: 5,
      manuscripts: [{
        episode: 4, title: 'E4', content: 'auto', charCount: 4, lastUpdate: 0, summary: 'auto-summary',
      }],
    };
    const result = buildUserPrompt(cfg, 'draft', { previousContent: 'manual override' });
    expect(result).toContain('RE-BRANCHING CONTEXT');
    expect(result).toContain('manual override');
    expect(result).not.toContain('auto-summary');
  });
});

// M3 — 감사 구멍 #1 해결: 활성 아이템 필터
describe('M3 — Active items/skills filter', () => {
  it('activeItems 미설정 → 기존 폴백 (전체 노출)', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      items: [
        { id: 'i1', name: 'Sword', category: 'weapon', rarity: 'common', description: '', effect: '', obtainedFrom: '' },
        { id: 'i2', name: 'Shield', category: 'armor', rarity: 'common', description: '', effect: '', obtainedFrom: '' },
      ],
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('Sword');
    expect(result).toContain('Shield');
  });

  it('activeItems 설정 → 선택된 아이템만 노출', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      items: [
        { id: 'i1', name: 'Sword', category: 'weapon', rarity: 'common', description: '', effect: '', obtainedFrom: '' },
        { id: 'i2', name: 'Shield', category: 'armor', rarity: 'common', description: '', effect: '', obtainedFrom: '' },
      ],
      sceneDirection: {
        ...mockConfig.sceneDirection,
        activeItems: ['i1'],
      },
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('Sword');
    expect(result).not.toContain('Shield');
    expect(result).toContain('활성 아이템');
  });

  it('activeSkills 설정 → 선택된 스킬만 노출', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      skills: [
        { id: 's1', name: 'Fireball', type: 'active', owner: '민아', description: '', cost: '', cooldown: '', rank: '' },
        { id: 's2', name: 'Heal', type: 'active', owner: '민아', description: '', cost: '', cooldown: '', rank: '' },
      ],
      sceneDirection: {
        ...mockConfig.sceneDirection,
        activeSkills: ['s2'],
      },
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('Heal');
    expect(result).not.toContain('Fireball');
    expect(result).toContain('활성 스킬');
  });
});

// ============================================================
// M4 — Origin tag injection tests
// ============================================================

describe('M4 origin tag injection', () => {
  it('tags V1 (raw) sceneDirection fields as [USER]', () => {
    const result = buildSystemInstruction(mockConfig, 'KO');
    // V1 데이터 → 모두 [USER]로 자동 태깅
    expect(result).toContain('[USER]');
    expect(result).toContain('출처 태그 해석 규칙');
  });

  it('renders [TEMPLATE] tag for wrapped fields', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      sceneDirection: {
        plotStructure: { value: 'three-act', meta: { origin: 'TEMPLATE', createdAt: 0, sourceReferenceId: 'preset-default' } },
      } as unknown as StoryConfig['sceneDirection'],
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('[TEMPLATE:preset-default]');
    expect(result).toContain('three-act');
  });

  it('renders [ENGINE_SUGGEST] tag', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      sceneDirection: {
        hooks: [{ value: { position: 'opening', hookType: 'shock', desc: 'wow' }, meta: { origin: 'ENGINE_SUGGEST', createdAt: 0 } }],
      } as unknown as StoryConfig['sceneDirection'],
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('[ENGINE_SUGGEST]');
    expect(result).toContain('wow');
  });

  it('renders [ENGINE_DRAFT] tag with do-not-follow guidance', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      sceneDirection: {
        cliffhanger: { value: { cliffType: 'shock', desc: '미확정' }, meta: { origin: 'ENGINE_DRAFT', createdAt: 0 } },
      } as unknown as StoryConfig['sceneDirection'],
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('[ENGINE_DRAFT]');
    expect(result).toContain('미확정');
    expect(result).toContain('그대로 따라 쓰지 말고');
  });

  it('produces 4-language origin guide (EN)', () => {
    const result = buildSystemInstruction(mockConfig, 'EN');
    expect(result).toContain('Origin Tag Interpretation Rules');
    expect(result).toContain('highest priority');
  });

  it('produces 4-language origin guide (JP)', () => {
    const result = buildSystemInstruction(mockConfig, 'JP');
    expect(result).toContain('出典タグの解釈ルール');
  });

  it('produces 4-language origin guide (CN)', () => {
    const result = buildSystemInstruction(mockConfig, 'CN');
    expect(result).toContain('来源标签解读规则');
  });

  it('skips guide when no scene direction content', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      sceneDirection: undefined,
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).not.toContain('출처 태그 해석 규칙');
  });

  it('mixes V1 (USER) + V2 (TEMPLATE) in same sceneDirection', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      sceneDirection: {
        // V1 raw — auto USER
        writerNotes: '작가 메모',
        // V2 wrapped — explicit TEMPLATE
        plotStructure: { value: 'kishōtenketsu', meta: { origin: 'TEMPLATE', createdAt: 0 } },
      } as unknown as StoryConfig['sceneDirection'],
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('[USER]');
    expect(result).toContain('[TEMPLATE]');
    expect(result).toContain('작가 메모');
    expect(result).toContain('kishōtenketsu');
  });

  it('preserves field values exactly under tag wrapping', () => {
    const cfg: StoryConfig = {
      ...mockConfig,
      sceneDirection: {
        foreshadows: [
          { value: { planted: '한서의 역명', payoff: '결말 회수', episode: 5, resolved: false }, meta: { origin: 'ENGINE_SUGGEST', createdAt: 0 } },
        ],
      } as unknown as StoryConfig['sceneDirection'],
    };
    const result = buildSystemInstruction(cfg, 'KO');
    expect(result).toContain('한서의 역명');
    expect(result).toContain('결말 회수');
    expect(result).toContain('[ENGINE_SUGGEST]');
  });
});
