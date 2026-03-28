// ============================================================
// Code Studio — Design-to-Code Conversion
// ============================================================

import { streamChat } from '@/lib/ai-providers';

// ============================================================
// PART 1 — Types
// ============================================================

export interface DesignToken {
  name: string;
  type: 'color' | 'spacing' | 'typography' | 'radius' | 'shadow' | 'opacity';
  value: string;
  cssVariable: string;
}

export interface DesignSpec {
  tokens: DesignToken[];
  components: ComponentSpec[];
  layout?: LayoutSpec;
}

export interface ComponentSpec {
  name: string;
  description: string;
  props: Array<{ name: string; type: string; required: boolean }>;
  tokens: string[];
}

export interface LayoutSpec {
  type: 'flex' | 'grid' | 'stack';
  direction: 'row' | 'column';
  gap: string;
  padding: string;
}

export interface GeneratedCode {
  files: Array<{ path: string; content: string }>;
  cssVariables: string;
  tailwindConfig?: string;
  summary: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DesignToken,DesignSpec,GeneratedCode

// ============================================================
// PART 2 — Token Parsing
// ============================================================

export function parseDesignTokens(input: string): DesignToken[] {
  const tokens: DesignToken[] = [];
  const lines = input.split('\n').filter((l) => l.trim());

  for (const line of lines) {
    // Format: name: value (e.g., "primary: #3B82F6" or "spacing-sm: 8px")
    const match = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+)/);
    if (!match) continue;

    const name = match[1].trim();
    const value = match[2].trim();
    const type = inferTokenType(name, value);
    const cssVariable = `--${name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

    tokens.push({ name, type, value, cssVariable });
  }

  return tokens;
}

function inferTokenType(name: string, value: string): DesignToken['type'] {
  if (/color|primary|secondary|accent|bg|text-color|border-color/i.test(name) || /^#|rgb|hsl/i.test(value)) return 'color';
  if (/spacing|gap|margin|padding|size/i.test(name)) return 'spacing';
  if (/font|text|heading|body|line-height|letter/i.test(name)) return 'typography';
  if (/radius|rounded|corner/i.test(name)) return 'radius';
  if (/shadow|elevation/i.test(name)) return 'shadow';
  if (/opacity|alpha/i.test(name)) return 'opacity';
  return 'color';
}

// IDENTITY_SEAL: PART-2 | role=token parsing | inputs=string | outputs=DesignToken[]

// ============================================================
// PART 3 — CSS/Tailwind Generation
// ============================================================

export function generateCSSVariables(tokens: DesignToken[]): string {
  const vars = tokens.map((t) => `  ${t.cssVariable}: ${t.value};`).join('\n');
  return `:root {\n${vars}\n}`;
}

export function generateTailwindExtend(tokens: DesignToken[]): string {
  const colors: Record<string, string> = {};
  const spacing: Record<string, string> = {};
  const borderRadius: Record<string, string> = {};

  for (const t of tokens) {
    const key = t.name.replace(/[^a-zA-Z0-9]/g, '-');
    switch (t.type) {
      case 'color': colors[key] = `var(${t.cssVariable})`; break;
      case 'spacing': spacing[key] = t.value; break;
      case 'radius': borderRadius[key] = t.value; break;
    }
  }

  return JSON.stringify({
    theme: {
      extend: {
        colors: Object.keys(colors).length > 0 ? colors : undefined,
        spacing: Object.keys(spacing).length > 0 ? spacing : undefined,
        borderRadius: Object.keys(borderRadius).length > 0 ? borderRadius : undefined,
      },
    },
  }, null, 2);
}

// IDENTITY_SEAL: PART-3 | role=CSS/Tailwind gen | inputs=DesignToken[] | outputs=CSS,TailwindConfig

// ============================================================
// PART 4 — AI Component Scaffolding
// ============================================================

const DESIGN_SYSTEM =
  'You are a design-to-code expert. Given design tokens and a component description,\n' +
  'generate a React/TypeScript component that uses the provided CSS variables.\n' +
  'Output only the component code.';

export async function generateComponentFromSpec(
  spec: ComponentSpec,
  tokens: DesignToken[],
  signal?: AbortSignal,
): Promise<string> {
  const tokenContext = tokens.map((t) => `${t.cssVariable}: ${t.value}`).join(', ');
  let code = '';

  await streamChat({
    systemInstruction: DESIGN_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Component: ${spec.name}\nDescription: ${spec.description}\nProps: ${JSON.stringify(spec.props)}\nAvailable tokens: ${tokenContext}`,
      },
    ],
    onChunk: (t) => { code += t; },
    signal,
  });

  return code;
}

export async function designToCode(
  spec: DesignSpec,
  signal?: AbortSignal,
): Promise<GeneratedCode> {
  const cssVariables = generateCSSVariables(spec.tokens);
  const tailwindConfig = generateTailwindExtend(spec.tokens);
  const files: Array<{ path: string; content: string }> = [
    { path: 'styles/tokens.css', content: cssVariables },
  ];

  for (const comp of spec.components) {
    if (signal?.aborted) break;
    const code = await generateComponentFromSpec(comp, spec.tokens, signal);
    files.push({ path: `components/${comp.name}.tsx`, content: code });
  }

  return {
    files,
    cssVariables,
    tailwindConfig,
    summary: `Generated ${files.length} files from ${spec.tokens.length} tokens and ${spec.components.length} components`,
  };
}

// IDENTITY_SEAL: PART-4 | role=AI scaffolding | inputs=DesignSpec | outputs=GeneratedCode
