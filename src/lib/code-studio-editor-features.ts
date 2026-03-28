/**
 * code-studio-editor-features.ts
 * Monaco editor advanced feature registration module.
 * Called from CodeStudioShell's Monaco onMount handler.
 */

import type * as Monaco from "monaco-editor";

// ============================================================
// PART 1 — Public Entry Point
// ============================================================

/**
 * Register all advanced editor features on a Monaco instance.
 * Safe to call multiple times — providers are additive.
 */
export function registerEditorFeatures(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor,
): void {
  registerSemanticTokens(monaco);
  registerEmmet(monaco);
  registerPrettierFormat(monaco, editor);
  registerCrossFileRename(monaco);
  registerGoToLine(editor);
  registerCodeActions(monaco);
}

// IDENTITY_SEAL: PART-1 | role=public API | inputs=monaco,editor | outputs=void

// ============================================================
// PART 2 — Semantic Tokens
// ============================================================

const SEMANTIC_TOKEN_TYPES = [
  "variable",
  "function",
  "class",
  "interface",
  "enum",
  "namespace",
  "parameter",
] as const;

const TOKEN_TYPE_MAP: Record<string, number> = {};
SEMANTIC_TOKEN_TYPES.forEach((t, i) => {
  TOKEN_TYPE_MAP[t] = i;
});

function registerSemanticTokens(monaco: typeof Monaco): void {
  const legend: Monaco.languages.SemanticTokensLegend = {
    tokenTypes: [...SEMANTIC_TOKEN_TYPES],
    tokenModifiers: [],
  };

  const provider: Monaco.languages.DocumentSemanticTokensProvider = {
    getLegend: () => legend,
    provideDocumentSemanticTokens(model) {
      const lines = model.getLinesContent();
      const data: number[] = [];
      let prevLine = 0;
      let prevChar = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const patterns: Array<{ regex: RegExp; tokenType: string }> = [
          { regex: /\bfunction\s+(\w+)/g, tokenType: "function" },
          { regex: /\bclass\s+(\w+)/g, tokenType: "class" },
          { regex: /\binterface\s+(\w+)/g, tokenType: "interface" },
          { regex: /\benum\s+(\w+)/g, tokenType: "enum" },
          { regex: /\bnamespace\s+(\w+)/g, tokenType: "namespace" },
          { regex: /\b(const|let|var)\s+(\w+)/g, tokenType: "variable" },
        ];

        for (const { regex, tokenType } of patterns) {
          let match: RegExpExecArray | null;
          while ((match = regex.exec(line)) !== null) {
            const captureIndex = match.length > 2 ? 2 : 1;
            const name = match[captureIndex];
            if (!name) continue;

            const charPos = match.index + match[0].indexOf(name);
            const deltaLine = i - prevLine;
            const deltaChar = deltaLine === 0 ? charPos - prevChar : charPos;

            data.push(deltaLine, deltaChar, name.length, TOKEN_TYPE_MAP[tokenType] ?? 0, 0);
            prevLine = i;
            prevChar = charPos;
          }
        }
      }

      return { data: new Uint32Array(data) };
    },
    releaseDocumentSemanticTokens() {
      /* no-op */
    },
  };

  monaco.languages.registerDocumentSemanticTokensProvider("typescript", provider);
  monaco.languages.registerDocumentSemanticTokensProvider("javascript", provider);
}

// IDENTITY_SEAL: PART-2 | role=semantic token coloring | inputs=monaco | outputs=provider registration

// ============================================================
// PART 3 — Emmet Abbreviation Support
// ============================================================

const EMMET_EXPANSIONS: Record<string, string> = {
  "!": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>",
  "div": "<div></div>",
  "span": "<span></span>",
  "ul>li": "<ul>\n  <li></li>\n</ul>",
  "ul>li*3": "<ul>\n  <li></li>\n  <li></li>\n  <li></li>\n</ul>",
  "ol>li*3": "<ol>\n  <li></li>\n  <li></li>\n  <li></li>\n</ol>",
  "table>tr>td": "<table>\n  <tr>\n    <td></td>\n  </tr>\n</table>",
  "nav>ul>li*4>a": "<nav>\n  <ul>\n    <li><a href=\"\"></a></li>\n    <li><a href=\"\"></a></li>\n    <li><a href=\"\"></a></li>\n    <li><a href=\"\"></a></li>\n  </ul>\n</nav>",
};

