# Nonce CSP 전용 패스 기록 — 2026-06-21

## 판정

현재 `next.config.ts`의 CSP는 기본 보안 헤더와 `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` 계열 방어를 유지한다. 다만 `script-src`와 `style-src`의 전면 nonce 전환은 이번 패스에서 코드 적용하지 않았다.

## 적용하지 않은 이유

Next.js 앱 전역 nonce는 `next.config.ts` 정적 headers만으로 안전하게 끝나지 않는다. 요청별 nonce를 만들려면 middleware 또는 서버 응답 경계에서 nonce를 생성하고, 렌더링되는 스크립트/스타일 태그에 같은 nonce를 전달해야 한다. 이 배선 없이 `'unsafe-inline'`만 제거하면 Firebase auth, Next 런타임 스크립트, 일부 인라인 스타일 경로가 깨질 수 있다.

## 현재 상태

- `unsafe-eval`은 개발 환경에만 허용한다.
- 프로덕션 CSP는 기존 헤더 정책을 유지한다.
- `/__/auth/*` 경로는 Firebase 인증 흐름 때문에 별도 CSP를 유지한다.
- 전면 nonce는 `HOLD`다.

## 다음 실행 조건

1. middleware에서 요청별 nonce를 생성한다.
2. nonce를 응답 헤더와 렌더링 컨텍스트에 전달한다.
3. Next 런타임, Firebase 인증, Translation Studio, Studio의 로그인/생성/출고 흐름을 Playwright로 재검증한다.
4. 통과 후에만 `script-src 'unsafe-inline'` 제거를 적용한다.

## 결론

이번 패스의 안전한 결과는 “정적 CSP 현상 유지 + nonce 전환 HOLD 명시”다. 보안 강화를 한 척하며 런타임을 깨는 변경은 하지 않는다.

