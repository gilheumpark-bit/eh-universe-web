import "@testing-library/jest-dom";
import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { StoryConfig } from "@/lib/studio-types";
import TabWritingEditorSurface from "@/components/loreguard/tabs/TabWritingEditorSurface";

jest.mock("@/components/studio/InlineActionPopup", () => ({
  InlineActionPopup: () => null,
}));

const noop = jest.fn();

function renderSurface(text = "첫 문장\n둘째 문장") {
  const textareaRef = createRef<HTMLTextAreaElement>();
  const onTextPatch = jest.fn();
  render(
    <TabWritingEditorSurface
      language="KO"
      text={text}
      textareaRef={textareaRef}
      fontMode="default"
      editorViewStyle={{}}
      readMode={false}
      config={{ characters: [] } as unknown as StoryConfig}
      snapshotSessionId="session-1"
      snapshotEpisode={1}
      onKeyDown={noop}
      onContextMenu={noop}
      onChange={noop}
      onPaste={noop}
      onCompositionStart={noop}
      onCompositionEnd={noop}
      onTextPatch={onTextPatch}
      onReplaceInlineSelection={noop}
    />,
  );
  return { textarea: screen.getByRole("textbox", { name: "원고 본문 편집" }), textareaRef, onTextPatch };
}

describe("TabWritingEditorSurface manual manuscript tools", () => {
  beforeEach(() => {
    noop.mockClear();
  });

  it("커서 위치에 장면 전환 표식을 삽입한다", () => {
    const { textarea, onTextPatch } = renderSurface("첫 문장");
    (textarea as HTMLTextAreaElement).setSelectionRange(4, 4);

    fireEvent.click(screen.getByRole("button", { name: "장면 전환 삽입" }));

    expect(onTextPatch).toHaveBeenCalledWith("첫 문장\n\n* * *\n\n");
  });

  it("선택된 줄을 들여쓴다", () => {
    const { textarea, onTextPatch } = renderSurface("첫 문장\n둘째 문장");
    (textarea as HTMLTextAreaElement).setSelectionRange(0, 10);

    fireEvent.click(screen.getByRole("button", { name: "들여쓰기" }));

    expect(onTextPatch).toHaveBeenCalledWith("  첫 문장\n  둘째 문장");
  });

  it("브라우저 맞춤법 표시를 사용자가 켜고 끌 수 있다", () => {
    const { textarea } = renderSurface("첫 문장");
    const spellButton = screen.getByRole("button", { name: "브라우저 맞춤법 표시" });

    expect(textarea).toHaveAttribute("spellcheck", "false");

    fireEvent.click(spellButton);

    expect(spellButton).toHaveAttribute("aria-pressed", "true");
    expect(textarea).toHaveAttribute("spellcheck", "true");
  });
});
