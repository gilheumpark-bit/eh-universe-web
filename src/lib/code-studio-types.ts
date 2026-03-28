// ============================================================
// Code Studio — Core Types
// ============================================================

/** 파일 트리 노드 */
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
}

/** 열린 파일 탭 */
export interface OpenFile {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

/** IDE 설정 */
export interface CodeStudioSettings {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  wordWrap: 'on' | 'off';
  minimap: boolean;
}

/** 기본 설정 */
export const DEFAULT_SETTINGS: CodeStudioSettings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
};

/** 파일 확장자 → Monaco 언어 매핑 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescriptreact',
    js: 'javascript', jsx: 'javascriptreact',
    py: 'python', rs: 'rust', go: 'go',
    html: 'html', css: 'css', scss: 'scss',
    json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
    sh: 'shell', bash: 'shell',
    sql: 'sql', graphql: 'graphql',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    java: 'java', kt: 'kotlin', swift: 'swift',
    xml: 'xml', svg: 'xml', toml: 'toml',
  };
  return map[ext] ?? 'plaintext';
}

// IDENTITY_SEAL: role=CodeStudioTypes | inputs=none | outputs=FileNode,OpenFile,CodeStudioSettings
