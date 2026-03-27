# 운영 Runbook — NOA Studio

---

## 1. 서비스 개요

| 항목 | 값 |
|------|-----|
| URL | https://eh-universe-web.vercel.app |
| 호스팅 | Vercel (Seoul ICN1) |
| 프레임워크 | Next.js 16.2 |
| DB | Firebase Firestore |
| 인증 | Firebase Auth (Google SSO) |
| AI | 7대 프로바이더 (Gemini/OpenAI/Claude/Groq/Mistral/Ollama/LMStudio) |

---

## 2. 헬스체크

```bash
# 프로덕션
curl https://eh-universe-web.vercel.app/api/health

# 응답 예시
{
  "status": "healthy",
  "checks": { "ai_providers": "ok", "firebase": "ok" },
  "providers": { "configured": 3, "total": 5 }
}
```

| status | 의미 | 조치 |
|--------|------|------|
| healthy | 정상 | 없음 |
| degraded | 일부 프로바이더 미설정 | Vercel 환경변수 확인 |
| unhealthy | 핵심 서비스 실패 | 즉시 조사 |

---

## 3. 장애 대응

### 3-1. 사이트 전체 다운

1. Vercel 대시보드 확인 → 배포 상태
2. `vercel logs` 또는 Vercel 로그 탭에서 에러 확인
3. 최근 배포가 원인이면 → Vercel에서 이전 배포로 즉시 롤백
4. Vercel 인프라 문제면 → https://vercel-status.com 확인

### 3-2. AI 기능 오작동

1. `/api/health` 체크 → `ai_providers` 상태 확인
2. 특정 프로바이더 에러면 → 해당 프로바이더 상태 페이지 확인
   - Gemini: https://status.cloud.google.com
   - OpenAI: https://status.openai.com
   - Anthropic: https://status.anthropic.com
3. Rate Limit이면 → 사용자에게 BYOK 안내
4. 키 만료면 → Vercel 환경변수에서 갱신 후 재배포

### 3-3. Firebase/인증 장애

1. Firebase 콘솔 확인 → https://console.firebase.google.com
2. Firestore 할당량 초과 → 일일 한도 확인
3. Auth 장애 → Google Cloud 상태 확인
4. 긴급: 네트워크 탭은 Firebase 의존 → 스튜디오는 localStorage로 독립 동작

### 3-4. 빌드 실패

1. GitHub Actions CI 로그 확인
2. TypeScript 에러 → `npx tsc --noEmit` 로컬 실행
3. 테스트 실패 → `npm test` 로컬 실행
4. E2E 실패 → `npx playwright test` 로컬 실행
5. 의존성 문제 → `rm -rf node_modules && npm ci`

---

## 4. 롤백 절차

```bash
# Vercel CLI로 이전 배포 활성화
vercel rollback

# 또는 Vercel 대시보드 → Deployments → 이전 배포 → Promote to Production
```

---

## 5. 환경변수

### 필수 (Vercel Dashboard → Settings → Environment Variables)

| 변수 | 용도 | 필수 |
|------|------|------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase 클라이언트 | Y |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase Auth | Y |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Firestore | Y |
| GEMINI_API_KEY | Gemini AI (서버) | 권장 |
| OPENAI_API_KEY | OpenAI (서버) | 선택 |
| CLAUDE_API_KEY | Claude (서버) | 선택 |
| GROQ_API_KEY | Groq (서버) | 선택 |
| MISTRAL_API_KEY | Mistral (서버) | 선택 |

### 변경 시
1. Vercel 대시보드에서 값 수정
2. 재배포 트리거 (`git push` 또는 Vercel에서 Redeploy)
3. `/api/health`로 반영 확인

---

## 6. Rate Limit

| 엔드포인트 | 제한 | 윈도우 |
|-----------|------|--------|
| /api/chat | 60 req | 60초 |
| /api/image-gen | 30 req | 60초 |
| /api/analyze-chapter | 120 req | 60초 |
| /api/gemini-structured | 120 req | 60초 |
| /api/structured-generate | 120 req | 60초 |
| /api/local-proxy | 120 req | 60초 |
| /api/error-report | 60 req | 60초 |

429 응답 시 사용자에게 "잠시 후 다시 시도" 안내.
BYOK 사용자는 자체 프로바이더 한도 적용.

---

## 7. 데이터 백업

| 데이터 | 저장소 | 백업 |
|--------|--------|------|
| 소설/세션 | localStorage + IndexedDB | 자동 (브라우저 내) |
| 네트워크 게시물 | Firestore | Firebase 자동 백업 |
| API 키 | localStorage (XOR+Base64) | 사용자 관리 |

### 수동 백업
- 스튜디오 → 사이드바 → 내보내기 → Backup (JSON)
- Google Drive 백업 (Google 로그인 시)

---

## 8. 모니터링 대시보드

| 도구 | URL | 용도 |
|------|-----|------|
| Vercel Analytics | Vercel 대시보드 | Web Vitals, 트래픽 |
| Vercel Logs | Vercel 대시보드 → Logs | API 요청 로그 |
| Firebase Console | console.firebase.google.com | Firestore 사용량 |
| GitHub Actions | repo → Actions 탭 | CI 상태 |
