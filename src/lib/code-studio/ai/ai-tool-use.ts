// ============================================================
// Code Studio — AI Tool Use Framework
// ============================================================

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types & Tool Definitions
// ============================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required: string[];
  };
  requiresApproval: boolean;
}

interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  enum?: string[];
  items?: { type: string };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
  success: boolean;
  error?: string;
}

export interface ToolApprovalRequest {
  toolCall: ToolCall;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface ToolExecutionContext {
  files: FileNode[];
  activeFile?: { id: string; name: string; content: string } | null;
  updateFileContent: (id: string, content: string) => void;
  createFile: (name: string, content: string) => void;
  deleteFile: (id: string) => void;
  runCommand?: (cmd: string) => Promise<string>;
  onApprovalRequest?: (req: ToolApprovalRequest) => Promise<boolean>;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ToolDefinition,ToolCall,ToolResult

// ============================================================
// PART 2 — Tool Registry
// ============================================================

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'readFile',
    description: 'Read the contents of a file in the project',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
      },
      required: ['path'],
    },
    requiresApproval: false,
  },
  {
    name: 'editFile',
    description: 'Edit a file by replacing content between start and end lines',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        startLine: { type: 'number', description: 'Start line (1-based)' },
        endLine: { type: 'number', description: 'End line (1-based, inclusive)' },
        newContent: { type: 'string', description: 'Replacement content' },
      },
      required: ['path', 'startLine', 'endLine', 'newContent'],
    },
    requiresApproval: true,
  },
  {
    name: 'createFile',
    description: 'Create a new file in the project',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['path', 'content'],
    },
    requiresApproval: true,
  },
  {
    name: 'searchFiles',
    description: 'Search for text across project files',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        regex: { type: 'boolean', description: 'Treat query as regex' },
      },
      required: ['query'],
    },
    requiresApproval: false,
  },
  {
    name: 'runTerminal',
    description: 'Run a shell command',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
      },
      required: ['command'],
    },
    requiresApproval: true,
  },
];

// IDENTITY_SEAL: PART-2 | role=registry | inputs=none | outputs=TOOL_DEFINITIONS

// ============================================================
// PART 3 — Tool Execution
// ============================================================

function flattenFiles(
  nodes: FileNode[],
  prefix = '',
): Array<{ path: string; id: string; content: string }> {
  const out: Array<{ path: string; id: string; content: string }> = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file') out.push({ path: p, id: n.id, content: n.content ?? '' });
    if (n.children) out.push(...flattenFiles(n.children, p));
  }
  return out;
}

export async function executeTool(
  call: ToolCall,
  ctx: ToolExecutionContext,
): Promise<ToolResult> {
  const def = TOOL_DEFINITIONS.find((d) => d.name === call.name);
  if (!def) {
    return { toolCallId: call.id, name: call.name, result: '', success: false, error: `Unknown tool: ${call.name}` };
  }

  if (def.requiresApproval && ctx.onApprovalRequest) {
    const approved = await ctx.onApprovalRequest({
      toolCall: call,
      description: `${call.name}(${JSON.stringify(call.arguments)})`,
      risk: call.name === 'runTerminal' ? 'high' : 'medium',
    });
    if (!approved) {
      return { toolCallId: call.id, name: call.name, result: '', success: false, error: 'User denied' };
    }
  }

  try {
    const result = await executeToolInternal(call, ctx);
    return { toolCallId: call.id, name: call.name, result, success: true };
  } catch (err) {
    return {
      toolCallId: call.id,
      name: call.name,
      result: '',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function executeToolInternal(
  call: ToolCall,
  ctx: ToolExecutionContext,
): Promise<string> {
  const args = call.arguments;
  const flat = flattenFiles(ctx.files);

  switch (call.name) {
    case 'readFile': {
      const f = flat.find((x) => x.path === args.path);
      return f ? f.content : `File not found: ${args.path}`;
    }
    case 'editFile': {
      const f = flat.find((x) => x.path === args.path);
      if (!f) return `File not found: ${args.path}`;
      const lines = f.content.split('\n');
      const start = Number(args.startLine) - 1;
      const end = Number(args.endLine);
      lines.splice(start, end - start, String(args.newContent));
      ctx.updateFileContent(f.id, lines.join('\n'));
      return 'File updated';
    }
    case 'createFile': {
      ctx.createFile(String(args.path), String(args.content));
      return `Created ${args.path}`;
    }
    case 'searchFiles': {
      const q = String(args.query).toLowerCase();
      const matches = flat.filter(
        (f) => f.path.toLowerCase().includes(q) || f.content.toLowerCase().includes(q),
      );
      return matches.map((m) => m.path).join('\n') || 'No matches';
    }
    case 'runTerminal': {
      if (!ctx.runCommand) return 'Terminal not available';
      return await ctx.runCommand(String(args.command));
    }
    default:
      return `Unknown tool: ${call.name}`;
  }
}

// IDENTITY_SEAL: PART-3 | role=execution | inputs=ToolCall,ToolExecutionContext | outputs=ToolResult

// ============================================================
// PART 4 — Parse Tool Calls from AI Response
// ============================================================

export function parseToolCalls(response: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const regex = /<tool_call>\s*\{([\s\S]*?)\}\s*<\/tool_call>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(`{${match[1]}}`);
      calls.push({
        id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: parsed.name ?? '',
        arguments: parsed.arguments ?? {},
      });
    } catch {
      // skip malformed tool calls
    }
  }

  // fallback: try JSON block
  if (calls.length === 0) {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const arr = JSON.parse(jsonMatch[1]);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            calls.push({
              id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: item.name ?? '',
              arguments: item.arguments ?? {},
            });
          }
        }
      } catch {
        // skip
      }
    }
  }

  return calls;
}

// IDENTITY_SEAL: PART-4 | role=parsing | inputs=AI response string | outputs=ToolCall[]
