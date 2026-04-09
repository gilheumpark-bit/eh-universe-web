// ============================================================
// PART 1 — Imports & Types
// ============================================================
// @ts-ignore
import type * as MonacoNS from "monaco-editor";
import { streamChat } from "@/lib/ai-providers";

// ============================================================
// PART 2 — Stealth Clipboard Profiler Engine
// ============================================================

export async function processStealthClipboard(
  monaco: typeof MonacoNS,
  editor: MonacoNS.editor.IStandaloneCodeEditor,
  range: MonacoNS.Range,
  // eslint-disable-next-line unused-imports/no-unused-vars
  language: string
) {
  const model = editor.getModel();
  if (!model) return;

  const pastedText = model.getValueInRange(range);
  if (pastedText.length < 30 || pastedText.length > 5000) return; // Too short or too long

  // eslint-disable-next-line unused-imports/no-unused-vars
  const fullText = model.getValue();
  const contextBefore = model.getValueInRange(new monaco.Range(1, 1, range.startLineNumber, range.startColumn)).slice(-1000);
  const contextAfter = model.getValueInRange(new monaco.Range(range.endLineNumber, range.endColumn, model.getLineCount(), model.getLineMaxColumn(model.getLineCount()))).slice(0, 1000);

  // Check if variables in pastedText exist in the context
  // Fast heuristic: If it has unresolved `camelCase` identifiers missing from `contextBefore`
  // We skip AST parsing for speed and directly ask SLM/LLM to profile it.
  
  // Create a decoration to dim the pasted text while profiling
  const decorationIds = editor.deltaDecorations([], [
    {
      range,
      options: {
        className: 'bg-accent-purple/20 border border-accent-purple/50 animate-pulse',
        isWholeLine: false,
        hoverMessage: { value: '🤖 Profiling Stealth Clipboard...' }
      }
    }
  ]);

  try {
    const prompt = `You are a stealth clipboard processor. Analyze the pasted code snippet and its surrounding context.
If the pasted code has mismatched variable names, wrong imports, or syntax inconsistencies with the surrounding context, output the FULL REPAIRED pasted code block.
If the pasted code is already perfect and requires no changes, output exactly the string "PERFECT".

Context Before:
\`\`\`
${contextBefore}
\`\`\`

Pasted Snippet:
\`\`\`
${pastedText}
\`\`\`

Context After:
\`\`\`
${contextAfter}
\`\`\`

Repaired Snippet:`;

    let result = '';
    await streamChat({
      systemInstruction: 'Output only the raw code with no markdown formatting. Do not wrap in ```.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 1000,
      onChunk: (text) => { result += text; }
    });

    const repaired = result.trim();
    if (repaired && repaired !== 'PERFECT' && repaired !== pastedText) {
      // Apply correction via edit operations for native Undo/Redo
      editor.pushEditOperations(
        [],
        [{
          range,
          text: repaired
        }],
        () => null
      );
      
      // Flash a success decoration
      const currentModel = editor.getModel();
      if (currentModel) {
        const lines = repaired.split('\\n');
        const endLine = range.startLineNumber + lines.length - 1;
        const endCol = lines.length === 1 ? range.startColumn + repaired.length : lines[lines.length - 1].length + 1;
        const newRange = new monaco.Range(range.startLineNumber, range.startColumn, endLine, endCol);
        
        editor.deltaDecorations(decorationIds, [
           {
              range: newRange,
              options: {
                 className: 'bg-accent-green/20 transition-colors duration-1000',
                 hoverMessage: { value: '✨ Automatically matched to local context variables!' }
              }
           }
        ]);
        
        // Remove success after 2 seconds
        setTimeout(() => editor.deltaDecorations(decorationIds, []), 2000);
        return;
      }
    }
  } catch (err) {
    console.warn("Stealth Clipboard Error:", err);
  }

  // Cleanup
  editor.deltaDecorations(decorationIds, []);
}

// IDENTITY_SEAL: PART-2 | role=stealth-clipboard | inputs=editor,range | outputs=applied correction
