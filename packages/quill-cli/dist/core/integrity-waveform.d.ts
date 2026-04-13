export interface WaveformPoint {
    file: string;
    findings: number;
    zScore: number;
    status: 'normal' | 'elevated' | 'anomaly';
}
export interface WaveformAnalysis {
    mean: number;
    stdDev: number;
    threshold: number;
    points: WaveformPoint[];
    anomalies: WaveformPoint[];
    totalFindings: number;
    adjustedFindings: number;
}
export declare function analyzeWaveform(fileFindings: Array<{
    file: string;
    findings: number;
}>): WaveformAnalysis;
/**
 * anomaly 파일의 findings를 verdict 집계에서 제외하거나 downgrade.
 * "한 파일의 오탐 폭발이 전체 프로젝트 verdict를 오염시키지 않는다."
 */
export declare function adjustForAnomalies(allDetails: Array<{
    line: number;
    message: string;
    severity: string;
    file?: string;
}>, anomalyFiles: Set<string>): {
    adjusted: typeof allDetails;
    removedCount: number;
};
