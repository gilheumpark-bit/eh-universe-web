"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Terminal as TerminalIcon,
  Loader2,
  Copy,
  Lock,
  Unlock,
} from "lucide-react";
import {
  executeCommand,
  type CommandContext,
} from "@/lib/code-studio/features/terminal";
import {
  createWebContainer,
  type WebContainerInstance,
} from "@/lib/code-studio/features/webcontainer";
import { parseAnsi } from "@/lib/code-studio/core/ansi";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import {
  HistoryManager,
  EnvironmentManager,
  JobManager,
  executeBuiltin,
  preprocessCommand,
  getAutocompleteSuggestions,
  highlightInput,
  type HighlightedSpan,
} from "@/lib/code-studio/features/terminal-emulator";
import { streamChat, getApiKey, getActiveProvider } from "@/lib/ai-providers";
import type { FileNode } from "@/lib/code-studio/core/types";

export interface TerminalPanelProps {
  files?: FileNode[];
  onRunPipeline?: (fileName: string) => void;
  onAskAI?: (prompt: string) => void;
}

interface TermLine {
  text: string;
  color?: string;
  isCommand?: boolean;
  rawCommand?: string;
  executionTime?: number;
}

// IDENTITY_SEAL: PART-1 | role=imports+types | inputs=none | outputs=TerminalPanelProps,TermLine

// ============================================================
// PART 2 — Shell State (persistent singletons)
// ============================================================

const shellHistory = new HistoryManager();
const shellEnv = new EnvironmentManager();
const shellJobs = new JobManager();

const COMMAND_ALIASES: Record<string, string> = {
  ni: "npm install",
  nr: "npm run",
  nrd: "npm run dev",
  nrb: "npm run build",
  gs: "git status",
  ga: "git add",
  gc: "git commit",
  gp: "git push",
  gl: "git log --oneline",
  gd: "git diff",
  ll: "ls -la",
  cls: "clear",
};

const LOCAL_ONLY_CMDS = new Set([
  "clear", "help", "csl", "aliases", "ask",
  "export", "unset", "alias", "unalias", "env", "set",
  "history", "jobs", "fg", "bg",
]);

// IDENTITY_SEAL: PART-2 | role=shell state | inputs=none | outputs=shellHistory,shellEnv,shellJobs

// ============================================================
// PART 3 — AI Error Analysis Helper
// ============================================================

