import { act, renderHook } from "@testing-library/react";
import type { ChangeEvent, ClipboardEvent, MutableRefObject } from "react";
import { useTabWritingEditorActions } from "@/components/loreguard/tabs/useTabWritingEditorActions";
import type { CreativeEventLogger } from "@/hooks/useCreativeEventLogger";

function makeArgs(overrides: Partial<Parameters<typeof useTabWritingEditorActions>[0]> = {}) {
  const lastLoggedRef = {
    current: { text: "기존 원고", sessionId: "session-1", episode: 1 },
  } as MutableRefObject<{ text: string; sessionId: string; episode: number | null } | null>;

  return {
    commitHumanEditIfDue: jest.fn(),
    currentSession: { id: "session-1", config: { episode: 1 } },
    editDraft: "기존 원고",
    editDraftRef: { current: null },
    fireLog: jest.fn(),
    hugePasteRef: { current: false },
    isComposingRef: { current: false },
    language: "KO" as const,
    lastLoggedRef,
    lastSnapshotRef: { current: null },
    manuscriptTargetId: "1",
    setEditDraft: jest.fn(),
    setConfig: jest.fn(),
    setPasteNotice: jest.fn(),
    setSnapshotMeta: jest.fn(),
    setSuggestions: jest.fn(),
    snapshotEpisode: 1,
    snapshotSessionId: "session-1",
    ...overrides,
  };
}

describe("useTabWritingEditorActions origin logging", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "__creativeLogger");
  });

  it("클립보드 붙여넣기는 크기와 무관하게 외부 편입 후보로 기록한다", () => {
    const logExternalImport = jest.fn().mockResolvedValue("import-1");
    Object.defineProperty(window, "__creativeLogger", {
      configurable: true,
      value: { logExternalImport } satisfies Partial<CreativeEventLogger>,
    });
    const args = makeArgs();
    const { result } = renderHook(() => useTabWritingEditorActions(args));
    const pasted = "외부에서 가져온 500자 미만 문장";
    const next = `${args.editDraft}${pasted}`;

    act(() => {
      result.current.handleEditorPaste({
        clipboardData: { getData: () => pasted },
      } as unknown as ClipboardEvent<HTMLTextAreaElement>);
      result.current.handleEditorChange({
        target: { value: next },
      } as ChangeEvent<HTMLTextAreaElement>);
    });

    expect(logExternalImport).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "manuscript",
        targetId: "1",
        label: "클립보드 붙여넣기",
        content: pasted,
      }),
    );
    expect(args.lastLoggedRef.current).toEqual({ text: next, sessionId: "session-1", episode: 1 });
  });

  it("빠른 대량 입력은 붙여넣기 이벤트가 없어도 외부 편입 후보로 기록한다", () => {
    const logExternalImport = jest.fn().mockResolvedValue("burst-1");
    Object.defineProperty(window, "__creativeLogger", {
      configurable: true,
      value: { logExternalImport } satisfies Partial<CreativeEventLogger>,
    });
    const args = makeArgs();
    const { result } = renderHook(() => useTabWritingEditorActions(args));
    const inserted = "가".repeat(520);
    const next = `${args.editDraft}${inserted}`;

    act(() => {
      result.current.handleEditorChange({
        target: { value: next },
      } as ChangeEvent<HTMLTextAreaElement>);
    });

    expect(logExternalImport).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "manuscript",
        targetId: "1",
        label: "빠른 대량 입력 감지",
        content: inserted,
      }),
    );
    expect(args.lastLoggedRef.current).toEqual({ text: next, sessionId: "session-1", episode: 1 });
  });
});
