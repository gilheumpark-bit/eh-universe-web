// ============================================================
// Next.js Middleware — proxy.ts 보안 헤더 연결
// ============================================================
// 이 파일은 proxy.ts의 CSP 및 보안 헤더를 실제 요청에 적용합니다.
// proxy.ts를 직접 수정하세요. 이 파일은 진입점 역할만 합니다.

import { proxy, config as proxyConfig } from './proxy';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = proxyConfig;
