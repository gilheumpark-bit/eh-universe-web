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
    // Legacy block mode: single skeleton-shimmer div at root
    const blocks = container.querySelectorAll('.skeleton-shimmer');
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders line skeletons when lines prop is set', () => {
    const { container } = render(<LoadingSkeleton lines={3} />);
    const lines = container.querySelectorAll('.skeleton-shimmer');
    expect(lines).toHaveLength(3);
  });

  it('respects custom height for block mode', () => {
    const { container } = render(<LoadingSkeleton height={200} />);
    const block = container.querySelector('.skeleton-shimmer') as HTMLElement;
    expect(block).not.toBeNull();
    expect(block.style.height).toBe('200px');
  });

  it('renders text variant with lines', () => {
    const { container } = render(<LoadingSkeleton variant="text" lines={2} />);
    const items = container.querySelectorAll('.skeleton-shimmer');
    expect(items).toHaveLength(2);
  });

  it('renders avatar variant', () => {
    const { container } = render(<LoadingSkeleton variant="avatar" />);
    const item = container.querySelector('.skeleton-shimmer') as HTMLElement;
    expect(item).not.toBeNull();
    expect(item.style.width).toBe('48px');
  });

  it('has role="status" for a11y', () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});
