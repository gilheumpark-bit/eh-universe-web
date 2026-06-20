/**
 * WritingContext — provider mount + throw 시나리오 검증 (rank 11)
 *
 * Tests:
 *  - useWriting() Provider 외부 호출 시 throw
 *  - useWritingSafe() Provider 외부 호출 시 null 반환
 *  - Provider 안에서 value 그대로 노출
 */
import "@testing-library/jest-dom";
import React from "react";
import { render } from "@testing-library/react";
import { WritingProvider, useWriting, useWritingSafe, type WritingContextValue } from "../WritingContext";

const noop = () => {};

function makeStubValue(): WritingContextValue {
  return {
    language: "KO",
    currentSession: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: "s1", title: "t", lastUpdate: 0, messages: [], config: {} as any,
    },
    currentSessionId: "s1",
    currentProjectId: "project-1",
    updateCurrentSession: noop,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setConfig: noop as any,
    writingMode: "edit",
    setWritingMode: noop,
    editDraft: "",
    setEditDraft: noop,
    editDraftRef: { current: null },
    canvasContent: "",
    setCanvasContent: noop,
    canvasPass: 0,
    setCanvasPass: noop,
    promptDirective: "",
    isGenerating: false,
    lastReport: null,
    handleSend: noop,
    handleCancel: noop,
    handleRegenerate: noop,
    handleVersionSwitch: noop,
    handleTypoFix: noop,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    directorReport: null as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hfcpState: {} as any,
    handleNextEpisode: noop,
    input: "",
    setInput: noop,
    searchQuery: "",
    filteredMessages: [],
    messagesEndRef: { current: null },
    hasApiKey: false,
    setShowApiKeyModal: noop,
    showAiLock: false,
    hostedProviders: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    advancedSettings: {} as any,
    setAdvancedSettings: noop,
    showDashboard: false,
    rightPanelOpen: false,
    setRightPanelOpen: noop,
    writingColumnShell: "",
    setActiveTab: noop,
    saveFlash: false,
    triggerSave: noop,
    suggestions: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSuggestions: noop as any,
    pipelineResult: null,
  };
}

