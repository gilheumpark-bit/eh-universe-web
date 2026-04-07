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
export declare const DEFAULT_SETTINGS: CodeStudioSettings;
/** 파일 확장자 → Monaco 언어 매핑 */
export declare function detectLanguage(filename: string): string;
/** 파일 확장자 → 아이콘 색상 */
export declare function fileIconColor(filename: string): string;
