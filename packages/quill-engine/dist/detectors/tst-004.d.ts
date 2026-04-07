import { RuleDetector } from '../registry';
/**
 * TST-004: assertion 없이 resolves/rejects
 * expect(...).resolves 또는 expect(...).rejects 를 사용하면서
 * 그 뒤에 toBe/toEqual/toThrow 등 matcher가 없으면 보고.
 */
export declare const tst004Detector: RuleDetector;
