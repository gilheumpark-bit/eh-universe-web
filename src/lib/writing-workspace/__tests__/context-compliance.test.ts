import { Genre, type Character, type Item, type StoryConfig } from '@/lib/studio-types';
import { buildWritingContextComplianceReport } from '../context-compliance';

function baseConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.SYSTEM_HUNTER,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '테스트 작품',
    totalEpisodes: 10,
    guardrails: { min: 5500, max: 7000 },
    characters: [],
    platform: 'webnovel',
    ...overrides,
  } as StoryConfig;
}

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: '강민우',
    role: '주인공',
    traits: '냉정함',
    appearance: '검은 코트',
    dna: 80,
    speechStyle: '짧게 끊어 말함',
    ...overrides,
  };
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'black-blade',
    name: '흑검',
    category: 'weapon',
    rarity: 'rare',
    description: '균열을 자르는 검',
    effect: '방어막 절단',
    obtainedFrom: '첫 균열',
    owner: '강민우',
    ...overrides,
  };
}

describe('buildWritingContextComplianceReport', () => {
  it('빈 설정에서도 차단 없이 부족한 기준선을 작업 지표로 표시한다', () => {
    const report = buildWritingContextComplianceReport(baseConfig(), '');

    expect(report.checks).toHaveLength(11);
    expect(report.checks.find((check) => check.id === 'seven-axis')?.state).toBe('needs-context');
    expect(report.missingCount).toBeGreaterThan(0);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.limitation).toContain('작업 지표');
  });

  it('세계관~연출 기준선과 본문이 맞물리면 높은 준비 점수를 낸다', () => {
    const cfg = baseConfig({
      corePremise: '탑이 도시 한복판에 솟아오른 세계',
      powerStructure: '협회가 각성자를 관리한다',
      currentConflict: '주인공은 협회 기록 조작을 추적한다',
      synopsis: '강민우가 첫 균열의 진실을 파헤친다',
      characters: [character()],
      items: [item()],
      sceneDirection: {
        activeCharacters: ['강민우'],
        activeItems: ['black-blade'],
        hooks: [{ position: 'opening', hookType: 'mystery', desc: '기록 누락' }],
        emotionTargets: [{ emotion: '긴장', intensity: 70 }],
        writerNotes: '흑검의 소유권을 흔들지 않는다',
      },
      episodeSceneSheets: [
        {
          episode: 1,
          title: '누락된 기록',
          arc: '첫 균열 조사',
          scenes: [
            {
              sceneId: '1-1',
              sceneName: '보관실',
              characters: '강민우',
              tone: '긴장',
              summary: '강민우가 흑검으로 봉인을 연다',
              purpose: '첫 균열의 기록 누락을 발견한다',
              conflict: '협회 보관실의 봉인이 조사를 막는다',
              publicInfo: '협회가 균열 기록을 관리한다',
              hiddenInfo: '첫 균열 기록 일부가 사라졌다',
              emotionCurve: '의심에서 긴장으로 상승',
              rewardBeat: '흑검이 봉인을 자를 수 있음을 확인',
              hookPoint: '기록이 비어 있다는 사실',
              keyDialogue: '기록이 비어 있다.',
              emotionPoint: '의심',
              nextScene: '추적',
            },
          ],
          directionSnapshot: {
            productionDirection: {
              miseEnScene: '잠긴 보관실과 낮은 조도',
              camera: '흑검을 잡은 손에서 기록함으로 이동',
              lighting: '차갑고 낮은 청색광',
              sound: '봉인이 갈라지는 금속성 잔향',
              action: '강민우가 흑검으로 봉인을 가른다',
              proseRhythm: '짧은 문장으로 긴장을 올린다',
            },
          },
          lastUpdate: 1,
        },
      ],
    });
    const report = buildWritingContextComplianceReport(cfg, '강민우는 흑검을 뽑아 보관실 봉인을 갈랐다.');

    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.reviewCount).toBe(0);
    expect(report.missingCount).toBe(0);
    expect(report.checks.find((check) => check.id === 'seven-axis')?.state).toBe('ready');
  });

  it('반영한 외부 자료와 본문이 과하게 겹치면 7축 n-gram 검토 후보로 올린다', () => {
    const importedText = '강민우는 흑검을 뽑아 보관실 봉인을 갈랐다. 기록함 안쪽에는 첫 균열의 누락된 장부가 남아 있었고, 협회가 감춘 이름들이 차례로 드러났다. 그는 숨을 고른 뒤 장부를 접어 품에 넣었다. 바깥 복도에서는 경보음이 낮게 울렸고, 그는 발소리를 죽인 채 보관실 문틈으로 밀려오는 푸른빛을 바라보았다.';
    const cfg = baseConfig({
      corePremise: '탑이 도시 한복판에 솟아오른 세계',
      powerStructure: '협회가 각성자를 관리한다',
      currentConflict: '주인공은 협회 기록 조작을 추적한다',
      synopsis: '강민우가 첫 균열의 진실을 파헤친다',
      characters: [character()],
      acceptedImportCandidates: [
        {
          id: 'external-1',
          sourceFileName: '참고자료.txt',
          bucket: 'manuscript',
          targetType: 'manuscript',
          title: '외부 참고 문장',
          text: importedText,
          excerpt: importedText.slice(0, 80),
          confidence: 0.95,
          reason: '본문 후보로 분류됨',
          detectedFormat: 'txt',
          sectionIndex: 0,
          charCount: importedText.length,
          importedAt: '2026-06-21T00:00:00.000Z',
          acceptedAt: '2026-06-21T00:01:00.000Z',
        },
      ],
    });

    const report = buildWritingContextComplianceReport(cfg, importedText);

    const sevenAxis = report.checks.find((check) => check.id === 'seven-axis');
    expect(sevenAxis?.state).toBe('needs-review');
    expect(sevenAxis?.detail).toContain('7');
  });

  it('ARCS 충돌과 씬 8영역 미반영은 검토 후보로 올린다', () => {
    const cfg = baseConfig({
      corePremise: '탑 세계',
      powerStructure: '협회',
      currentConflict: '기록 조작',
      worldFieldEvidence: {
        corePremise: {
          fieldKey: 'corePremise',
          sourceLabel: '불러온 세계관',
          conflictCount: 1,
          arcsStatus: 'conflict',
          updatedAt: '2026-06-13T00:00:00.000Z',
        },
      },
      episodeSceneSheets: [
        {
          episode: 1,
          title: '누락된 기록',
          scenes: [
            {
              sceneId: '1-1',
              sceneName: '보관실',
              characters: '강민우',
              tone: '긴장',
              summary: '강민우가 봉인을 조사한다',
              purpose: '첫 균열 단서를 확보한다',
              conflict: '보관실 봉인이 길을 막는다',
              publicInfo: '협회 보관실은 폐쇄되어 있다',
              hiddenInfo: '안쪽 기록함이 비어 있다',
              emotionCurve: '의심에서 불안으로 이동',
              rewardBeat: '봉인 안쪽에 진입한다',
              hookPoint: '기록함이 비어 있다',
              keyDialogue: '여기 뭔가 빠졌어.',
              emotionPoint: '불안',
              nextScene: '협회 추적',
            },
          ],
          lastUpdate: 1,
        },
      ],
    });
    const report = buildWritingContextComplianceReport(cfg, '비가 내렸다. 낯선 골목의 간판이 흔들렸다.');

    expect(report.checks.find((check) => check.id === 'world')?.state).toBe('needs-review');
    expect(report.checks.find((check) => check.id === 'scene-design')?.state).toBe('needs-review');
  });

  it('활성 인물이 본문에 보이지 않으면 검토 필요로 표시한다', () => {
    const cfg = baseConfig({
      characters: [character()],
      sceneDirection: { activeCharacters: ['강민우'] },
    });
    const report = buildWritingContextComplianceReport(cfg, '협회 직원은 비어 있는 보관실을 바라보았다.');

    const characterCheck = report.checks.find((check) => check.id === 'character');
    expect(characterCheck?.state).toBe('needs-review');
    expect(characterCheck?.detail).toContain('강민우');
  });

  it('다음 화 표식과 작업 메타 노출은 본문 검토 대상으로 잡는다', () => {
    const cfg = baseConfig({
      corePremise: '균열 세계',
      powerStructure: '협회',
      currentConflict: '기록 조작',
    });
    const report = buildWritingContextComplianceReport(cfg, '[컨텍스트]\n다음 화에 밝혀질 비밀을 여기서 설명한다.');

    expect(report.checks.find((check) => check.id === 'next-episode')?.state).toBe('needs-review');
    expect(report.checks.find((check) => check.id === 'forbidden-disclosure')?.state).toBe('needs-review');
  });
});
