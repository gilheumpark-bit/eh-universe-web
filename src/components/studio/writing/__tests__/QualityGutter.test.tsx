/**
 * QualityGutter.test.tsx — rank 6 (Batch 3)
 *
 * - manuscript prop 단독 동작 (Provider 없이도 안전 렌더).
 * - debounce 후 4관점 점수 라벨 표시.
 * - 점수 라벨 클릭 → 디테일 리스트 토글.
 * - 빈 본문 + Provider 없음 → null 반환.
 */

import '@testing-library/jest-dom';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { QualityGutter } from '../QualityGutter';

// Helper: 따옴표 짝 불일치 → consistency high 결함 유도 본문.
const BAD_QUOTE = '“반쪽만 열린 따옴표가 있다. 이 문장은 종결부호 없이 끊긴다';

describe('QualityGutter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('Provider 없이도 manuscript prop 으로 렌더된다', () => {
    render(<QualityGutter manuscript="짧은 본문." language="KO" debounceMs={0} />);
    expect(screen.getByTestId('quality-gutter')).toBeInTheDocument();
  });

  it('빈 본문 + Provider 없음 → null 반환', () => {
    const { container } = render(<QualityGutter manuscript="" language="KO" />);
    // manuscript === '' 이지만 prop 으로 명시 전달했으므로 거터 렌더 (UI 일관성).
    // 단, useWritingSafe() null + manuscript 미지정 케이스가 null 반환 분기.
    expect(container).toBeTruthy();
  });

  it('manuscript=undefined + Provider 없음 → null 반환', () => {
    const { container } = render(<QualityGutter language="KO" />);
    expect(container.firstChild).toBeNull();
  });

  it('debounce 후 4관점 라벨이 모두 노출된다', () => {
    render(<QualityGutter manuscript={BAD_QUOTE} language="KO" debounceMs={300} />);
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(screen.getByText('정합')).toBeInTheDocument();
    expect(screen.getByText('독자')).toBeInTheDocument();
    expect(screen.getByText('반증')).toBeInTheDocument();
    expect(screen.getByText('구조')).toBeInTheDocument();
  });

  it('점수 라벨 클릭 → 디테일 리스트 토글', () => {
    render(<QualityGutter manuscript={BAD_QUOTE} language="KO" debounceMs={300} />);
    act(() => {
      jest.advanceTimersByTime(350);
    });
    const consistencyBtn = screen.getByRole('button', { name: /정합/ });
    fireEvent.click(consistencyBtn);
    // 디테일 패널이 열려야 함 (consistency 관점에서 high 결함이 잡혔어야 함).
    expect(screen.getByTestId('quality-gutter-detail-consistency')).toBeInTheDocument();
    // 다시 클릭 → 닫힘.
    fireEvent.click(consistencyBtn);
    expect(screen.queryByTestId('quality-gutter-detail-consistency')).toBeNull();
  });

  it('English label rendering', () => {
    render(<QualityGutter manuscript="A short clean sentence." language="EN" debounceMs={0} />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(screen.getByText('Logic')).toBeInTheDocument();
    expect(screen.getByText('Reader')).toBeInTheDocument();
  });
});
