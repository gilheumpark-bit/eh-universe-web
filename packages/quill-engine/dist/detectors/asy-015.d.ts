import { RuleDetector } from '../registry';
/**
 * Phase / Rule Category: async
 * 서로 다른 async 함수에서 동일 식별자에 대입 (공유 가변 상태 + await 사이 레이스 가능성)
 */
export declare const asy015Detector: RuleDetector;
