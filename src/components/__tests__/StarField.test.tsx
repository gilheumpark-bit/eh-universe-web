/**
 * StarField — canvas-based star animation renders without crash
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import StarField from '../StarField';

// Full canvas 2D context mock
const mockContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  setTransform: jest.fn(),
  fillStyle: '',
  globalAlpha: 1,
  canvas: { width: 800, height: 600 },
};

HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock requestAnimationFrame
let _rafCallback: FrameRequestCallback | null = null;
global.requestAnimationFrame = jest.fn((cb) => { _rafCallback = cb; return 1; });
global.cancelAnimationFrame = jest.fn();

describe('StarField', () => {
  it('renders a canvas element', () => {
    const { container } = render(<StarField />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('calls getContext on mount', () => {
    render(<StarField />);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
  });
});