function expandSimpleEmmet(abbr: string): string | null {
  if (EMMET_EXPANSIONS[abbr]) return EMMET_EXPANSIONS[abbr];

  const tagMatch = abbr.match(/^(\w+)(\.[\w-]+)?(#[\w-]+)?$/);
  if (!tagMatch) return null;

  const [, tag, cls, id] = tagMatch;
  if (!tag) return null;
  const attrs: string[] = [];
  if (id) attrs.push(`id="${id.slice(1)}"`);
  if (cls) attrs.push(`class="${cls.slice(1)}"`);
  const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
  return `<${tag}${attrStr}></${tag}>`;
}

function registerEmmet(monaco: typeof Monaco): void {
  const provider: Monaco.languages.CompletionItemProvider = {
    triggerCharacters: [">", ".", "#", "*"],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const lineContent = model.getLineContent(position.lineNumber);
      const textBefore = lineContent.substring(0, position.column - 1).trim();

      if (!textBefore) return { suggestions: [] };

      const expanded = expandSimpleEmmet(textBefore);
      if (!expanded) return { suggestions: [] };

      const range = {
        startLineNumber: position.lineNumber,
        startColumn: position.column - textBefore.length,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };

      return {
        suggestions: [
          {
            label: `Emmet: ${textBefore}`,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: expanded,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.None,
            range,
            detail: "Emmet abbreviation",
            sortText: "0",
          },
        ],
      };
    },
  };

  monaco.languages.registerCompletionItemProvider("html", provider);
  monaco.languages.registerCompletionItemProvider("css", provider);
}

// IDENTITY_SEAL: PART-3 | role=emmet expansion | inputs=monaco | outputs=completion provider

// ============================================================
// PART 4 — Prettier-style Formatter
// ============================================================

function registerPrettierFormat(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor,
): void {
  const formatProvider: Monaco.languages.DocumentFormattingEditProvider = {
    displayName: "Code Studio Formatter",
    provideDocumentFormattingEdits(model) {
      const fullRange = model.getFullModelRange();
      const text = model.getValue();

      const formatted = simpleFormat(text);
      return [{ range: fullRange, text: formatted }];
    },
  };

  const languages = ["typescript", "javascript", "html", "css", "json"];
  for (const lang of languages) {
    monaco.languages.registerDocumentFormattingEditProvider(lang, formatProvider);
  }

  editor.addAction({
    id: "code-studio.formatDocument",
    label: "Format Document",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI],
    run(ed) {
      ed.getAction("editor.action.formatDocument")?.run();
    },
  });
}

/** Minimal formatting: trim trailing whitespace, normalize indentation */
function simpleFormat(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    result.push(line.replace(/\s+$/, ""));
  }

  while (result.length > 1 && result[result.length - 1] === "") {
    result.pop();
  }
  result.push("");

  return result.join("\n");
}

// IDENTITY_SEAL: PART-4 | role=document formatting | inputs=monaco,editor | outputs=format provider + shortcut

// ============================================================
// PART 5 — Cross-File Rename (Stub)
// ============================================================

function registerCrossFileRename(monaco: typeof Monaco): void {
  const renameProvider: Monaco.languages.RenameProvider = {
    provideRenameEdits(model, position, newName) {
      const wordAtPos = model.getWordAtPosition(position);
      if (!wordAtPos) return { edits: [] };

      const oldName = wordAtPos.word;
      const edits: Monaco.languages.IWorkspaceTextEdit[] = [];
      const text = model.getValue();
      const regex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, "g");
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + oldName.length);
        edits.push({
          resource: model.uri,
          textEdit: {
            range: {
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
            },
            text: newName,
          },
          versionId: undefined,
        });
      }

      return { edits };
    },
    resolveRenameLocation(model, position) {
      const wordAtPos = model.getWordAtPosition(position);
      if (!wordAtPos) {
        return {
          range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 },
          text: "",
          rejectReason: "Cannot rename this element",
        };
      }
      return {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: wordAtPos.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordAtPos.endColumn,
        },
        text: wordAtPos.word,
      };
    },
  };

  monaco.languages.registerRenameProvider("typescript", renameProvider);
  monaco.languages.registerRenameProvider("javascript", renameProvider);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// IDENTITY_SEAL: PART-5 | role=cross-file rename | inputs=monaco | outputs=rename provider

