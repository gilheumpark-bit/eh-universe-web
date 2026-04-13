/**
 * mcp-tool-bridge.ts — Bridge between AI chat and MCP tool calling
 *
 * Implements a tool-use loop: AI requests tools → execute via MCP → return results → AI continues.
 */

import { streamChat } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers/types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface MCPToolRef {
  serverId: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCallEntry {
  toolName: string;
  serverId: string;
  args: Record<string, unknown>;
  result: string;
  isError: boolean;
  durationMs: number;
}

// ============================================================
// PART 2 — Tool prompt injection
// ============================================================

export function buildToolSystemPrompt(tools: MCPToolRef[]): string {
  if (tools.length === 0) return '';

  const toolDescriptions = tools.map((t) =>
    `- ${t.name}: ${t.description}\n  Input: ${JSON.stringify(t.inputSchema)}`
  ).join('\n');

  return `
You have access to the following tools. To use a tool, respond with a JSON block in this exact format:
\`\`\`tool_use
{"tool": "<tool_name>", "args": {<arguments>}}
\`\`\`

Available tools:
${toolDescriptions}

After receiving a tool result, continue your response incorporating the result.
Only use tools when they would help answer the user's request.`;
}

// ============================================================
// PART 3 — Tool call parser
// ============================================================

interface ParsedToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export function parseToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const re = /```tool_use\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim()) as ParsedToolCall;
      if (parsed.tool && typeof parsed.tool === 'string') {
        calls.push({ tool: parsed.tool, args: parsed.args ?? {} });
      }
    } catch {
      // Malformed tool call — skip
    }
  }

  return calls;
}

// ============================================================
// PART 4 — Tool execution
// ============================================================

async function executeTool(
  tools: MCPToolRef[],
  call: ParsedToolCall,
): Promise<{ result: string; isError: boolean; durationMs: number; serverId: string }> {
  const t0 = performance.now();

  const toolRef = tools.find((t) => t.name === call.tool);
  if (!toolRef) {
    return {
      result: `Tool "${call.tool}" not found. Available: ${tools.map(t => t.name).join(', ')}`,
      isError: true,
      durationMs: performance.now() - t0,
      serverId: '',
    };
  }

  if (typeof window === 'undefined' || !window.cs?.mcp) {
    return { result: 'MCP not available', isError: true, durationMs: 0, serverId: toolRef.serverId };
  }

  try {
    const res = await window.cs.mcp.callTool(toolRef.serverId, call.tool, call.args);
    return {
      result: res.content,
      isError: res.isError,
      durationMs: performance.now() - t0,
      serverId: toolRef.serverId,
    };
  } catch (err) {
    return {
      result: (err as Error).message,
      isError: true,
      durationMs: performance.now() - t0,
      serverId: toolRef.serverId,
    };
  }
}

// ============================================================
// PART 5 — Chat with tool loop
// ============================================================

export interface ChatWithToolsOptions {
  systemInstruction: string;
  messages: ChatMsg[];
  tools: MCPToolRef[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
  onToolCall?: (entry: ToolCallEntry) => void;
  maxToolRounds?: number;
}

export async function chatWithTools(opts: ChatWithToolsOptions): Promise<{
  finalResponse: string;
  toolCalls: ToolCallEntry[];
}> {
  const { tools, maxToolRounds = 5, onChunk, onToolCall, signal } = opts;
  const toolCalls: ToolCallEntry[] = [];
  const toolPrompt = buildToolSystemPrompt(tools);
  const fullSystem = `${opts.systemInstruction}\n\n${toolPrompt}`;

  let messages = [...opts.messages];
  let finalResponse = '';

  for (let round = 0; round < maxToolRounds; round++) {
    let accumulated = '';

    await streamChat({
      systemInstruction: fullSystem,
      messages,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      signal,
      onChunk: (chunk) => {
        accumulated += chunk;
        onChunk?.(chunk);
      },
    });

    // Check for tool calls in response
    const calls = parseToolCalls(accumulated);

    if (calls.length === 0) {
      // No tool calls — final response
      finalResponse = accumulated;
      break;
    }

    // Execute all tool calls
    for (const call of calls) {
      const result = await executeTool(tools, call);
      const entry: ToolCallEntry = {
        toolName: call.tool,
        serverId: result.serverId,
        args: call.args,
        result: result.result,
        isError: result.isError,
        durationMs: result.durationMs,
      };
      toolCalls.push(entry);
      onToolCall?.(entry);
    }

    // Append assistant response + tool results to message history
    messages = [
      ...messages,
      { role: 'assistant' as const, content: accumulated },
      {
        role: 'user' as const,
        content: `Tool results:\n${toolCalls.slice(-calls.length).map((tc) =>
          `[${tc.toolName}] ${tc.isError ? 'ERROR: ' : ''}${tc.result}`
        ).join('\n\n')}`,
      },
    ];
  }

  return { finalResponse, toolCalls };
}
