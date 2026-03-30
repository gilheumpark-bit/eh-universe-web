// ============================================================
// PART 1 — Token Type & Modifier Legends
// ============================================================
// Ported from CSL IDE semantic-tokens.ts
// Provides rich semantic highlighting via TypeScript worker.

type MonacoModule = typeof import("monaco-editor");

const TOKEN_TYPES = [
  "namespace", "type", "class", "enum", "interface", "struct",
  "typeParameter", "parameter", "variable", "property", "enumMember",
  "event", "function", "method", "macro", "keyword", "modifier",
  "comment", "string", "number", "regexp", "operator", "decorator",
] as const;

const TOKEN_MODIFIERS = [
  "declaration", "definition", "readonly", "static", "deprecated",
  "abstract", "async", "modification", "documentation", "defaultLibrary",
] as const;

// IDENTITY_SEAL: PART-1 | role=token legend | inputs=none | outputs=type+modifier arrays

// ============================================================
// PART 2 — TS Classification Mapping
// ============================================================

const TS_CLASS_COMMENT = 1;
const TS_CLASS_IDENTIFIER = 2;
const TS_CLASS_KEYWORD = 3;
const TS_CLASS_NUMERIC_LITERAL = 4;
const TS_CLASS_OPERATOR = 5;
const TS_CLASS_STRING_LITERAL = 6;
const TS_CLASS_REGULAR_EXPRESSION = 7;
const TS_CLASS_CLASS_NAME = 11;
const TS_CLASS_ENUM_NAME = 12;
const TS_CLASS_INTERFACE_NAME = 13;
const TS_CLASS_MODULE_NAME = 14;
const TS_CLASS_TYPE_PARAMETER_NAME = 15;
const TS_CLASS_TYPE_ALIAS_NAME = 16;
const TS_CLASS_PARAMETER_NAME = 17;
const TS_CLASS_DOC_COMMENT_TAG_NAME = 18;
const TS_CLASS_JSX_OPEN_TAG_NAME = 19;
const TS_CLASS_JSX_CLOSE_TAG_NAME = 20;
const TS_CLASS_JSX_SELF_CLOSING_TAG_NAME = 21;
const TS_CLASS_JSX_ATTRIBUTE = 22;
const TS_CLASS_JSX_TEXT = 23;
const TS_CLASS_JSX_ATTRIBUTE_STRING_LITERAL_VALUE = 24;
const TS_CLASS_BIG_INT = 25;

const TOKEN_TYPE_OFFSET = 8;
const TOKEN_MODIFIER_MASK = (1 << TOKEN_TYPE_OFFSET) - 1;

function mapTsClassificationToTokenType(tsType: number): number {
  switch (tsType) {
    case TS_CLASS_COMMENT: case TS_CLASS_DOC_COMMENT_TAG_NAME: return 17;
    case TS_CLASS_KEYWORD: return 15;
    case TS_CLASS_NUMERIC_LITERAL: case TS_CLASS_BIG_INT: return 19;
    case TS_CLASS_OPERATOR: return 21;
    case TS_CLASS_STRING_LITERAL: case TS_CLASS_JSX_ATTRIBUTE_STRING_LITERAL_VALUE: case TS_CLASS_JSX_TEXT: return 18;
    case TS_CLASS_REGULAR_EXPRESSION: return 20;
    case TS_CLASS_CLASS_NAME: return 2;
    case TS_CLASS_ENUM_NAME: return 3;
    case TS_CLASS_INTERFACE_NAME: return 4;
    case TS_CLASS_MODULE_NAME: return 0;
    case TS_CLASS_TYPE_PARAMETER_NAME: return 6;
    case TS_CLASS_TYPE_ALIAS_NAME: return 1;
    case TS_CLASS_PARAMETER_NAME: return 7;
    case TS_CLASS_JSX_OPEN_TAG_NAME: case TS_CLASS_JSX_CLOSE_TAG_NAME: case TS_CLASS_JSX_SELF_CLOSING_TAG_NAME: return 2;
    case TS_CLASS_JSX_ATTRIBUTE: return 7;
    case TS_CLASS_IDENTIFIER: return 8;
    default: return -1;
  }
}

function mapTsModifiers(tsModifiers: number): number {
  let result = 0;
  if (tsModifiers & (1 << 0)) result |= (1 << 0); // declaration
  if (tsModifiers & (1 << 1)) result |= (1 << 3); // static
  if (tsModifiers & (1 << 2)) result |= (1 << 6); // async
  if (tsModifiers & (1 << 3)) result |= (1 << 2); // readonly
  if (tsModifiers & (1 << 4)) result |= (1 << 9); // defaultLibrary
  return result;
}

// IDENTITY_SEAL: PART-2 | role=TS classification mapper | inputs=TS encoded classification | outputs=Monaco token type+modifier

// ============================================================
// PART 3 — Semantic Tokens Computation
// ============================================================

interface SemanticTokensState {
  disposable: { dispose(): void } | null;
  previousResultIds: Map<string, string>;
  versionIds: Map<string, number>;
}

