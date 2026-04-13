export type IsoQuality = 'Maintainability' | 'Reliability' | 'Security' | 'Performance';
export type GoodSignal = 'boost' | 'suppress-fp' | 'neutral';
export type GoodEngine = 'regex' | 'ast' | 'symbol' | 'cfg' | 'metric';
export interface GoodPatternMeta {
    id: string;
    title: string;
    quality: IsoQuality;
    signal: GoodSignal;
    engine: GoodEngine;
    source: 'ai' | 'human' | 'both';
    confidence: 'high' | 'medium' | 'low';
    suppresses?: string[];
}
export declare const GOOD_PATTERN_CATALOG: GoodPatternMeta[];
export declare function getGoodPattern(id: string): GoodPatternMeta | undefined;
/** 불량 ruleId를 억제하는 양품 패턴 목록 */
export declare function getSuppressorsFor(badRuleId: string): GoodPatternMeta[];
/** 양품 카탈로그 통계 */
export declare function getGoodCatalogStats(): {
    total: number;
    boost: number;
    suppressFP: number;
    neutral: number;
    totalSuppressions: number;
};
