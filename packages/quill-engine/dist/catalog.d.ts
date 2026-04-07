export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type Engine = 'regex' | 'ast' | 'symbol' | 'cfg' | 'metric';
export type Source = 'ai' | 'human' | 'both';
export type Action = 'hard-fail' | 'review' | 'hint';
export interface RuleMeta {
    id: string;
    title: string;
    category: string;
    severity: Severity;
    confidence: Confidence;
    engine: Engine;
    source: Source;
    defaultAction: Action;
    cwe?: string;
    owasp?: string;
}
export declare const RULE_CATALOG: RuleMeta[];
export declare function getRule(id: string): RuleMeta | undefined;
export declare function getRulesByCategory(category: string): RuleMeta[];
export declare function getRulesByEngine(engine: Engine): RuleMeta[];
export declare function getRulesByAction(action: Action): RuleMeta[];
export declare function getHardFailRules(): RuleMeta[];
export declare function getAISpecificRules(): RuleMeta[];
export declare function getCatalogStats(): {
    total: number;
    categories: number;
    byAction: {
        'hard-fail': number;
        review: number;
        hint: number;
    };
    byEngine: {
        regex: number;
        ast: number;
        symbol: number;
        cfg: number;
        metric: number;
    };
    aiSpecific: number;
    withCWE: number;
};