async function analyzeErrorWithAI(
  command: string,
  stderr: string,
  exitCode: number,
  lang: string
): Promise<{ summary: string; suggestion: string } | null> {
  try {
    const provider = getActiveProvider();
    const apiKey = getApiKey(provider);
    if (!apiKey) return null;

    let result = "";
    await streamChat({
      systemInstruction:
        "You are a terminal error analyst. Given a failed command and its stderr, " +
        "provide a brief 1-line summary of the error and a 1-line fix suggestion. " +
        `Respond in ${lang === "ko" ? "Korean" : "English"}. Format: SUMMARY: ...\nSUGGESTION: ...`,
      messages: [
        {
          role: "user",
          content: `Command: ${command}\nExit code: ${exitCode}\nStderr:\n${stderr.slice(0, 1000)}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 200,
      onChunk: (text: string) => {
        result += text;
      },
    });

    const summaryMatch = result.match(/SUMMARY:\s*(.+)/);
    const suggestionMatch = result.match(/SUGGESTION:\s*(.+)/);

    if (summaryMatch || suggestionMatch) {
      return {
        summary: summaryMatch?.[1]?.trim() ?? L4(lang, { ko: "분석 완료", en: "Analysis complete" }),
        suggestion: suggestionMatch?.[1]?.trim() ?? L4(lang, { ko: "stderr 로그를 확인하세요.", en: "Please check stderr logs." }),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// IDENTITY_SEAL: PART-3 | role=AI error analysis | inputs=command,stderr,exitCode | outputs=analysis|null

// ============================================================
// PART 4 — Component
// ============================================================

export function TerminalPanel({
  files = [],
  onRunPipeline,
  onAskAI,
}: TerminalPanelProps) {
  const { lang } = useLang();
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [_inputHighlight, setInputHighlight] = useState<HighlightedSpan[]>([]);
  const [wcInstance, setWcInstance] = useState<WebContainerInstance | null>(null);
  const [wcBooting, setWcBooting] = useState(false);
  const [scrollLock, setScrollLock] = useState(false);
  const [autocompleteOptions, setAutocompleteOptions] = useState<string[]>([]);
  const [autocompleteIdx, setAutocompleteIdx] = useState(-1);
  const [cwd, setCwd] = useState("~/project");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopyOutput = useCallback(() => {
    const text = lines.map((l) => l.text).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setLines((prev) => [
        ...prev,
        { text: L4(lang, { ko: "[출력이 클립보드에 복사됨]", en: "[Output copied to clipboard]" }), color: "blue" },
      ]);
    });
  }, [lines, lang]);

  // Boot WebContainer on mount
  useEffect(() => {
    let cancelled = false;
    setWcBooting(true);
    setLines([{ text: L4(lang, { ko: "WebContainer 부팅 중\u2026", en: "Booting WebContainer\u2026" }), color: "blue" }]);

    (async () => {
      try {
        const instance = await createWebContainer();
        if (cancelled) return;
        setWcInstance(instance);
        setLines([
          {
            text: instance.isAvailable
              ? "EH Code Studio Terminal v2.0 \u2014 WebContainer Ready"
              : L4(lang, { ko: "EH Code Studio Terminal v2.0 \u2014 시뮬레이션 모드", en: "EH Code Studio Terminal v2.0 \u2014 Simulated Mode" }),
            color: "green",
          },
          {
            text: instance.isAvailable
              ? L4(lang, { ko: "실제 명령 실행 가능: npm, node, git, ls, cat 등", en: "Actual commands available: npm, node, git, ls, cat, etc." })
              : L4(lang, { ko: "시뮬레이션 모드 \u2014 내장 명령 사용 가능 (type 'help')", en: "Simulated mode \u2014 built-in commands available (type 'help')" }),
            color: instance.isAvailable ? "green" : "yellow",
          },
          { text: "" },
        ]);
      } catch (err) {
        if (cancelled) return;
        setLines([
          { text: "EH Code Studio Terminal v2.0", color: "green" },
          {
            text: L4(lang, { ko: `WebContainer 부팅 실패: ${(err as Error).message}`, en: `WebContainer boot failed: ${(err as Error).message}` }),
            color: "red",
          },
          {
            text: L4(lang, { ko: "내장 명령으로 대체합니다 (type 'help')", en: "Fallback to built-in commands (type 'help')" }),
            color: "yellow",
          },
          { text: "" },
        ]);
      } finally {
        if (!cancelled) setWcBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    if (!scrollLock) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [lines, scrollLock]);

  // Highlight input on change
  useEffect(() => {
    setInputHighlight(highlightInput(input, shellEnv));
  }, [input]);

  // IDENTITY_SEAL: PART-4 | role=component state+effects | inputs=Props | outputs=React state

  // ============================================================
  // PART 5 — Command Handler
  // ============================================================

  const resetInput = useCallback((cmd: string) => {
    shellHistory.push(cmd, shellEnv.getCwd());
    setHistory((prev) => [...prev.slice(-50), cmd]);
    setHistoryIdx(-1);
    setInput("");
    setAutocompleteOptions([]);
    setAutocompleteIdx(-1);
  }, []);

  const handleCommand = useCallback(async () => {
    let cmd = input.trim();
    if (!cmd) return;

    const processed = preprocessCommand(cmd, shellEnv);
    if (processed.segments.length > 0 && processed.segments[0].command) {
      cmd = processed.segments
        .map((s) => [s.command, ...s.args].join(" "))
        .join(" | ");
    }

    const firstWord = cmd.split(/\s+/)[0].toLowerCase();
    if (COMMAND_ALIASES[firstWord]) {
      cmd = COMMAND_ALIASES[firstWord] + cmd.slice(firstWord.length);
    }

    if (firstWord === "clear") {
      resetInput(cmd);
      setLines([]);
      return;
    }

    if (firstWord === "aliases") {
      resetInput(cmd);
      setLines((prev) => [
        ...prev,
        { text: `$ ${cmd}`, color: "blue", isCommand: true, rawCommand: cmd },
        { text: "Command Aliases:", color: "green" },
        ...Object.entries(COMMAND_ALIASES).map(([k, v]) => ({
          text: `  ${k} \u2192 ${v}`,
          color: "yellow" as string,
        })),
        { text: "" },
      ]);
      return;
    }

    // When WebContainer is available: route local commands to emulator, rest to WC
    if (wcInstance?.isAvailable) {
      const isLocal = LOCAL_ONLY_CMDS.has(firstWord);

      if (isLocal) {
        const seg = processed.segments[0];
        if (seg) {
          const br = executeBuiltin(
            seg.command,
            seg.args,
            shellEnv,
            shellHistory,
            shellJobs,
            files,
          );
          if (br !== null) {
            resetInput(cmd);
            setLines((prev) => [
              ...prev,
              {
                text: `${shellEnv.buildPrompt()}${cmd}`,
                color: "blue",
                isCommand: true,
                rawCommand: cmd,
              },
              ...br.output.map((l) => ({ text: l.text, color: l.color })),
              { text: "" },
            ]);
            setCwd(shellEnv.getCwd());
            return;
          }
        }
      }

      resetInput(cmd);
      const cmdStart = performance.now();
      setLines((prev) => [
        ...prev,
        { text: `$ ${cmd}`, color: "blue", isCommand: true, rawCommand: cmd },
      ]);

      if (cmd.startsWith("cd ")) {
        const target = cmd.slice(3).trim();
        if (target === "..")
          setCwd((prev) => prev.split("/").slice(0, -1).join("/") || "~");
        else if (target.startsWith("/")) setCwd(target);
        else setCwd((prev) => `${prev}/${target}`);
      }

      try {
        const result = await wcInstance.run(cmd);
        const elapsed = Math.round(performance.now() - cmdStart);
        const newLines: TermLine[] = [];
        if (result.stdout)
          newLines.push({ text: result.stdout, color: "green" });
        if (result.stderr) newLines.push({ text: result.stderr, color: "red" });

        if (result.exitCode !== 0) {
          newLines.push({
            text: `Exit code: ${result.exitCode} (${elapsed}ms)`,
            color: "red",
            executionTime: elapsed,
          });
          // AI error analysis
          setLines((prev) => [...prev, ...newLines]);
          setLines((prev) => [
            ...prev,
            { text: L4(lang, { ko: "[AI 분석 중\u2026]", en: "[AI analysis in progress\u2026]" }), color: "blue" },
          ]);
          const analysis = await analyzeErrorWithAI(
            cmd,
            result.stderr,
            result.exitCode,
            lang
          );
          if (analysis) {
            setLines((prev) => [
              ...prev,
              { text: `[AI] ${analysis.summary}`, color: "blue" },
              { text: `[AI] ${L4(lang, { ko: "제안", en: "Suggestion" })}: ${analysis.suggestion}`, color: "blue" },
              { text: "" },
            ]);
          } else {
            setLines((prev) => [...prev, { text: "" }]);
          }
        } else {
          newLines.push({
            text: `Done (${elapsed}ms)`,
            color: "green",
            executionTime: elapsed,
          });
          newLines.push({ text: "" });
          setLines((prev) => [...prev, ...newLines]);
        }
      } catch (err) {
        setLines((prev) => [
          ...prev,
          { text: `Error: ${(err as Error).message}`, color: "red" },
          { text: "" },
        ]);
      }
      return;
    }

    // WC not ready or simulated: full emulation fallback
    const seg = processed.segments[0];
    if (seg) {
      const builtinResult = executeBuiltin(
        seg.command,
        seg.args,
        shellEnv,
        shellHistory,
        shellJobs,
        files,
      );
      if (builtinResult !== null) {
        resetInput(cmd);
        setLines((prev) => [
          ...prev,
          {
            text: `${shellEnv.buildPrompt()}${cmd}`,
            color: "blue",
            isCommand: true,
            rawCommand: cmd,
          },
          ...builtinResult.output.map((l) => ({ text: l.text, color: l.color })),
          { text: "" },
        ]);
        setCwd(shellEnv.getCwd());
        return;
      }
    }

    resetInput(cmd);
    const cmdStart = performance.now();
    setLines((prev) => [
      ...prev,
      { text: `$ ${cmd}`, color: "blue", isCommand: true, rawCommand: cmd },
    ]);

    if (wcInstance) {
      try {
        const result = await wcInstance.run(cmd);
        const elapsed = Math.round(performance.now() - cmdStart);
        const newLines: TermLine[] = [];
        if (result.stdout)
          newLines.push({ text: result.stdout, color: "green" });
        if (result.stderr) newLines.push({ text: result.stderr, color: "red" });
        newLines.push({
          text: `Done (${elapsed}ms)`,
          color: result.exitCode === 0 ? "green" : "red",
        });
        newLines.push({ text: "" });
        setLines((prev) => [...prev, ...newLines]);
        return;
      } catch {
        /* fall through to executeCommand */
      }
    }

    const ctx: CommandContext = {
      files,
      onRunPipeline: onRunPipeline
        ? onRunPipeline
        : (fileName) => {
            setLines((prev) => [
              ...prev,
              { text: `[CSL] Pipeline: ${fileName}`, color: "green" },
            ]);
          },
      onAskAI: onAskAI
        ? onAskAI
        : (prompt) => {
            setLines((prev) => [
              ...prev,
              { text: `[AI] ${prompt}`, color: "blue" },
            ]);
          },
    };

    const result = await executeCommand(cmd, ctx);
    const elapsed = Math.round(performance.now() - cmdStart);
    setLines((prev) => [
      ...prev,
      ...result.lines,
      { text: `Done (${elapsed}ms)`, color: "green" },
      { text: "" },
    ]);
  }, [input, files, wcInstance, onRunPipeline, onAskAI, resetInput, lang]);

  // IDENTITY_SEAL: PART-5 | role=command handler | inputs=input,files,wcInstance | outputs=terminal lines

  // ============================================================
  // PART 6 — Key Handler & Render
  // ============================================================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setLines([]);
      return;
    }

    if (e.key === "Enter") {
      if (autocompleteOptions.length > 0 && autocompleteIdx >= 0) {
        setInput(autocompleteOptions[autocompleteIdx]);
        setAutocompleteOptions([]);
        setAutocompleteIdx(-1);
      } else {
        handleCommand();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (autocompleteOptions.length > 0) {
        const nextIdx = (autocompleteIdx + 1) % autocompleteOptions.length;
        setAutocompleteIdx(nextIdx);
        setInput(autocompleteOptions[nextIdx]);
      } else if (input.trim()) {
        const smart = getAutocompleteSuggestions({
          input,
          cursorPos: input.length,
          files,
          env: shellEnv,
          history: shellHistory,
        });
        if (smart.length > 0) {
          const all = smart.map((s) => s.value);
          if (all.length === 1) {
            setInput(all[0]);
          } else {
            setAutocompleteOptions(all.slice(0, 8));
            setAutocompleteIdx(0);
            setInput(all[0]);
          }
        }
      }
    } else if (e.key === "Escape") {
      setAutocompleteOptions([]);
      setAutocompleteIdx(-1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (autocompleteOptions.length > 0) {
        const next = Math.max(0, autocompleteIdx - 1);
        setAutocompleteIdx(next);
        setInput(autocompleteOptions[next]);
      } else if (history.length > 0) {
        const newIdx =
          historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (autocompleteOptions.length > 0) {
        const next = Math.min(
          autocompleteOptions.length - 1,
          autocompleteIdx + 1,
        );
        setAutocompleteIdx(next);
        setInput(autocompleteOptions[next]);
      } else if (historyIdx >= 0) {
        const newIdx = historyIdx + 1;
        if (newIdx >= history.length) {
          setHistoryIdx(-1);
          setInput("");
        } else {
          setHistoryIdx(newIdx);
          setInput(history[newIdx]);
        }
      }
    } else {
      if (autocompleteOptions.length > 0) {
        setAutocompleteOptions([]);
        setAutocompleteIdx(-1);
      }
    }
  };

  return (
    <div
      className="h-48 border-t border-white/8 bg-bg-primary flex flex-col"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-bg-secondary border-b border-white/8">
        <span className="flex items-center gap-1 text-xs text-text-secondary">
          <TerminalIcon size={12} /> {L4(lang, { ko: "터미널", en: "Terminal" })}
          {wcInstance?.isAvailable && (
            <span className="text-[9px] px-1 py-0.5 bg-green-500/15 text-green-400 rounded">
              WebContainer
            </span>
          )}
          {wcBooting && (
            <Loader2 size={10} className="animate-spin text-blue-400" />
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyOutput}
            className="p-0.5 hover:bg-white/5 rounded text-text-secondary hover:text-white"
            title={L4(lang, { ko: "출력 복사", en: "Copy output" })}
            aria-label={L4(lang, { ko: "출력 복사", en: "Copy output" })}
          >
            <Copy size={11} />
          </button>
          <button
            onClick={() => setScrollLock((v) => !v)}
            className={`p-0.5 hover:bg-white/5 rounded ${
              scrollLock
                ? "text-yellow-400"
                : "text-text-secondary hover:text-white"
            }`}
            title={L4(lang, { ko: scrollLock ? "자동 스크롤 켜기" : "스크롤 잠금", en: scrollLock ? "Enable auto-scroll" : "Lock scroll" })}
            aria-label={L4(lang, { ko: scrollLock ? "자동 스크롤 켜기" : "스크롤 잠금", en: scrollLock ? "Enable auto-scroll" : "Lock scroll" })}
          >
            {scrollLock ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
        </div>
      </div>

      {/* Output area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {lines.map((line, i) => (
          <div
            key={i}
            onClick={
              line.isCommand && line.rawCommand
                ? () => {
                    setInput(line.rawCommand!);
                    inputRef.current?.focus();
                  }
                : undefined
            }
            style={{
              color:
                line.color === "red"
                  ? "#f85149"
                  : line.color === "green"
                    ? "#3fb950"
                    : line.color === "blue"
                      ? "#58a6ff"
                      : line.color === "yellow"
                        ? "#d29922"
                        : "#e6edf3",
              cursor: line.isCommand ? "pointer" : undefined,
              borderRadius: line.isCommand ? 2 : undefined,
            }}
            className={line.isCommand ? "hover:bg-white/5" : ""}
            title={line.isCommand ? L4(lang, { ko: "클릭하여 다시 실행", en: "Click to run again" }) : undefined}
          >
            {parseAnsi(line.text).map((span, j) => (
              <span
                key={j}
                style={{
                  color: span.color,
                  fontWeight: span.bold ? "bold" : undefined,
                  fontStyle: span.italic ? "italic" : undefined,
                  textDecoration: span.underline ? "underline" : undefined,
                  opacity: span.dim ? 0.6 : undefined,
                }}
              >
                {span.text}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Autocomplete dropdown */}
      {autocompleteOptions.length > 1 && (
        <div className="px-2 pb-1">
          <div className="flex flex-wrap gap-1">
            {autocompleteOptions.map((opt, i) => (
              <button
                key={opt}
                onClick={() => {
                  setInput(opt);
                  setAutocompleteOptions([]);
                  setAutocompleteIdx(-1);
                  inputRef.current?.focus();
                }}
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  i === autocompleteIdx
                    ? "bg-blue-500/30 text-blue-400"
                    : "bg-white/5 text-text-secondary"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CWD display */}
      <div className="px-2 text-[9px] text-text-tertiary font-mono opacity-60">
        {cwd}
      </div>

      {/* Input line */}
      <div className="flex items-center px-2 pb-2">
        <span className="text-xs text-green-400 font-mono mr-1">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-xs font-mono text-green-400 outline-none placeholder:text-white/60"
          placeholder={
            wcBooting
              ? L4(lang, { ko: "부팅 중\u2026", en: "Booting\u2026" })
              : L4(lang, { ko: "명령어 입력... (Tab: 자동완성, Ctrl+L: 화면 지우기)", en: "command... (Tab: autocomplete, Ctrl+L: clear)" })
          }
          disabled={wcBooting}
          autoFocus
          aria-label={L4(lang, { ko: "터미널 명령 입력", en: "Terminal command input" })}
        />
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=key handler+render | inputs=user events | outputs=JSX terminal UI
