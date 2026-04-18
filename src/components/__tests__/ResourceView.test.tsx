/**
 * ResourceView — renders character resource panel (smoke test)
 * useStudioUI 훅 의존성 → StudioUIProvider로 래핑
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResourceView from '../studio/ResourceView';
import { StudioUIProvider } from '@/contexts/StudioContext';

// Stub UI context value (ResourceView only uses showConfirm/closeConfirm)
const mockUIValue = {
  activeTab: 'characters' as const,
  handleTabChange: jest.fn(),
  showConfirm: jest.fn(),
  closeConfirm: jest.fn(),
  setUxError: jest.fn(),
  triggerSave: jest.fn(),
  saveFlash: false,
};

function withProvider(children: React.ReactElement) {
  return <StudioUIProvider value={mockUIValue}>{children}</StudioUIProvider>;
}

jest.mock('@/lib/studio-translations', () => ({
  TRANSLATIONS: {
    KO: {
      resource: {
        title: '캐릭터',
        addCharacter: '캐릭터 추가',
        nameLabel: '이름',
        rolePlaceholder: '역할',
        addBtn: '추가',
        all: '전체',
        generate: '생성',
        generatingChars: '생성 중...',
        noCharacters: '캐릭터 없음',
        completionLabel: '완성도',
        editMode: '편집',
        deleteConfirm: '삭제?',
        relationsTitle: '관계',
        socialTitle: '소셜',
        warningDuplicate: '중복',
        warningMaxReached: '최대',
      },
      engine: {
        roles: { hero: '주인공', villain: '빌런', ally: '조력자', extra: '엑스트라' },
      },
    },
    EN: {
      resource: {
        title: 'Characters',
        addCharacter: 'Add Character',
        nameLabel: 'Name',
        rolePlaceholder: 'Role',
        addBtn: 'Add',
        all: 'All',
        generate: 'Generate',
        generatingChars: 'Generating...',
        noCharacters: 'No characters',
        completionLabel: 'Completion',
        editMode: 'Edit',
        deleteConfirm: 'Delete?',
        relationsTitle: 'Relations',
        socialTitle: 'Social',
        warningDuplicate: 'Duplicate',
        warningMaxReached: 'Max reached',
      },
      engine: {
        roles: { hero: 'Hero', villain: 'Villain', ally: 'Ally', extra: 'Extra' },
      },
    },
  },
}));

jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, t: { ko: string }) => t.ko,
}));

jest.mock('@/services/geminiService', () => ({
  generateCharacters: jest.fn(),
}));

jest.mock('@/lib/ai-providers', () => ({
  activeSupportsStructured: () => false,
}));

jest.mock('@/engine/social-register', () => ({
  RELATION_LABELS: {},
  AGE_LABELS: {},
  EXPLICIT_LABELS: {},
  PROFANITY_LABELS: {},
}));

jest.mock('../studio/CharRelationGraph', () => ({
  __esModule: true,
  default: () => <div>Graph</div>,
}));

jest.mock('../studio/TierValidator', () => ({
  validateCharacter: () => [],
  calcCompletionScore: () => 100,
  WarningBadge: () => null,
  CompletionBar: () => null,
}));

describe('ResourceView', () => {
  const minConfig = {
    genre: 'SF',
    characters: [],
    worldSetting: '',
    plotOutline: '',
  };

  it('renders without crashing', () => {
    const { container } = render(
      withProvider(<ResourceView language="KO" config={minConfig as never} setConfig={jest.fn()} />),
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows the add character section', () => {
    const { container } = render(
      withProvider(<ResourceView language="KO" config={minConfig as never} setConfig={jest.fn()} />),
    );
    // The component should render at least one interactive element
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
