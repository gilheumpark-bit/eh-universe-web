declare const MAX_DIRECT_SIZE = 150000;
declare const MAX_AVG_LINE = 200;
declare const MAX_CHUNK_SIZE = 50000;
interface PreFilterChunk {
    code: string;
    startLine: number;
    label: string;
}
interface PreFilterResult {
    chunks: PreFilterChunk[];
    stripped: boolean;
    chunked: boolean;
    originalSize: number;
    processedSize: number;
}
declare function stripNoise(code: string): string;
declare function splitIntoChunks(code: string, maxChunkSize: number): PreFilterChunk[];
declare function preFilter(code: string, _filePath: string): PreFilterResult;
declare function runWithPreFilter(code: string, filePath: string, analyzer: (chunk: string) => Array<{
    line: number;
    message: string;
}>): Array<{
    line: number;
    message: string;
}>;
