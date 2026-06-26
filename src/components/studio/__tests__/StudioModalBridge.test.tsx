/**
 * StudioModalBridge.test.tsx (2026-06-08 / 풀점검 priority 5)
 *
 * 부모 boolean state ↔ ModalProvider 양방향 sync 검증.
 * rank 19 — 'studio:api-keys' / 'studio:save-slot' 두 modal.
 */

import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import StudioModalBridge from '../StudioModalBridge';
import { ModalProvider, useModal } from '@/lib/modals/modal-manager';
import type { ChatSession } from '@/lib/studio-types';

// [로그인 게이팅 2026-06-26] Bridge 가 useAuth 로 비로그인 시 키 모달을 차단한다.
//   기존 테스트는 '로그인 사용자' 시나리오 → 기본 user 주입. 게이팅은 별도 테스트로 검증.
const mockAuth: { user: unknown; signInWithGoogle: jest.Mock } = {
  user: { uid: 'test-user' },
  signInWithGoogle: jest.fn(),
};
jest.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// Heavy modal 컴포넌트 stub — Bridge 의 sync 로직만 검증.
jest.mock('@/components/home/APIKeySlotManager', () => ({
  APIKeySlotManager: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="api-key-modal">
      <button data-testid="api-key-close" onClick={onClose}>close-api-key</button>
    </div>
  ),
}));

jest.mock('@/components/studio/StudioModals', () => ({
  SaveSlotModal: ({ onClose, onSave }: { onClose: () => void; onSave: (s: unknown) => void }) => (
    <div data-testid="save-slot-modal">
      <button data-testid="save-slot-close" onClick={onClose}>close-save-slot</button>
      <button data-testid="save-slot-save" onClick={() => onSave({ name: 'test', config: {} })}>save</button>
    </div>
  ),
}));

const baseProps = {
  language: 'KO' as const,
  activeTab: 'world' as const,
  currentSession: { config: { savedSlots: [] } } as unknown as ChatSession,
  updateCurrentSession: jest.fn(),
  triggerSave: jest.fn(),
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ModalProvider>{children}</ModalProvider>;
}

