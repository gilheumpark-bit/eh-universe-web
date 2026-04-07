import { RuleDetector } from '../registry';
/**
 * AIP-012: 불필요한 wrapper function (Unnecessary wrapper function)
 * AI creates wrapper functions that just call another function with the same arguments,
 * adding no value. e.g., function doFoo(x) { return foo(x); }
 */
export declare const aip012Detector: RuleDetector;
