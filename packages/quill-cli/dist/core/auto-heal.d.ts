export interface HealResult {
    originalCode: string;
    finalCode: string;
    rounds: number;
    healed: boolean;
    fixes: Array<{
        round: number;
        error: string;
        fix: string;
        success: boolean;
    }>;
    fuzzResults: Array<{
        input: string;
        crashed: boolean;
        error?: string;
    }>;
    finalScore: number;
}
export declare function runAutoHeal(code: string, functionName: string, onProgress?: (round: number, status: string) => void): Promise<HealResult>;
export declare function healFile(code: string, fileName: string, onProgress?: (func: string, round: number, status: string) => void): Promise<{
    functions: Array<{
        name: string;
        result: HealResult;
    }>;
    overallScore: number;
    totalFixes: number;
}>;
