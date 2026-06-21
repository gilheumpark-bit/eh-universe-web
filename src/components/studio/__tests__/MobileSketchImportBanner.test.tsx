import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MobileSketchImportBanner from '../MobileSketchImportBanner';

jest.mock('@/lib/LangContext', () => ({
  useLang: () => ({ lang: 'ko', toggleLang: jest.fn(), setLangDirect: jest.fn() }),
}));

jest.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

const sketchStore = {
  worldMemos: [{ id: 'w1', text: '북방 대륙은 긴 겨울을 겪는다.', updatedAt: 10 }],
  characters: [{ id: 'c1', name: '카이엔', role: '주인공', traits: '고독한 검객', updatedAt: 20 }],
  plots: [{ id: 'p1', title: '기억 상실', body: '주인공이 왕국의 비밀을 잊은 채 깨어난다.', updatedAt: 30 }],
};

describe('MobileSketchImportBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('모바일 스케치 대기 상태를 데스크톱 가공 후보로 보여준다', async () => {
    localStorage.setItem('noa_mobile_sketch', JSON.stringify(sketchStore));

    render(<MobileSketchImportBanner />);

    expect(await screen.findByText(/PC 가공 대기 중인 모바일 스케치 3건/)).toBeInTheDocument();
    expect(screen.getByText(/세계관 1 · 캐릭터 1 · 플롯 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /새 프로젝트로 가져오기/ })).toBeInTheDocument();
  });

  it('가져오면 한국어 프로젝트와 모바일 원천 메모로 승격한다', async () => {
    localStorage.setItem('noa_mobile_sketch', JSON.stringify(sketchStore));
    const projectUpdated = jest.fn();
    window.addEventListener('noa:projects-updated', projectUpdated);

    render(<MobileSketchImportBanner />);
    fireEvent.click(await screen.findByRole('button', { name: /새 프로젝트로 가져오기/ }));

    await waitFor(() => expect(localStorage.getItem('noa_mobile_sketch')).toBeNull());
    const projects = JSON.parse(localStorage.getItem('noa_projects') || '[]');
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toMatch(/^모바일 스케치 \(1\/1\/1\)$/);
    expect(projects[0].sessions[0].config.reference).toContain('모바일 세계관 메모');
    expect(projects[0].sessions[0].config.reference).toContain('모바일 캐릭터 스케치');
    expect(projects[0].sessions[0].config.reference).toContain('모바일 플롯 씨앗');
    expect(projects[0].sessions[0].config.reference).not.toContain('World Memos');
    expect(projectUpdated).toHaveBeenCalledTimes(1);

    window.removeEventListener('noa:projects-updated', projectUpdated);
  });
});
