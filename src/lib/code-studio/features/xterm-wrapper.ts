// ============================================================
// Code Studio — xterm.js Wrapper (stub for when xterm is installed)
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

export interface XTermConfig {
  fontSize: number;
  fontFamily: string;
  theme: XTermTheme;
  cursorBlink: boolean;
  scrollback: number;
  rows: number;
  cols: number;
}

export interface XTermTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
}

export interface XTermInstance {
  write(data: string): void;
  writeln(data: string): void;
  clear(): void;
  reset(): void;
  focus(): void;
  blur(): void;
  resize(cols: number, rows: number): void;
  onData(cb: (data: string) => void): void;
  onResize(cb: (size: { cols: number; rows: number }) => void): void;
  search(query: string): boolean;
  dispose(): void;
  getSelection(): string;
  selectAll(): void;
  element: HTMLElement | null;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=XTermConfig,XTermInstance

// ============================================================
// PART 2 — Default Themes
// ============================================================

export const DARK_THEME: XTermTheme = {
  background: '#1a1a2e',
  foreground: '#e0e0e0',
  cursor: '#60a5fa',
  cursorAccent: '#1a1a2e',
  selectionBackground: '#3b82f640',
  black: '#1a1a2e',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#e0e0e0',
};

export const LIGHT_THEME: XTermTheme = {
  background: '#ffffff',
  foreground: '#1f2937',
  cursor: '#3b82f6',
  cursorAccent: '#ffffff',
  selectionBackground: '#3b82f640',
  black: '#1f2937',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#f9fafb',
};

export const DEFAULT_CONFIG: XTermConfig = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
  theme: DARK_THEME,
  cursorBlink: true,
  scrollback: 5000,
  rows: 24,
  cols: 80,
};

// IDENTITY_SEAL: PART-2 | role=themes | inputs=none | outputs=XTermTheme,XTermConfig

// ============================================================
// PART 3 — Terminal Factory (stub)
// ============================================================

/**
 * Creates an xterm.js terminal instance.
 * This is a stub that provides the interface; when xterm.js is installed,
 * replace with real Terminal instantiation.
 */
export async function createXTerminal(
  container: HTMLElement,
  config: Partial<XTermConfig> = {},
): Promise<XTermInstance> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Try dynamic import of xterm
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xterm = await (Function('m', 'return import(m)')('xterm') as Promise<any>);
    const Terminal = xterm.Terminal;
    const term = new Terminal({
      fontSize: cfg.fontSize,
      fontFamily: cfg.fontFamily,
      theme: cfg.theme,
      cursorBlink: cfg.cursorBlink,
      scrollback: cfg.scrollback,
      rows: cfg.rows,
      cols: cfg.cols,
    });
    term.open(container);

    return {
      write: (d: string) => term.write(d),
      writeln: (d: string) => term.writeln(d),
      clear: () => term.clear(),
      reset: () => term.reset(),
      focus: () => term.focus(),
      blur: () => term.blur(),
      resize: (c: number, r: number) => term.resize(c, r),
      onData: (cb: (data: string) => void) => term.onData(cb),
      onResize: (cb: (size: { cols: number; rows: number }) => void) => term.onResize(cb),
      search: (_q: string) => false, // Requires @xterm/addon-search
      dispose: () => term.dispose(),
      getSelection: () => term.getSelection() ?? '',
      selectAll: () => term.selectAll(),
      element: container,
    };
  } catch {
    // Fallback: simple DOM-based terminal stub
    return createFallbackTerminal(container, cfg);
  }
}

// IDENTITY_SEAL: PART-3 | role=factory | inputs=HTMLElement,config | outputs=XTermInstance

// ============================================================
// PART 4 — Fallback Terminal
// ============================================================

function createFallbackTerminal(
  container: HTMLElement,
  cfg: XTermConfig,
): XTermInstance {
  const output = document.createElement('div');
  output.style.cssText = `
    background: ${cfg.theme.background}; color: ${cfg.theme.foreground};
    font-family: ${cfg.fontFamily}; font-size: ${cfg.fontSize}px;
    padding: 8px; overflow-y: auto; height: 100%; white-space: pre-wrap;
    word-break: break-all;
  `;
  container.appendChild(output);

  const dataListeners: Array<(data: string) => void> = [];
  const resizeListeners: Array<(size: { cols: number; rows: number }) => void> = [];

  function appendText(text: string): void {
    const span = document.createElement('span');
    span.textContent = text;
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
  }

  return {
    write: (data) => appendText(data),
    writeln: (data) => appendText(data + '\n'),
    clear: () => { output.innerHTML = ''; }, /* audit:safe — clearing own DOM node, no user input */
    reset: () => { output.innerHTML = ''; }, /* audit:safe — clearing own DOM node, no user input */
    focus: () => output.focus(),
    blur: () => output.blur(),
    resize: (cols, rows) => {
      resizeListeners.forEach((cb) => cb({ cols, rows }));
    },
    onData: (cb) => { dataListeners.push(cb); },
    onResize: (cb) => { resizeListeners.push(cb); },
    search: (_q) => false,
    dispose: () => { container.removeChild(output); },
    getSelection: () => window.getSelection()?.toString() ?? '',
    selectAll: () => {
      const range = document.createRange();
      range.selectNodeContents(output);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    },
    element: container,
  };
}

// IDENTITY_SEAL: PART-4 | role=fallback | inputs=HTMLElement | outputs=XTermInstance
