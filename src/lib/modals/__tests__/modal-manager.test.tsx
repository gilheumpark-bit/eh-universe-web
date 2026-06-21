/** @jest-environment jsdom */
import React from 'react';
import { render, act } from '@testing-library/react';
import {
  ModalProvider,
  useModal,
  useModalOpen,
  useModalPayload,
} from '../modal-manager';
import { _resetKeyboardRegistry, registerKeyBinding } from '@/lib/keyboard/keyboard-manager';

beforeEach(() => { _resetKeyboardRegistry(); });

function TestConsumer({ onCtx }: { onCtx: (m: ReturnType<typeof useModal>) => void }) {
  const m = useModal();
  React.useEffect(() => { onCtx(m); }, [m, onCtx]);
  return <div data-testid="open-id">{m.state.id || ''}</div>;
}

describe('ModalProvider 기본', () => {
  it('초기 state.id === null', () => {
    const fn = jest.fn();
    render(<ModalProvider><TestConsumer onCtx={fn} /></ModalProvider>);
    expect(fn).toHaveBeenCalled();
    const m = fn.mock.calls[fn.mock.calls.length - 1][0];
    expect(m.state.id).toBeNull();
  });

  it('openModal 호출 → state.id 설정', () => {
    const fn = jest.fn();
    const { getByTestId } = render(<ModalProvider><TestConsumer onCtx={fn} /></ModalProvider>);
    const ctx = fn.mock.calls[0][0];
    act(() => { ctx.openModal('studio:settings'); });
    expect(getByTestId('open-id').textContent).toBe('studio:settings');
  });

  it('closeModal 호출 → null', () => {
    const fn = jest.fn();
    const { getByTestId } = render(<ModalProvider><TestConsumer onCtx={fn} /></ModalProvider>);
    const ctx = fn.mock.calls[0][0];
    act(() => { ctx.openModal('studio:settings'); });
    expect(getByTestId('open-id').textContent).toBe('studio:settings');
    act(() => { ctx.closeModal(); });
    expect(getByTestId('open-id').textContent).toBe('');
  });

  it('이미 다른 modal 열림 시 openModal 무시 + warn', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = jest.fn();
    const { getByTestId } = render(<ModalProvider><TestConsumer onCtx={fn} /></ModalProvider>);
    const ctx = fn.mock.calls[0][0];
    act(() => { ctx.openModal('studio:settings'); });
    act(() => { ctx.openModal('studio:command-palette'); });
    expect(getByTestId('open-id').textContent).toBe('studio:settings');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('replaceModal 은 덮어쓰기 강제', () => {
    const fn = jest.fn();
    const { getByTestId } = render(<ModalProvider><TestConsumer onCtx={fn} /></ModalProvider>);
    const ctx = fn.mock.calls[0][0];
    act(() => { ctx.openModal('studio:settings'); });
    act(() => { ctx.replaceModal('studio:command-palette'); });
    expect(getByTestId('open-id').textContent).toBe('studio:command-palette');
  });
});

describe('Provider 밖 호출 에러', () => {
  it('useModal Provider 밖에서 throw', () => {
    function Bare() { useModal(); return null; }
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/must be used within/);
    spy.mockRestore();
  });
});

describe('keyboard-manager 연동', () => {
  it('modal 열리면 키 바인딩 자동 suppress', () => {
    window.history.pushState({}, '', '/studio');
    const handler = jest.fn();
    registerKeyBinding({ keys: 'ctrl+p', area: 'studio', handler });

    const fn = jest.fn();
    render(<ModalProvider><TestConsumer onCtx={fn} /></ModalProvider>);
    const ctx = fn.mock.calls[0][0];

    // modal 닫힘 상태 — 핸들러 작동
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, cancelable: true, bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    // modal 열기 → 단축키 비활성
    act(() => { ctx.openModal('studio:settings'); });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, cancelable: true, bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1); // 추가 호출 없음

    // 닫으면 다시 작동
    act(() => { ctx.closeModal(); });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, cancelable: true, bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('useModalOpen · useModalPayload', () => {
  function ProbeOpen({ id, onChange }: { id: 'studio:settings'; onChange: (v: boolean) => void }) {
    const open = useModalOpen(id);
    React.useEffect(() => { onChange(open); }, [open, onChange]);
    return null;
  }
  function ProbePayload({ onLoad }: { onLoad: (p: unknown) => void }) {
    const p = useModalPayload('studio:confirm');
    React.useEffect(() => { onLoad(p); }, [p, onLoad]);
    return null;
  }
  it('useModalOpen 해당 id 매칭', () => {
    const probe = jest.fn();
    const fn = jest.fn();
    render(
      <ModalProvider>
        <TestConsumer onCtx={fn} />
        <ProbeOpen id="studio:settings" onChange={probe} />
      </ModalProvider>
    );
    const ctx = fn.mock.calls[0][0];
    act(() => { ctx.openModal('studio:settings'); });
    expect(probe.mock.calls.some((c) => c[0] === true)).toBe(true);
  });
  it('useModalPayload 타입 추출', () => {
    const probe = jest.fn();
    const fn = jest.fn();
    render(
      <ModalProvider>
        <TestConsumer onCtx={fn} />
        <ProbePayload onLoad={probe} />
      </ModalProvider>
    );
    const ctx = fn.mock.calls[0][0];
    act(() => { ctx.openModal('studio:confirm', { title: 'T', message: 'M', onConfirm: () => {} }); });
    const found = probe.mock.calls.find((c) => c[0] && (c[0] as { title: string }).title === 'T');
    expect(found).toBeTruthy();
  });
});
