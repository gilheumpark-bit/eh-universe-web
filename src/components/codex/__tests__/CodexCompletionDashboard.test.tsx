/**
 * CodexCompletionDashboard.test.tsx (rank 18, 2026-06-07)
 *
 * Codex 진척률 사이드바 — 빈 상태 / 객체 카운트 / 세계관 % / work-note 통합 검증.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CodexCompletionDashboard from '../CodexCompletionDashboard';

const PROJECTS_KEY = 'noa-studio-projects';

function seedProjects(json: unknown) {
  window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(json));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('CodexCompletionDashboard — empty state', () => {
  it('localStorage 비어있으면 "활성 프로젝트 없음" + 모든 카운트 0', () => {
    render(<CodexCompletionDashboard />);
    expect(screen.getByText(/활성 프로젝트 없음|No active project/i)).toBeInTheDocument();
    // characters / items / skills / magic / manuscripts 모두 0/target
    expect(screen.getByText('0/6')).toBeInTheDocument(); // characters default target
  });

  it('JSON 파싱 실패 안전 fallback', () => {
    window.localStorage.setItem(PROJECTS_KEY, '{not valid json');
    render(<CodexCompletionDashboard />);
    expect(screen.getByText(/활성 프로젝트 없음|No active project/i)).toBeInTheDocument();
  });

  it('배열 아닌 값 안전 fallback', () => {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify({ not: 'array' }));
    render(<CodexCompletionDashboard />);
    expect(screen.getByText(/활성 프로젝트 없음|No active project/i)).toBeInTheDocument();
  });

  it('작업노트 없음 → "작업노트 없음" 표시', () => {
    render(<CodexCompletionDashboard />);
    expect(screen.getByText(/작업노트 없음/)).toBeInTheDocument();
  });
});

describe('CodexCompletionDashboard — 활성 프로젝트 집계', () => {
  it('characters/items/skills 카운트 표시', () => {
    seedProjects([
      {
        id: 'p1',
        name: '테스트 작품',
        description: '',
        genre: 'fantasy',
        createdAt: 100,
        lastUpdate: 200,
        sessions: [
          {
            id: 's1',
            title: 'ep1',
            messages: [],
            lastUpdate: 200,
            config: {
              genre: 'fantasy',
              characters: [
                { id: 'c1', name: '주인공', role: '', traits: '', appearance: '', dna: 80 },
                { id: 'c2', name: '조연', role: '', traits: '', appearance: '', dna: 50 },
                { id: 'c3', name: '악역', role: '', traits: '', appearance: '', dna: 60 },
              ],
              items: [{ id: 'i1', name: 'item', category: 'weapon', rarity: 'common', description: '', effect: '', obtainedFrom: '' }],
              skills: [],
              magicSystems: [],
            },
          },
        ],
      },
    ]);
    render(<CodexCompletionDashboard />);
    // 캐릭터 3/6
    expect(screen.getByText('3/6')).toBeInTheDocument();
    // 아이템 1/5
    expect(screen.getByText('1/5')).toBeInTheDocument();
    // 프로젝트 이름 표시
    expect(screen.getByText('테스트 작품')).toBeInTheDocument();
  });

  it('세계관 필드 채움 % 계산 — 17필드 중 일부만 채움', () => {
    seedProjects([
      {
        id: 'p1',
        name: 'W',
        description: '',
        genre: 'fantasy',
        createdAt: 100,
        lastUpdate: 200,
        sessions: [
          {
            id: 's1',
            title: 'ep',
            messages: [],
            lastUpdate: 200,
            config: {
              genre: 'fantasy',
              characters: [],
              // 17개 worldfield 중 corePremise/powerStructure 2개만 채움 → 약 12%
              corePremise: '세계의 시작',
              powerStructure: '제국 vs 반란군',
            },
          },
        ],
      },
    ]);
    render(<CodexCompletionDashboard />);
    // "% defined" 패턴 검증 (정확한 % 는 분모 변동 가능 — substring 으로)
    expect(screen.getByText(/% defined/i)).toBeInTheDocument();
  });

  it('lastUpdate 가장 큰 프로젝트가 active 로 선택', () => {
    seedProjects([
      {
        id: 'old',
        name: '구프로젝트',
        description: '',
        genre: 'fantasy',
        createdAt: 100,
        lastUpdate: 100,
        sessions: [{ id: 's', title: '', messages: [], lastUpdate: 100, config: { genre: 'fantasy', characters: [] } }],
      },
      {
        id: 'new',
        name: '신프로젝트',
        description: '',
        genre: 'fantasy',
        createdAt: 200,
        lastUpdate: 500,
        sessions: [{ id: 's', title: '', messages: [], lastUpdate: 500, config: { genre: 'fantasy', characters: [] } }],
      },
    ]);
    render(<CodexCompletionDashboard />);
    expect(screen.getByText('신프로젝트')).toBeInTheDocument();
    expect(screen.queryByText('구프로젝트')).not.toBeInTheDocument();
  });
});

describe('CodexCompletionDashboard — work-note 통합', () => {
  it('noa-work-notes-{projectId} 가 있으면 단계별 집계 표시', () => {
    seedProjects([
      {
        id: 'p1',
        name: 'WN',
        description: '',
        genre: 'fantasy',
        createdAt: 100,
        lastUpdate: 200,
        sessions: [{ id: 's', title: '', messages: [], lastUpdate: 200, config: { genre: 'fantasy', characters: [] } }],
      },
    ]);
    window.localStorage.setItem(
      'noa-work-notes-p1',
      JSON.stringify([
        { id: 'n1', phase: 'plan', note: '구성', at: 100 },
        { id: 'n2', phase: 'plan', note: '시놉', at: 110 },
        { id: 'n3', phase: 'draft', note: '1화', at: 200 },
      ]),
    );
    render(<CodexCompletionDashboard />);
    // summarizeNotes: "기획 2건 · 초고 1건 · 퇴고 0건 · 발행 0건"
    expect(screen.getByText(/기획 2건 · 초고 1건/)).toBeInTheDocument();
    // lastPhase = draft (at=200 최대) → 라벨 '초고'. "최근 단계: 초고" 패턴.
    expect(screen.getByText(/최근 단계.*초고/)).toBeInTheDocument();
  });

  it('work-note JSON 파싱 실패 안전 fallback', () => {
    seedProjects([
      {
        id: 'p1',
        name: 'X',
        description: '',
        genre: 'fantasy',
        createdAt: 100,
        lastUpdate: 200,
        sessions: [{ id: 's', title: '', messages: [], lastUpdate: 200, config: { genre: 'fantasy', characters: [] } }],
      },
    ]);
    window.localStorage.setItem('noa-work-notes-p1', '{broken');
    render(<CodexCompletionDashboard />);
    expect(screen.getByText(/작업노트 없음/)).toBeInTheDocument();
  });
});

describe('CodexCompletionDashboard — a11y', () => {
  it('aria-label 사이드바 + progressbar 6개 (categories)', () => {
    render(<CodexCompletionDashboard />);
    expect(screen.getByLabelText(/Codex 진척률 대시보드|Codex Completion Dashboard/i)).toBeInTheDocument();
    const bars = screen.getAllByRole('progressbar');
    // 6 categories: characters / items / skills / magic / world / manuscripts
    expect(bars.length).toBe(6);
  });

  it('targets prop 으로 분모 커스터마이즈', () => {
    render(<CodexCompletionDashboard targets={{ characters: 99 }} />);
    // 빈 프로젝트 + characters target=99 → 0/99 (다른 카테고리와 충돌하지 않는 값)
    expect(screen.getByText('0/99')).toBeInTheDocument();
  });
});
