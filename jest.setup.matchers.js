// [2026-05-10] @testing-library/jest-dom matchers — setupFilesAfterEach 시점에 등록.
// setupFiles 시점에는 jest 의 expect global 이 미정의 → require 실패.
// setupFilesAfterEach 는 jest 환경 후 매 테스트 파일마다 실행되어 expect.extend 안전.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@testing-library/jest-dom');