describe("WritingContext", () => {
  it("useWriting() throws outside Provider", () => {
    const Bad = () => {
      useWriting();
      return null;
    };
    // suppress React error logs
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow(/WritingProvider/);
    spy.mockRestore();
  });

  it("useWritingSafe() returns null outside Provider", () => {
    let captured: ReturnType<typeof useWritingSafe> | undefined;
    const Probe = () => {
      captured = useWritingSafe();
      return null;
    };
    render(<Probe />);
    expect(captured).toBeNull();
  });

  it("useWriting() returns value inside Provider", () => {
    const value = makeStubValue();
    let captured: WritingContextValue | undefined;
    const Probe = () => {
      captured = useWriting();
      return null;
    };
    render(
      <WritingProvider value={value}>
        <Probe />
      </WritingProvider>,
    );
    expect(captured?.language).toBe("KO");
    expect(captured?.currentSessionId).toBe("s1");
    expect(captured?.writingMode).toBe("edit");
  });

  // [풀점검 priority 10 — 2026-06-08] 기존 3 → 15+ 확장. setter / ref / propagation 커버.

  it("setWritingMode setter — Provider value 의 함수 그대로 노출", () => {
    const setWritingMode = jest.fn();
    const value = { ...makeStubValue(), setWritingMode };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    captured?.setWritingMode("ai");
    expect(setWritingMode).toHaveBeenCalledWith("ai");
  });

  it("setEditDraft setter 전달", () => {
    const setEditDraft = jest.fn();
    const value = { ...makeStubValue(), setEditDraft };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    captured?.setEditDraft("new manuscript");
    expect(setEditDraft).toHaveBeenCalledWith("new manuscript");
  });

  it("handleSend async 핸들러 — 호출 가능", () => {
    const handleSend = jest.fn();
    const value = { ...makeStubValue(), handleSend };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    captured?.handleSend();
    expect(handleSend).toHaveBeenCalledTimes(1);
  });

  it("handleRegenerate / handleCancel / handleTypoFix — 모두 호출 가능", () => {
    const handleRegenerate = jest.fn();
    const handleCancel = jest.fn();
    const handleTypoFix = jest.fn();
    const value = { ...makeStubValue(), handleRegenerate, handleCancel, handleTypoFix };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    captured?.handleRegenerate("m1");
    captured?.handleCancel();
    captured?.handleTypoFix("m1", 0, "orig", "fixed");
    expect(handleRegenerate).toHaveBeenCalled();
    expect(handleCancel).toHaveBeenCalled();
    expect(handleTypoFix).toHaveBeenCalledWith("m1", 0, "orig", "fixed");
  });

  it("editDraftRef — null 초기값 정상 전달", () => {
    const ref = { current: null };
    const value = { ...makeStubValue(), editDraftRef: ref };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    expect(captured?.editDraftRef).toBe(ref);
    expect(captured?.editDraftRef.current).toBeNull();
  });

  it("messagesEndRef — null 초기값", () => {
    const value = makeStubValue();
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    expect(captured?.messagesEndRef).toBeDefined();
    expect(captured?.messagesEndRef.current).toBeNull();
  });

  it("language EN → 그대로 전파", () => {
    const value = { ...makeStubValue(), language: "EN" as const };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    expect(captured?.language).toBe("EN");
  });

  it("language 변경 — Provider value 갱신 시 propagation", () => {
    const initial = makeStubValue();
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    const { rerender } = render(<WritingProvider value={initial}><Probe /></WritingProvider>);
    expect(captured?.language).toBe("KO");
    rerender(<WritingProvider value={{ ...initial, language: "JP" }}><Probe /></WritingProvider>);
    expect(captured?.language).toBe("JP");
  });

  it("currentSession 변경 — id 갱신 후 propagation", () => {
    const initial = makeStubValue();
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    const { rerender } = render(<WritingProvider value={initial}><Probe /></WritingProvider>);
    expect(captured?.currentSessionId).toBe("s1");
    rerender(<WritingProvider value={{ ...initial, currentSessionId: "s2" }}><Probe /></WritingProvider>);
    expect(captured?.currentSessionId).toBe("s2");
  });

  it("hasApiKey false / true 변경", () => {
    const initial = makeStubValue();
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    const { rerender } = render(<WritingProvider value={initial}><Probe /></WritingProvider>);
    expect(captured?.hasApiKey).toBe(false);
    rerender(<WritingProvider value={{ ...initial, hasApiKey: true }}><Probe /></WritingProvider>);
    expect(captured?.hasApiKey).toBe(true);
  });

  it("rightPanelOpen toggle propagation", () => {
    const setRightPanelOpen = jest.fn();
    const value = { ...makeStubValue(), rightPanelOpen: true, setRightPanelOpen };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    expect(captured?.rightPanelOpen).toBe(true);
    captured?.setRightPanelOpen(false);
    expect(setRightPanelOpen).toHaveBeenCalledWith(false);
  });

  it("setActiveTab — context 노출", () => {
    const setActiveTab = jest.fn();
    const value = { ...makeStubValue(), setActiveTab };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    captured?.setActiveTab("writing");
    expect(setActiveTab).toHaveBeenCalledWith("writing");
  });

  it("useWritingSafe — Provider 안에서 value 반환 (non-null)", () => {
    const value = makeStubValue();
    let captured: ReturnType<typeof useWritingSafe> | undefined;
    const Probe = () => { captured = useWritingSafe(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    expect(captured).not.toBeNull();
    expect(captured?.language).toBe("KO");
  });

  it("nested Provider — 안쪽 value 우선", () => {
    const outer = makeStubValue();
    const inner = { ...makeStubValue(), language: "EN" as const };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(
      <WritingProvider value={outer}>
        <WritingProvider value={inner}>
          <Probe />
        </WritingProvider>
      </WritingProvider>,
    );
    expect(captured?.language).toBe("EN");
  });

  it("isGenerating true 상태 노출", () => {
    const value = { ...makeStubValue(), isGenerating: true };
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    render(<WritingProvider value={value}><Probe /></WritingProvider>);
    expect(captured?.isGenerating).toBe(true);
  });

  it("filteredMessages 빈 배열 / 비어있지 않음 전파", () => {
    const initial = makeStubValue();
    let captured: WritingContextValue | undefined;
    const Probe = () => { captured = useWriting(); return null; };
    const { rerender } = render(<WritingProvider value={initial}><Probe /></WritingProvider>);
    expect(captured?.filteredMessages).toEqual([]);
    rerender(<WritingProvider value={{ ...initial, filteredMessages: [{ role: "user", content: "hi", timestamp: 0 } as never] }}><Probe /></WritingProvider>);
    expect(captured?.filteredMessages.length).toBe(1);
  });
});
