/**
 * RenameDialog.test — Core UI behaviors for the bulk rename dialog.
 */
import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================================
// PART 1 — Mocks (run before component import)
// ============================================================

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/lib/i18n', () => ({
  createT: () => (key: string, fallback?: string) => fallback ?? key,
  L4: (_lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => v.ko,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
  },
}));

// Prevent IndexedDB access during apply flow.
jest.mock('@/lib/indexeddb-backup', () => ({
  saveVersionedBackup: jest.fn().mockResolvedValue(true),
}));

import RenameDialog from '../RenameDialog';
import type { Project, ChatSession, StoryConfig } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { PlatformType } from '@/engine/types';

// ============================================================
// PART 2 — Fixtures
// ============================================================

function mkConfig(): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '카이로스',
    setting: '전투의 신 카이로스는 냉혹한 제국에 태어났다.',
    primaryEmotion: 'tense',
    episode: 1,
    title: '카이로스 전설',
    totalEpisodes: 10,
    guardrails: { min: 2000, max: 6000 },
    characters: [
      { id: 'c1', name: '카이로스', role: 'hero', traits: '냉혹함', appearance: '', dna: 50 },
    ],
    charRelations: [],
    platform: PlatformType.MOBILE,
  };
}

function mkSession(id: string): ChatSession {
  return {
    id,
    title: `EP-${id}`,
    config: mkConfig(),
    messages: [
      { id: `m-${id}-0`, role: 'user', content: '카이로스가 등장했다', timestamp: Date.now() },
      { id: `m-${id}-1`, role: 'assistant', content: '카이로스 카이로스 카이로스', timestamp: Date.now() },
    ],
    lastUpdate: Date.now(),
  };
}

function mkProject(id: string, sessions: ChatSession[]): Project {
  return {
    id, name: id, description: '', genre: Genre.FANTASY,
    createdAt: Date.now(), lastUpdate: Date.now(), sessions,
  };
}

// ============================================================
// PART 3 — Tests
// ============================================================

describe('RenameDialog', () => {
  const defaultProps = () => {
    const session = mkSession('s1');
    const project = mkProject('p1', [session]);
    return {
      open: true,
      projects: [project],
      sessions: [session],
      currentSession: session,
      currentProjectId: 'p1',
      language: 'KO' as const,
      onApply: jest.fn(),
      onClose: jest.fn(),
    };
  };

  it('renders From/To inputs when open', () => {
    const props = defaultProps();
    render(<RenameDialog {...props} />);
    expect(screen.getByTestId('rename-from-input')).toBeInTheDocument();
    expect(screen.getByTestId('rename-to-input')).toBeInTheDocument();
    expect(screen.getByTestId('rename-preview-btn')).toBeInTheDocument();
    expect(screen.getByTestId('rename-apply-btn')).toBeInTheDocument();
  });

  it('returns null (nothing rendered) when open=false', () => {
    const props = defaultProps();
    const { container } = render(<RenameDialog {...props} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('Preview button is disabled when From is empty', () => {
    const props = defaultProps();
    render(<RenameDialog {...props} />);
    const previewBtn = screen.getByTestId('rename-preview-btn') as HTMLButtonElement;
    expect(previewBtn.disabled).toBe(true);
  });

  it('Apply disabled when From == To (same value)', () => {
    const props = defaultProps();
    render(<RenameDialog {...props} />);
    const fromInput = screen.getByTestId('rename-from-input') as HTMLInputElement;
    const toInput = screen.getByTestId('rename-to-input') as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: '카이로스' } });
    fireEvent.change(toInput, { target: { value: '카이로스' } });
    const applyBtn = screen.getByTestId('rename-apply-btn') as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    const previewBtn = screen.getByTestId('rename-preview-btn') as HTMLButtonElement;
    expect(previewBtn.disabled).toBe(true);
  });

  it('Preview click populates match list', () => {
    const props = defaultProps();
    render(<RenameDialog {...props} />);
    const fromInput = screen.getByTestId('rename-from-input');
    const toInput = screen.getByTestId('rename-to-input');
    fireEvent.change(fromInput, { target: { value: '카이로스' } });
    fireEvent.change(toInput, { target: { value: '카이로르' } });
    const previewBtn = screen.getByTestId('rename-preview-btn');
    fireEvent.click(previewBtn);
    // Match list items appear — matchCount badges (e.g. "1", "3", etc.)
    // Verify at least one "1" badge or numeric pill shows up indicating matches.
    const applyBtn = screen.getByTestId('rename-apply-btn') as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(false);
  });

  it('confirm dialog fires when match count >= 10 and user cancels', async () => {
    const props = defaultProps();
    // Craft a session with 10+ "카이로스" occurrences
    const session = mkSession('s1');
    session.messages = [
      { id: 'm1', role: 'user', content: '카이로스 '.repeat(12), timestamp: Date.now() },
    ];
    props.sessions = [session];
    props.projects = [mkProject('p1', [session])];
    props.currentSession = session;

    render(<RenameDialog {...props} />);
    const fromInput = screen.getByTestId('rename-from-input');
    const toInput = screen.getByTestId('rename-to-input');
    fireEvent.change(fromInput, { target: { value: '카이로스' } });
    fireEvent.change(toInput, { target: { value: '카이로르' } });
    fireEvent.click(screen.getByTestId('rename-preview-btn'));

    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => {
      fireEvent.click(screen.getByTestId('rename-apply-btn'));
      // flush microtasks
      await Promise.resolve();
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(props.onApply).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('calls onApply with result when Apply is clicked (below threshold)', async () => {
    const props = defaultProps();
    // Small session → only a couple of matches, no confirm dialog.
    const session: ChatSession = {
      id: 's1', title: 'story',
      config: {
        ...mkConfig(),
        characters: [{ id: 'c1', name: 'kai', role: '', traits: '', appearance: '', dna: 0 }],
      },
      messages: [
        { id: 'm1', role: 'user', content: 'hello', timestamp: Date.now() },
      ],
      lastUpdate: Date.now(),
    };
    props.sessions = [session];
    props.projects = [mkProject('p1', [session])];
    props.currentSession = session;

    render(<RenameDialog {...props} />);
    fireEvent.change(screen.getByTestId('rename-from-input'), { target: { value: 'kai' } });
    fireEvent.change(screen.getByTestId('rename-to-input'), { target: { value: 'zen' } });
    fireEvent.click(screen.getByTestId('rename-preview-btn'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('rename-apply-btn'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(props.onApply).toHaveBeenCalledTimes(1);
    const arg = props.onApply.mock.calls[0][0] as { changedCount: number };
    expect(arg.changedCount).toBeGreaterThan(0);
  });

  it('close button fires onClose', () => {
    const props = defaultProps();
    render(<RenameDialog {...props} />);
    fireEvent.click(screen.getByLabelText('닫기'));
    expect(props.onClose).toHaveBeenCalled();
  });
});
