import { RuleDetector } from '../registry';
/**
 * TST-003: mock 미설정 외부 실제 호출
 * 테스트 파일에서 fetch/axios/http.get 등 외부 호출이 있지만
 * jest.mock/sinon.stub/nock 등 mock 설정이 없으면 보고.
 */
export declare const tst003Detector: RuleDetector;
