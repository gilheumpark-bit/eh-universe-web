/**
 * WriterProfileCard — Writer profile summary rendering
 * 4개 언어 × 에피소드 상태별 렌더링 검증
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import WriterProfileCard from '../studio/WriterProfileCard';
import { createEmptyProfile, saveProfile } from '@/engine/writer-profile';

describe('WriterProfileCard', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('프로필 없음 상태 — 생성 안내 메시지 (KO)', () => {
    const { container } = render(<WriterProfileCard language="KO" />);
    expect(container.textContent).toContain('에피소드');
  });

  it('프로필 없음 상태 — EN 안내', () => {
    const { container } = render(<WriterProfileCard language="EN" />);
    expect(container.textContent).toMatch(/episode/i);
  });

  it('프로필 없음 상태 — JP 안내', () => {
    const { container } = render(<WriterProfileCard language="JP" />);
    expect(container.textContent).toContain('エピソード');
  });

  it('프로필 없음 상태 — CN 안내', () => {
    const { container } = render(<WriterProfileCard language="CN" />);
    expect(container.textContent).toContain('章节');
  });

  it('프로필 존재 시 레벨 뱃지 노출 (beginner)', () => {
    const profile = createEmptyProfile('default');
    profile.episodeCount = 3;
    profile.skillLevel = 'beginner';
    saveProfile(profile);
    const { container } = render(<WriterProfileCard language="KO" />);
    // 입문 뱃지 확인
    expect(container.textContent).toContain('입문');
  });

  it('프로필 존재 시 레벨 뱃지 노출 (advanced, EN)', () => {
    const profile = createEmptyProfile('default');
    profile.episodeCount = 50;
    profile.skillLevel = 'advanced';
    saveProfile(profile);
    const { container } = render(<WriterProfileCard language="EN" />);
    expect(container.textContent).toMatch(/Advanced/);
  });
});
