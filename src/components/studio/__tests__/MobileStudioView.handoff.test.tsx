import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MobileStudioView from '../MobileStudioView';

jest.mock('@/hooks/useVirtualKeyboard', () => ({
  useVirtualKeyboard: () => ({ isOpen: false, height: 0, viewportHeight: 800, windowHeight: 800, supported: false }),
}));

describe('MobileStudioView handoff status', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('모바일 메모를 저장하면 PC 가공 대기 상태와 저장 이벤트를 보여준다', async () => {
    const sketchUpdated = jest.fn();
    window.addEventListener('noa:mobile-sketch-updated', sketchUpdated);

    render(<MobileStudioView language="KO" />);
    fireEvent.change(screen.getByPlaceholderText(/북방 대륙/), {
      target: { value: '북방 대륙은 긴 겨울을 겪는다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '메모 추가' }));

    expect(await screen.findByText(/PC 가공 대기 1건/)).toBeInTheDocument();
    expect(screen.getByText(/PC에서 열면 가져오기 배너가 뜹니다/)).toBeInTheDocument();
    await waitFor(() => expect(sketchUpdated).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ total: 1, worldCount: 1 }),
    })));

    const saved = JSON.parse(localStorage.getItem('noa_mobile_sketch') || '{}');
    expect(saved.worldMemos[0].text).toBe('북방 대륙은 긴 겨울을 겪는다.');

    window.removeEventListener('noa:mobile-sketch-updated', sketchUpdated);
  });
});
