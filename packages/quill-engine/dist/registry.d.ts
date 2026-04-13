import { SourceFile } from 'ts-morph';
export interface RuleFinding {
    line: number;
    message: string;
}
export interface RuleDetector {
    /**
     * 카탈로그 내의 ruleId (예: 'ERR-005')
     */
    ruleId: string;
    /**
     * AST(ts-morph SourceFile)를 순회하며 위반 사항을 찾는 플러그인 메커니즘
     */
    detect: (sourceFile: SourceFile) => RuleFinding[];
}
export declare class DetectorRegistry {
    private detectors;
    register(detector: RuleDetector): void;
    getDetectors(): RuleDetector[];
    getRegistryStatus(): {
        connected: number;
        registeredRules: string[];
    };
}
export declare const detectorRegistry: DetectorRegistry;
