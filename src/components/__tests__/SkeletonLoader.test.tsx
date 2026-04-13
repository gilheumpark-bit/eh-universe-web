/**
 * SkeletonLoader (code-studio) — render variants test
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkeletonLoader from '../code-studio/SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders a single skeleton bar by default', () => {
    const { container } = render(<SkeletonLoader />);
    const bars = container.querySelectorAll('.animate-pulse');
    expect(bars).toHaveLength(1);
  });

  it('renders multiple bars when count > 1', () => {
    const { container } = render(<SkeletonLoader count={4} />);
    const bars = container.querySelectorAll('.animate-pulse');
    expect(bars).toHaveLength(4);
  });

  it('applies custom width and height', () => {
    const { container } = render(<SkeletonLoader width={200} height={32} />);
    const bar = container.querySelector('.animate-pulse') as HTMLElement;
    expect(bar.style.width).toBe('200px');
    expect(bar.style.height).toBe('32px');
  });

  it('omits rounded class when rounded=false', () => {
    const { container } = render(<SkeletonLoader rounded={false} />);
    const bar = container.querySelector('.animate-pulse') as HTMLElement;
    expect(bar.className).not.toContain('rounded-md');
  });
});