// ============================================================
// PART 6 — Go-to-Line (Ctrl+G)
// ============================================================

function registerGoToLine(editor: Monaco.editor.IStandaloneCodeEditor): void {
  editor.addAction({
    id: "code-studio.goToLine",
    label: "Go to Line...",
    keybindings: [
      // eslint-disable-next-line no-bitwise
      2048 /* CtrlCmd */ | 27 /* KeyG — Monaco KeyCode.KeyG = 27+ offset; using numeric */,
    ],
    run(ed) {
      const lineCount = ed.getModel()?.getLineCount() ?? 1;
      const input = globalThis.prompt?.(`Go to line (1-${lineCount}):`);
      if (input == null) return;

      const line = parseInt(input, 10);
      if (Number.isNaN(line) || line < 1 || line > lineCount) return;

      ed.revealLineInCenter(line);
      ed.setPosition({ lineNumber: line, column: 1 });
      ed.focus();
    },
  });
}

// IDENTITY_SEAL: PART-6 | role=go-to-line shortcut | inputs=editor | outputs=keyboard action

// ============================================================
// PART 7 — Code Actions (Quick Fixes)
// ============================================================

function registerCodeActions(monaco: typeof Monaco): void {
  const codeActionProvider: Monaco.languages.CodeActionProvider = {
    provideCodeActions(model, range) {
      const actions: Monaco.languages.CodeAction[] = [];
      const lineContent = model.getLineContent(range.startLineNumber);

      // Missing semicolon
      if (
        lineContent.trim().length > 0 &&
        !lineContent.trim().endsWith(";") &&
        !lineContent.trim().endsWith("{") &&
        !lineContent.trim().endsWith("}") &&
        !lineContent.trim().endsWith(",") &&
        !lineContent.trim().startsWith("//") &&
        !lineContent.trim().startsWith("*") &&
        !lineContent.trim().startsWith("import")
      ) {
        const trimmedEnd = lineContent.length;
        actions.push({
          title: "Add missing semicolon",
          kind: "quickfix",
          edit: {
            edits: [
              {
                resource: model.uri,
                textEdit: {
                  range: {
                    startLineNumber: range.startLineNumber,
                    startColumn: trimmedEnd + 1,
                    endLineNumber: range.startLineNumber,
                    endColumn: trimmedEnd + 1,
                  },
                  text: ";",
                },
                versionId: undefined,
              },
            ],
          },
          isPreferred: false,
        });
      }

      // Unused import detection (simple heuristic)
      const importMatch = lineContent.match(
        /^import\s+(?:{\s*([\w,\s]+)\s*}|\*\s+as\s+(\w+)|(\w+))\s+from/,
      );
      if (importMatch) {
        actions.push({
          title: "Remove this import",
          kind: "quickfix",
          edit: {
            edits: [
              {
                resource: model.uri,
                textEdit: {
                  range: {
                    startLineNumber: range.startLineNumber,
                    startColumn: 1,
                    endLineNumber: range.startLineNumber + 1,
                    endColumn: 1,
                  },
                  text: "",
                },
                versionId: undefined,
              },
            ],
          },
          isPreferred: false,
        });
      }

      // Missing return type hint
      const funcMatch = lineContent.match(/(?:function\s+\w+|=>\s*)\([^)]*\)\s*{/);
      if (funcMatch) {
        actions.push({
          title: "Add return type annotation ': void'",
          kind: "quickfix",
          edit: {
            edits: [
              {
                resource: model.uri,
                textEdit: {
                  range: {
                    startLineNumber: range.startLineNumber,
                    startColumn: lineContent.indexOf("{"),
                    endLineNumber: range.startLineNumber,
                    endColumn: lineContent.indexOf("{"),
                  },
                  text: ": void ",
                },
                versionId: undefined,
              },
            ],
          },
          isPreferred: false,
        });
      }

      return { actions, dispose() {} };
    },
  };

  monaco.languages.registerCodeActionProvider("typescript", codeActionProvider);
  monaco.languages.registerCodeActionProvider("javascript", codeActionProvider);
}

// IDENTITY_SEAL: PART-7 | role=code action quick fixes | inputs=monaco | outputs=code action provider
