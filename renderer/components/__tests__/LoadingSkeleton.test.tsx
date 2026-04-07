/**
 * LoadingSkeleton (studio) — render block and line variants
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSkeleton from '../studio/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders a single block skeleton by default', () => {
    const { container } = render(<LoadingSkeleton />);
    const blocks = container.querySelectorAll('.animate-pulse');
    expect(blocks).toHaveLength(1);
  });

  it('renders line skeletons when lines prop is set', () => {
    const { container } = render(<LoadingSkeleton lines={3} />);
    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines).toHaveLength(3);
  });

  it('respects custom height for block mode', () => {
    const { container } = render(<LoadingSkeleton height={200} />);
    const block = container.querySelector('.animate-pulse') as HTMLElement;
    expect(block.style.height).toBe('200px');
  });
});
