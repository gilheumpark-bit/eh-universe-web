// ============================================================
// PART 1 — Setup
// ============================================================

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import MultiTabBanner from '../MultiTabBanner';

// ============================================================
// PART 2 — 상태별 렌더
// ============================================================

describe('MultiTabBanner — 상태별 렌더', () => {
  test('M1: Leader + followerCount=0 + conflict=0 → null (표시 없음)', () => {
    const { container } = render(
      <MultiTabBanner isLeader={true} followerCount={0} conflictCount={0} language="KO" />,
    );
    expect(container.firstChild).toBeNull();
  });

  test('M2: Leader + followerCount=2 → leader-with-followers variant', () => {
    render(
      <MultiTabBanner isLeader={true} followerCount={2} language="KO" />,
    );
    const banner = screen.getByTestId('multi-tab-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('data-variant', 'leader-with-followers');
    expect(banner.textContent).toMatch(/Follower 2/);
  });

  test('M3: Follower → follower variant + 승격 버튼', () => {
    render(
      <MultiTabBanner
        isLeader={false}
        followerCount={-1}
        leaderTabId="ABC-DEF-XYZ-12345"
        language="KO"
      />,
    );
    const banner = screen.getByTestId('multi-tab-banner');
    expect(banner).toHaveAttribute('data-variant', 'follower');
    expect(screen.getByTestId('multi-tab-promote-btn')).toBeInTheDocument();
    // 짧은 tabId 노출
    expect(banner.textContent).toContain('12345');
  });

  test('M4: Leader + conflict 감지 → conflict chip 표시', () => {
    render(
      <MultiTabBanner
        isLeader={true}
        followerCount={1}
        conflictCount={3}
        language="KO"
      />,
    );
    const chip = screen.getByTestId('multi-tab-conflict-chip');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('data-count', '3');
    expect(chip.textContent).toMatch(/3건/);
  });

  test('M5: Leader only (no follower) + conflict 감지 → conflict-only variant', () => {
    render(
      <MultiTabBanner
        isLeader={true}
        followerCount={0}
        conflictCount={2}
        language="KO"
      />,
    );
    const banner = screen.getByTestId('multi-tab-banner');
    expect(banner).toHaveAttribute('data-variant', 'conflict-only');
  });
});

// ============================================================
// PART 3 — 인터랙션
// ============================================================

describe('MultiTabBanner — 인터랙션', () => {
  test('M6: 승격 버튼 클릭 → onRequestPromotion 호출 + true 반환 시 failed 미표시', async () => {
    const onRequestPromotion = jest.fn().mockResolvedValue(true);
    render(
      <MultiTabBanner
        isLeader={false}
        followerCount={-1}
        language="KO"
        onRequestPromotion={onRequestPromotion}
      />,
    );
    fireEvent.click(screen.getByTestId('multi-tab-promote-btn'));
    await waitFor(() => expect(onRequestPromotion).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('multi-tab-promote-failed')).not.toBeInTheDocument();
  });

  test('M7: 승격 버튼 클릭 실패 → promote-failed 텍스트 노출', async () => {
    const onRequestPromotion = jest.fn().mockResolvedValue(false);
    render(
      <MultiTabBanner
        isLeader={false}
        followerCount={-1}
        language="KO"
        onRequestPromotion={onRequestPromotion}
      />,
    );
    fireEvent.click(screen.getByTestId('multi-tab-promote-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('multi-tab-promote-failed')).toBeInTheDocument();
    });
  });

  test('M8: conflict chip 내 자세히 버튼 → onViewConflicts 호출', () => {
    const onViewConflicts = jest.fn();
    render(
      <MultiTabBanner
        isLeader={true}
        followerCount={1}
        conflictCount={1}
        language="KO"
        onViewConflicts={onViewConflicts}
      />,
    );
    fireEvent.click(screen.getByTestId('multi-tab-view-conflicts-btn'));
    expect(onViewConflicts).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// PART 4 — 4언어
// ============================================================

describe('MultiTabBanner — 4언어', () => {
  test('M9: KO — "이 탭을 Leader로"', () => {
    render(<MultiTabBanner isLeader={false} followerCount={-1} language="KO" />);
    expect(screen.getByTestId('multi-tab-promote-btn').textContent).toMatch(/Leader로/);
  });

  test('M10: EN — "Make this tab Leader"', () => {
    render(<MultiTabBanner isLeader={false} followerCount={-1} language="EN" />);
    expect(screen.getByTestId('multi-tab-promote-btn').textContent).toMatch(/Make this tab Leader/);
  });

  test('M11: JP — "このタブをLeaderに"', () => {
    render(<MultiTabBanner isLeader={false} followerCount={-1} language="JP" />);
    expect(screen.getByTestId('multi-tab-promote-btn').textContent).toMatch(/Leader/);
    expect(screen.getByTestId('multi-tab-banner').textContent).toMatch(/閲覧のみ/);
  });

  test('M12: CN — "将此标签页设为 Leader"', () => {
    render(<MultiTabBanner isLeader={false} followerCount={-1} language="CN" />);
    expect(screen.getByTestId('multi-tab-promote-btn').textContent).toMatch(/Leader/);
    expect(screen.getByTestId('multi-tab-banner').textContent).toMatch(/仅供查看/);
  });
});

// ============================================================
// PART 5 — 접근성
// ============================================================

describe('MultiTabBanner — 접근성', () => {
  test('M13: role="status" + aria-live="polite"', () => {
    render(<MultiTabBanner isLeader={false} followerCount={-1} language="KO" />);
    const banner = screen.getByTestId('multi-tab-banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  test('M14: 승격 버튼 min-h-44px 터치 타겟', () => {
    render(<MultiTabBanner isLeader={false} followerCount={-1} language="KO" />);
    const btn = screen.getByTestId('multi-tab-promote-btn');
    expect(btn.className).toMatch(/min-h-\[44px\]/);
  });

  test('M15: 승격 버튼 aria-label + help 텍스트 포함 (색상만 의존 금지)', () => {
    render(<MultiTabBanner isLeader={false} followerCount={-1} language="KO" />);
    const btn = screen.getByTestId('multi-tab-promote-btn');
    const label = btn.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label).toMatch(/Leader/);
    expect(label!.length).toBeGreaterThan(20); // help 텍스트 포함
  });
});
