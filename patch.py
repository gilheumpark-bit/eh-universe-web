import sys

file_path = r'c:\eh-universe-web\apps\desktop\renderer\components\code-studio\TerminalPanel.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. TermLine Extension
content = content.replace(
    '  executionTime?: number;\n}',
    '  executionTime?: number;\n  fixCommand?: string;\n  isAutoHeal?: boolean;\n}'
)

# 2. analyzeErrorWithAI Signature
content = content.replace(
    '): Promise<{ summary: string; suggestion: string } | null> {',
    '): Promise<{ summary: string; suggestion: string; fixCommand?: string } | null> {'
)

# 3. System Instruction
content = content.replace(
    '        "provide a brief 1-line summary of the error and a 1-line fix suggestion. " +\n        `Respond in ${lang === "ko" ? "Korean" : "English"}. Format: SUMMARY: ...\\nSUGGESTION: ...`,',
    '        "provide a brief 1-line summary of the error and a 1-line fix suggestion. " +\n        "If there is a clear actionable command to fix the issue, provide it under FIX_COMMAND. " +\n        `Respond in ${lang === "ko" ? "Korean" : "English"}. Format: SUMMARY: ...\\nSUGGESTION: ...\\nFIX_COMMAND: ...`,'
)

# 4. Result Parsing
content = content.replace(
    r"""    const summaryMatch = result.match(/SUMMARY:\s*(.+)/);
    const suggestionMatch = result.match(/SUGGESTION:\s*(.+)/);

    if (summaryMatch || suggestionMatch) {
      return {
        summary: summaryMatch?.[1]?.trim() ?? t('terminalPanel.analysisComplete'),
        suggestion: suggestionMatch?.[1]?.trim() ?? t('terminalPanel.stderrLogs'),
      };
    }""",
    r"""    const summaryMatch = result.match(/SUMMARY:\s*(.+)/);
    const suggestionMatch = result.match(/SUGGESTION:\s*(.+)/);
    const fixCommandMatch = result.match(/FIX_COMMAND:\s*(.+)/);

    if (summaryMatch || suggestionMatch || fixCommandMatch) {
      return {
        summary: summaryMatch?.[1]?.trim() ?? t('terminalPanel.analysisComplete'),
        suggestion: suggestionMatch?.[1]?.trim() ?? t('terminalPanel.stderrLogs'),
        fixCommand: fixCommandMatch?.[1]?.trim(),
      };
    }"""
)

# 5. handleCommand declaration
content = content.replace(
    '  const handleCommand = useCallback(async () => {\n    let cmd = input.trim();',
    '  const handleCommand = useCallback(async (overrideCmd?: string | React.MouseEvent) => {\n    let cmd = typeof overrideCmd === \'string\' ? overrideCmd.trim() : input.trim();'
)

# 6. rendering the fixCommand
content = content.replace(
"""          if (analysis) {
            setLines((prev) => [
              ...prev,
              { text: `[AI] ${analysis.summary}`, color: "blue" },
              { text: `[AI] ${t('terminalPanel.suggestion')}: ${analysis.suggestion}`, color: "blue" },
              { text: "" },
            ]);
          } else {""",
"""          if (analysis) {
            setLines((prev) => [
              ...prev,
              { text: `[AI] ${analysis.summary}`, color: "blue" },
              { text: `[AI] ${t('terminalPanel.suggestion')}: ${analysis.suggestion}`, color: "blue" },
              ...(analysis.fixCommand ? [{
                text: `💡 [${t('terminalPanel.clickToFix')}] ${analysis.fixCommand}`,
                color: "green",
                isCommand: true,
                rawCommand: analysis.fixCommand,
                isAutoHeal: true,
              } as TermLine] : []),
              { text: "" },
            ]);
          } else {"""
)

# 7. click handler
content = content.replace(
"""            onClick={
              line.isCommand && line.rawCommand
                ? () => {
                    setInput(line.rawCommand!);
                    inputRef.current?.focus();
                  }
                : undefined
            }""",
"""            onClick={
              line.isCommand && line.rawCommand
                ? () => {
                    if (line.isAutoHeal) {
                      setInput("");
                      inputRef.current?.focus();
                      handleCommand(line.rawCommand!);
                    } else {
                      setInput(line.rawCommand!);
                      inputRef.current?.focus();
                    }
                  }
                : undefined
            }"""
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched TerminalPanel.tsx successfully.")