const state: SemanticTokensState = {
  disposable: null,
  previousResultIds: new Map(),
  versionIds: new Map(),
};

async function computeSemanticTokens(
  monaco: MonacoModule,
  model: import("monaco-editor").editor.ITextModel,
): Promise<{ data: Uint32Array; resultId: string } | null> {
  try {
    const isTS = model.getLanguageId() === "typescript" || model.getLanguageId() === "typescriptreact";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ts = (monaco.languages as any).typescript;
    const getWorker = isTS ? ts.getTypeScriptWorker : ts.getJavaScriptWorker;
    const worker = await getWorker();
    const client = await worker(model.uri);

    const result = await client.getEncodedSemanticClassifications(
      model.uri.toString(),
      { start: 0, length: model.getValue().length },
    );

    if (!result?.spans?.length) {
      return { data: new Uint32Array(0), resultId: `${model.getVersionId()}` };
    }

    const spans = result.spans;
    const tokenData: number[] = [];
    let prevLine = 0;
    let prevChar = 0;

    for (let i = 0; i < spans.length; i += 3) {
      const start = spans[i];
      const length = spans[i + 1];
      const encodedClassification = spans[i + 2];

      const tsType = encodedClassification >> TOKEN_TYPE_OFFSET;
      const tsModifiers = encodedClassification & TOKEN_MODIFIER_MASK;
      const tokenType = mapTsClassificationToTokenType(tsType);
      if (tokenType < 0) continue;

      const pos = model.getPositionAt(start);
      const line = pos.lineNumber - 1;
      const char = pos.column - 1;
      const deltaLine = line - prevLine;
      const deltaStartChar = deltaLine === 0 ? char - prevChar : char;

      tokenData.push(deltaLine, deltaStartChar, length, tokenType, mapTsModifiers(tsModifiers));
      prevLine = line;
      prevChar = char;
    }

    return { data: new Uint32Array(tokenData), resultId: `${model.getVersionId()}` };
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=token computation | inputs=Monaco model | outputs=encoded Uint32Array

// ============================================================
// PART 4 — Provider Registration & Public API
// ============================================================

/** Register DocumentSemanticTokensProvider for TS/JS files. */
export function registerSemanticTokensProvider(monaco: MonacoModule): { dispose(): void } {
  if (state.disposable) state.disposable.dispose();

  const legend: import("monaco-editor").languages.SemanticTokensLegend = {
    tokenTypes: [...TOKEN_TYPES],
    tokenModifiers: [...TOKEN_MODIFIERS],
  };

  const languages = ["typescript", "typescriptreact", "javascript", "javascriptreact"];
  const disposables: Array<{ dispose(): void }> = [];

  for (const lang of languages) {
    const provider = monaco.languages.registerDocumentSemanticTokensProvider(lang, {
      getLegend() { return legend; },

      async provideDocumentSemanticTokens(model, lastResultId, token) {
        if (token.isCancellationRequested) return null;

        if (lastResultId && state.previousResultIds.get(model.uri.toString()) === lastResultId) {
          const currentVersion = model.getVersionId();
          const lastVersion = state.versionIds.get(model.uri.toString());
          if (lastVersion !== undefined && currentVersion === lastVersion) {
            return { data: new Uint32Array(0), resultId: lastResultId };
          }
        }

        const result = await computeSemanticTokens(monaco, model);
        if (!result) return null;
        state.previousResultIds.set(model.uri.toString(), result.resultId);
        state.versionIds.set(model.uri.toString(), model.getVersionId());
        return { data: result.data, resultId: result.resultId };
      },

      releaseDocumentSemanticTokens(resultId) {
        if (resultId) {
          for (const [uri, rid] of state.previousResultIds) {
            if (rid === resultId) {
              state.previousResultIds.delete(uri);
              state.versionIds.delete(uri);
              break;
            }
          }
        }
      },
    });
    disposables.push(provider);
  }

  const combined = {
    dispose() {
      for (const d of disposables) d.dispose();
      state.previousResultIds.clear();
      state.versionIds.clear();
      state.disposable = null;
    },
  };
  state.disposable = combined;
  return combined;
}

/** Dispose provider and clean up all state. */
export function disposeSemanticTokens(): void {
  if (state.disposable) { state.disposable.dispose(); state.disposable = null; }
  state.previousResultIds.clear();
  state.versionIds.clear();
}

/** Force refresh for a specific model URI. */
export function invalidateSemanticTokens(uri: string): void {
  state.previousResultIds.delete(uri);
  state.versionIds.delete(uri);
}

/** Get the semantic token legend. */
export function getSemanticTokenLegend(): { tokenTypes: readonly string[]; tokenModifiers: readonly string[] } {
  return { tokenTypes: TOKEN_TYPES, tokenModifiers: TOKEN_MODIFIERS };
}

// IDENTITY_SEAL: PART-4 | role=provider registration + API | inputs=Monaco instance | outputs=registered provider disposable
