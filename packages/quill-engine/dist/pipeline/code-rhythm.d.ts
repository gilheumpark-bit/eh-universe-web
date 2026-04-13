/**
 * 코드 라인 분류 (scene-parser의 BeatType에서 영감)
 * - dialogue → comment
 * - narration → logic
 * - description → type/import
 */
export type CodeLineType = 'import' | 'type' | 'logic' | 'comment' | 'blank' | 'return' | 'decorator' | 'block-boundary';
export interface ClassifiedLine {
    lineNumber: number;
    type: CodeLineType;
    text: string;
}
export interface RhythmSection {
    startLine: number;
    endLine: number;
    density: number;
    types: Record<CodeLineType, number>;
}
export interface RhythmSuggestion {
    line: number;
    message: string;
    severity: 'info' | 'warn';
}
export interface CodeRhythmResult {
    lines: ClassifiedLine[];
    sections: RhythmSection[];
    suggestions: RhythmSuggestion[];
    overallDensity: number;
    commentRatio: number;
    blankRatio: number;
}
export declare function classifyLine(text: string): CodeLineType;
export declare function analyzeCodeRhythm(code: string): CodeRhythmResult;
