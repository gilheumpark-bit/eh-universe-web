import { RuleDetector } from '../registry';
/**
 * await in loop — 병렬화(Promise.all) 검토.
 * for await...of 는 의도적 순차 비동기 이터레이션이므로 제외.
 */
export declare const asy002Detector: RuleDetector;
