export interface ReceiptData {
    id: string;
    timestamp: number;
    codeHash: string;
    pipeline: {
        teams: Array<{
            name: string;
            score: number;
            blocking: boolean;
            findings: number;
            passed: boolean;
        }>;
        overallScore: number;
        overallStatus: 'pass' | 'warn' | 'fail';
    };
    harness?: {
        gatesRun: number;
        gatesPassed: number;
        gateFailed?: string;
    };
    crossCheck?: {
        model: string;
        agreed: boolean;
        agreementRate: number;
        dismissed: number;
    };
    verification: {
        rounds: number;
        fixesApplied: number;
        stopReason: string;
    };
    receiptHash: string;
}
export declare function computeReceiptHash(data: Omit<ReceiptData, 'receiptHash'>): string;
export declare function verifyReceiptHash(receipt: ReceiptData, previousHash: string | null): boolean;
export declare function chainReceipt(receipt: ReceiptData): void;
export declare function getChainHead(): string | null;
export declare function formatReceipt(receipt: ReceiptData, lang?: 'ko' | 'en'): string;
export declare function toJSON(receipt: ReceiptData): string;
export declare function toSARIF(receipt: ReceiptData): object;
