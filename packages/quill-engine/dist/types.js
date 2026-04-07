// ============================================================
// Code Studio — Core Types
// ============================================================
/** 기본 설정 */
export const DEFAULT_SETTINGS = {
    theme: 'dark',
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on',
    minimap: false,
};
/** 파일 확장자 → Monaco 언어 매핑 */
export function detectLanguage(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const map = {
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
/** 파일 확장자 → 아이콘 색상 */
export function fileIconColor(filename) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const map = {
        ts: 'text-blue-400', tsx: 'text-blue-400',
        js: 'text-yellow-400', jsx: 'text-yellow-400',
        py: 'text-green-400', rs: 'text-orange-400', go: 'text-cyan-400',
        html: 'text-red-400', css: 'text-purple-400', scss: 'text-pink-400',
        json: 'text-amber-400', md: 'text-gray-400', yaml: 'text-red-300', yml: 'text-red-300',
        sh: 'text-green-300', sql: 'text-blue-300',
        c: 'text-blue-500', cpp: 'text-blue-500', h: 'text-blue-500',
        java: 'text-red-500', kt: 'text-purple-500', swift: 'text-orange-500',
        xml: 'text-orange-300', svg: 'text-yellow-300', toml: 'text-gray-300',
    };
    return map[ext] ?? 'text-text-tertiary';
}
// IDENTITY_SEAL: role=CodeStudioTypes | inputs=none | outputs=FileNode,OpenFile,CodeStudioSettings
