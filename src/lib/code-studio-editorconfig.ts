// ============================================================
// Code Studio — EditorConfig Support
// ============================================================

export interface EditorConfigRules {
  indentStyle: 'space' | 'tab';
  indentSize: number;
  tabWidth: number;
  endOfLine: 'lf' | 'crlf' | 'cr';
  charset: 'utf-8' | 'utf-8-bom' | 'latin1';
  trimTrailingWhitespace: boolean;
  insertFinalNewline: boolean;
  maxLineLength?: number;
}

interface EditorConfigSection {
  glob: string;
  rules: Partial<EditorConfigRules>;
}

const DEFAULTS: EditorConfigRules = {
  indentStyle: 'space',
  indentSize: 2,
  tabWidth: 2,
  endOfLine: 'lf',
  charset: 'utf-8',
  trimTrailingWhitespace: true,
  insertFinalNewline: true,
};

/* ── Parser ── */

export function parseEditorConfig(content: string): EditorConfigSection[] {
  const sections: EditorConfigSection[] = [];
  let currentGlob = '*';
  let currentRules: Partial<EditorConfigRules> = {};

  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      if (Object.keys(currentRules).length > 0) {
        sections.push({ glob: currentGlob, rules: currentRules });
      }
      currentGlob = sectionMatch[1];
      currentRules = {};
      continue;
    }

    const kvMatch = line.match(/^([a-z_]+)\s*=\s*(.+)$/i);
    if (!kvMatch) continue;
    const key = kvMatch[1].toLowerCase();
    const val = kvMatch[2].trim().toLowerCase();

    switch (key) {
      case 'indent_style': currentRules.indentStyle = val === 'tab' ? 'tab' : 'space'; break;
      case 'indent_size': currentRules.indentSize = val === 'tab' ? 4 : parseInt(val, 10) || 2; break;
      case 'tab_width': currentRules.tabWidth = parseInt(val, 10) || 4; break;
      case 'end_of_line': currentRules.endOfLine = val as EditorConfigRules['endOfLine']; break;
      case 'charset': currentRules.charset = val as EditorConfigRules['charset']; break;
      case 'trim_trailing_whitespace': currentRules.trimTrailingWhitespace = val === 'true'; break;
      case 'insert_final_newline': currentRules.insertFinalNewline = val === 'true'; break;
      case 'max_line_length': currentRules.maxLineLength = val === 'off' ? undefined : parseInt(val, 10); break;
    }
  }

  if (Object.keys(currentRules).length > 0) {
    sections.push({ glob: currentGlob, rules: currentRules });
  }

  return sections;
}

/* ── Matching ── */

function globMatches(glob: string, filename: string): boolean {
  if (glob === '*') return true;
  if (glob.startsWith('*.')) return filename.endsWith(glob.slice(1));
  if (glob.startsWith('{') && glob.endsWith('}')) {
    const exts = glob.slice(1, -1).split(',').map((e) => e.trim());
    return exts.some((ext) => globMatches(ext, filename));
  }
  return filename === glob || filename.endsWith(`/${glob}`);
}

export function resolveRules(
  sections: EditorConfigSection[],
  filename: string,
): EditorConfigRules {
  let merged = { ...DEFAULTS };
  for (const section of sections) {
    if (globMatches(section.glob, filename)) {
      merged = { ...merged, ...section.rules };
    }
  }
  return merged;
}

/* ── Apply ── */

export function applyRules(content: string, rules: EditorConfigRules): string {
  let result = content;

  if (rules.trimTrailingWhitespace) {
    result = result.replace(/[ \t]+$/gm, '');
  }

  const eol = rules.endOfLine === 'crlf' ? '\r\n' : rules.endOfLine === 'cr' ? '\r' : '\n';
  result = result.replace(/\r\n|\r|\n/g, eol);

  if (rules.insertFinalNewline && !result.endsWith(eol)) {
    result += eol;
  }

  return result;
}

export function getDefaultRules(): EditorConfigRules {
  return { ...DEFAULTS };
}

// IDENTITY_SEAL: role=EditorConfig | inputs=.editorconfig content | outputs=EditorConfigRules
