/**
 * CodeStudioPanelManager — renders panel area (ActivityBar)
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/code-studio-types', () => ({
  detectLanguage: () => 'typescript',
}));

jest.mock('@/lib/code-studio-panel-registry', () => ({
  PANEL_REGISTRY: [
    { id: 'chat', label: 'Chat', labelKo: '채팅', icon: 'MessageSquare', group: 'ai', category: 'core', color: '#a855f7' },
  ],
  getPanelLabel: (id: string) => id,
  getGroupLabel: (group: string) => group,
  getVisiblePanels: () => [],
}));

jest.mock('@/lib/code-studio-bugfinder', () => ({}));
jest.mock('@/lib/code-studio-stress-test', () => ({}));
jest.mock('@/lib/code-studio-verification-loop', () => ({}));
jest.mock('@/lib/code-studio-composer-state', () => ({}));
jest.mock('@/lib/code-studio-ai-features', () => ({
  explainCode: jest.fn(),
  lintCode: jest.fn(),
  generateDocstring: jest.fn(),
}));
jest.mock('@/hooks/useCodeStudioPanels', () => ({}));
jest.mock('@/components/code-studio/PanelImports', () => ({}));

import { ActivityBar } from '../code-studio/CodeStudioPanelManager';

describe('ActivityBar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ActivityBar
        rightPanel={null}
        onSetRightPanel={jest.fn()}
        bugReports={[]}
        showAdvancedPanels={false}
        onToggleAdvancedPanels={jest.fn()}
        showSettings={false}
        onToggleSettings={jest.fn()}
        language="en"
        lang="en"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders activity bar buttons for core items', () => {
    const { container } = render(
      <ActivityBar
        rightPanel={null}
        onSetRightPanel={jest.fn()}
        bugReports={[]}
        showAdvancedPanels={false}
        onToggleAdvancedPanels={jest.fn()}
        showSettings={false}
        onToggleSettings={jest.fn()}
        language="en"
        lang="en"
      />,
    );
    const buttons = container.querySelectorAll('button');
    // Core items: files, chat, pipeline, search, git, review, composer, preview + toggle + settings
    expect(buttons.length).toBeGreaterThan(0);
  });
});