describe('StudioModalBridge', () => {
  beforeEach(() => {
    baseProps.updateCurrentSession.mockReset();
    baseProps.triggerSave.mockReset();
    mockAuth.user = { uid: 'test-user' };
    mockAuth.signInWithGoogle.mockReset();
  });

  it('apiKeyOpen=false, saveSlotOpen=false → 아무 modal 도 안 그림', () => {
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.queryByTestId('api-key-modal')).toBeNull();
    expect(screen.queryByTestId('save-slot-modal')).toBeNull();
  });

  it('[로그인 게이팅] 비로그인 + apiKeyOpen=true → 모달 미렌더 + setApiKeyOpen(false) + 로그인 유도', () => {
    mockAuth.user = null;
    const setApiKeyOpen = jest.fn();
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={true}
          setApiKeyOpen={setApiKeyOpen}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    // 키 모달은 열리지 않고, 부모 state 를 false 로 되돌리며, 로그인을 유도한다.
    expect(screen.queryByTestId('api-key-modal')).toBeNull();
    expect(setApiKeyOpen).toHaveBeenCalledWith(false);
    expect(mockAuth.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('apiKeyOpen=true → ModalProvider open + APIKeySlotManager 렌더', () => {
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={true}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId('api-key-modal')).toBeInTheDocument();
  });

  it('saveSlotOpen=true → SaveSlotModal 렌더', () => {
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={true}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId('save-slot-modal')).toBeInTheDocument();
  });

  it('api-key close → setApiKeyOpen(false) + onApiKeyChange 호출', () => {
    const setApiKeyOpen = jest.fn();
    const onApiKeyChange = jest.fn();
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={true}
          setApiKeyOpen={setApiKeyOpen}
          onApiKeyChange={onApiKeyChange}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    act(() => {
      screen.getByTestId('api-key-close').click();
    });
    expect(setApiKeyOpen).toHaveBeenCalledWith(false);
    expect(onApiKeyChange).toHaveBeenCalled();
  });

  it('save-slot close → setSaveSlotOpen(false)', () => {
    const setSaveSlotOpen = jest.fn();
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={true}
          setSaveSlotOpen={setSaveSlotOpen}
        />
      </Wrapper>,
    );
    act(() => {
      screen.getByTestId('save-slot-close').click();
    });
    expect(setSaveSlotOpen).toHaveBeenCalledWith(false);
  });

  it('save-slot save → updateCurrentSession + triggerSave 호출', () => {
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={true}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    act(() => {
      screen.getByTestId('save-slot-save').click();
    });
    expect(baseProps.updateCurrentSession).toHaveBeenCalledTimes(1);
    expect(baseProps.triggerSave).toHaveBeenCalledTimes(1);
    // savedSlots 누적 확인
    const call = baseProps.updateCurrentSession.mock.calls[0][0];
    expect(call.config.savedSlots).toHaveLength(1);
  });

  it('apiKeyOpen 변경 → modal 재렌더', () => {
    const setApiKeyOpen = jest.fn();
    const { rerender } = render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={setApiKeyOpen}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.queryByTestId('api-key-modal')).toBeNull();

    rerender(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={true}
          setApiKeyOpen={setApiKeyOpen}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId('api-key-modal')).toBeInTheDocument();
  });

  it('ModalProvider 밖에서 마운트 → throw (useModal 가드)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />,
      ),
    ).toThrow();
    spy.mockRestore();
  });

  it('currentSession null — base config 로 fallback', () => {
    const updateCurrentSession = jest.fn();
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          currentSession={null}
          updateCurrentSession={updateCurrentSession}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={true}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    act(() => {
      screen.getByTestId('save-slot-save').click();
    });
    expect(updateCurrentSession).toHaveBeenCalledTimes(1);
  });

  it('동시에 두 modal — ModalProvider 가 1 개만 활성 (stacking 미지원)', () => {
    // ModalProvider 는 한 번에 1 modal 만 — 두 boolean 이 true 여도 최종 1 개만 표시.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={true}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={true}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    const apiKey = screen.queryByTestId('api-key-modal');
    const saveSlot = screen.queryByTestId('save-slot-modal');
    // 정확히 둘 중 한 개만 렌더되어야 함 (스택 미지원).
    const renderedCount = (apiKey ? 1 : 0) + (saveSlot ? 1 : 0);
    expect(renderedCount).toBe(1);
    warnSpy.mockRestore();
  });

  it('saveSlot close 후 unmount cleanup', () => {
    const setSaveSlotOpen = jest.fn();
    const { unmount } = render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={true}
          setSaveSlotOpen={setSaveSlotOpen}
        />
      </Wrapper>,
    );
    unmount();
    // unmount 후 setter 추가 호출 없어야 함
    expect(setSaveSlotOpen).not.toHaveBeenCalled();
  });

  it('apiKeyOpen 토글 — false→true→false 시퀀스', () => {
    const setApiKeyOpen = jest.fn();
    const { rerender } = render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={setApiKeyOpen}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.queryByTestId('api-key-modal')).toBeNull();

    rerender(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={true}
          setApiKeyOpen={setApiKeyOpen}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId('api-key-modal')).toBeInTheDocument();

    rerender(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={false}
          setApiKeyOpen={setApiKeyOpen}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.queryByTestId('api-key-modal')).toBeNull();
  });

  it('useModal Provider 통합 — Bridge 마운트 시 Provider 정상', () => {
    function Inspector() {
      const ctx = useModal();
      return <div data-testid="modal-state">{ctx.state.id ?? 'null'}</div>;
    }
    render(
      <Wrapper>
        <Inspector />
        <StudioModalBridge
          {...baseProps}
          apiKeyOpen={true}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={false}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByTestId('modal-state').textContent).toBe('studio:api-keys');
  });

  it('JSON-serializable saved slot — savedSlots 누적', () => {
    const initialSlots = [{ name: 'old', config: {} }];
    const updateCurrentSession = jest.fn();
    render(
      <Wrapper>
        <StudioModalBridge
          {...baseProps}
          currentSession={{ config: { savedSlots: initialSlots } } as unknown as ChatSession}
          updateCurrentSession={updateCurrentSession}
          apiKeyOpen={false}
          setApiKeyOpen={jest.fn()}
          saveSlotOpen={true}
          setSaveSlotOpen={jest.fn()}
        />
      </Wrapper>,
    );
    act(() => {
      screen.getByTestId('save-slot-save').click();
    });
    const call = updateCurrentSession.mock.calls[0][0];
    expect(call.config.savedSlots).toHaveLength(2);
    expect(call.config.savedSlots[0]).toEqual({ name: 'old', config: {} });
  });
});
