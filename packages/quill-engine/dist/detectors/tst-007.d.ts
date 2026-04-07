import { RuleDetector } from '../registry';
/**
 * TST-007: shared state 오염
 * 테스트 파일의 모듈 최상위에 let/var 변수를 선언하면서
 * beforeEach/afterEach 초기화가 없으면 테스트 간 상태 오염 의심.
 */
export declare const tst007Detector: RuleDetector;
