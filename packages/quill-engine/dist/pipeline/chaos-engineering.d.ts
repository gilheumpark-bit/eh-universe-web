export type FailureScenario = 'db-down' | 'api-timeout' | 'memory-leak' | 'disk-full' | 'network-partition' | 'high-load' | 'null-data' | 'auth-expired' | 'race-condition' | 'cascade-failure' | 'config-corruption' | 'data-corruption';
export interface FailureSimulation {
    scenario: FailureScenario;
    label: string;
    description: string;
    injectionPoint: string;
    line?: number;
}
export interface SimulationResult {
    scenario: FailureScenario;
    label: string;
    impact: {
        severity: 'catastrophic' | 'major' | 'minor' | 'none';
        description: string;
        affectedComponents: string[];
        dataLoss: boolean;
        recoveryTime: string;
    };
    currentHandling: {
        hasHandler: boolean;
        handlerQuality: 'good' | 'partial' | 'poor' | 'none';
    };
    recommendation: {
        priority: 'critical' | 'high' | 'medium' | 'low';
        description: string;
        pattern: string;
    };
}
export interface ChaosReport {
    overallScore: number;
    simulations: SimulationResult[];
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
}
export declare function getScenarios(): FailureSimulation[];
export declare function simulateFailure(code: string, fileName: string, scenario: FailureScenario, signal?: AbortSignal): Promise<SimulationResult>;
export declare function runChaosReport(code: string, fileName: string, scenarios?: FailureScenario[], signal?: AbortSignal): Promise<ChaosReport>;
