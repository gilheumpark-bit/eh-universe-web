# Loreguard — Ops Runbook (v2.2.0)

**대상**: 현재/향후 운영 담당. 알파~베타 단계의 1~2인 팀 기준.
**업데이트**: 2026-04-20

---

## 1. 서비스 SLA 약속

| 항목 | 알파 (현재) | 베타 목표 |
|------|------------|----------|
| 데이터 유실 RPO | **0분** (저널 엔진 + 3-Tier 백업) | 0분 |
| 복구 RTO | **5분 이내** (탭 재열기 시 자동 복구) | 1분 이내 |
| 응답 시간 p50 | 측정 전 | 500ms |
| 응답 시간 p95 | 측정 전 | 2s |
| 가용성 | Best-effort | 99.5% |

"데이터 유실 0"은 Chaos Fortress 10,000회 시뮬레이션 × 0 유실로 검증된 수치. 실사용자 1주 누적 후 재측정.

---

## 2. 장애 시나리오별 대응 (5분 이내)

### S1. Vercel 프로덕션 빌드 실패
**증상**: `master` push 후 30분 지나도 READY 상태 안 됨  
**조치**:
1. Vercel 대시보드 → 실패한 배포 → Build Logs 확인
2. 대부분 원인: npm install 충돌 / TypeScript 에러 / env 변수 누락
3. 즉시 롤백: `git revert <bad-sha> && git push origin master`
4. 이전 프로덕션 태그: `v2.2.0` (커밋 `e2d2352f`) 또는 직전 태그

### S2. 런타임 에러 폭발
**증상**: Sentry 또는 Vercel runtime logs에서 동일 에러 반복  
**조치**:
1. `https://vercel.com/gilheumpark-bits-projects/eh-universe-web` → Logs 탭
2. 에러 스택트레이스로 원인 파일 특정
3. 핫픽스 커밋 → 2~3분 내 배포
4. 심각 시 롤백: `git push origin +<previous-tag>:master`

### S3. Journal Engine 섀도우 모드 이상 동작
**증상**: 사용자 리포트 "저장이 안 됨" OR 섀도우 diff 대량 발생  
**조치**:
1. **즉시**: 플래그 off
   - `src/lib/feature-flags.ts` → `FEATURE_JOURNAL_ENGINE: 'off'`
   - 커밋 + 푸시 → 1~2분 내 전 사용자에게 적용
2. 섀도우 로그 수집: `docs/m9-audit-*` 기준으로 원인 분석
3. 수리 후 `'shadow'`로 복귀 → 1주 재검증 → `'on'` 승격

### S4. Firebase 과금 폭증
**증상**: 사용량 경고 이메일 / 월 요금 > 한도  
**조치**:
1. Firebase Console → Usage 확인 (Firestore reads / Auth / Storage)
2. 악용 의심 시: Firestore 규칙 `allow read: if false` 긴급 잠금
3. 장기 대응: `FEATURE_FIRESTORE_MIRROR` off (기본 off 상태 유지 권장)

### S5. Vertex AI / OpenAI API 크레딧 고갈
**증상**: `/api/agent-search` `/api/chat` 등이 503 또는 402 반환  
**조치**:
1. 해당 게이트 플래그 off:
   - `FEATURE_AGENT_SEARCH=off` (already default)
   - `FEATURE_STRIPE_CHECKOUT=off` (already default)
2. 사용자에게 "AI 엔진 일시 중단" 배너 (작업 예정)

### S6. DGX Spark 게이트웨이 다운
**증상**: `https://api.ehuniverse.com` 무응답 / 520 에러  
**조치**:
1. 클라이언트 자동 fallback: `streamSparkAI` → BYOK 모드 자동 전환 (M1.7에서 구현)
2. 사용자는 자신의 API 키 등록 화면에서 계속 작업 가능
3. DGX 복구 후 기본 게이트웨이로 자동 복귀

---

## 3. 일상 운영 루틴

### 매일
- [ ] Vercel runtime logs 5분 스캔 (error/fatal 레벨만)
- [ ] 프로덕션 ehsu.app 한 번 열어서 랜딩 / `/studio` / `/translation-studio` 각 30초 체감

### 매주
- [ ] 사용량 대시보드 (Vercel + Firebase + DGX) 체크
- [ ] GitHub Dependabot 알림 처리
- [ ] 주요 사용자 피드백 triage → M10 스프린트 항목으로 전환

### 매월
- [ ] `bench/chaos-fortress-10k.mjs` 재실행 → `docs/chaos-fortress-10k-report.md` 업데이트
- [ ] Lighthouse 실측 → `docs/lighthouse-report.md` 갱신
- [ ] Bundle size 측정 → `docs/bundle-report.md` 갱신 (500 KB 넘는 라우트 split 검토)

---

## 4. 핫키 커맨드 모음

```bash
# 긴급 롤백 (2초)
git push origin +v2.2.0:master    # v2.2.0 시점으로 프로덕션 강제 복귀

# 번들 경량화 측정
npm run bundle:report

# 접근성 감사 (dev)
npm run dev                        # 브라우저 콘솔에서 axe-core 리포트 자동

# Lighthouse 측정
LIGHTHOUSE_URLS=http://localhost:3000/ npm run lh:check

# M1 Fortress 무결 검증
git diff --stat eac781b3..HEAD -- src/lib/save-engine/ \
  src/hooks/useAutoSave.ts src/hooks/useRecovery.ts \
  src/hooks/useMultiTab.ts src/hooks/useBackupTiers.ts \
  src/hooks/usePrimaryWriter.ts

# Chaos 재검증
node bench/chaos-fortress-10k.mjs
```

---

## 5. 백업·복원 체계

### 자동 백업 (3-Tier)
- **Tier 1**: IndexedDB durability strict + LocalStorage fallback (사용자 기기)
- **Tier 2**: 저널 엔진 → 로컬 스냅샷 (30개 보관)
- **Tier 3**: GitHub Octokit (사용자 GitHub 레포로 선택적 동기화)

### 수동 백업
- 전체 Export: Settings → Backup → Project JSON / ZIP
- 에피소드 단위: Studio → Export → 5형식 (TXT/MD/JSON/HTML/CSV) 또는 EPUB

### 백업 복원 리허설
- 로컬: `C:/Users/sung4/OneDrive/바탕 화면/EH/backup-M1.4-2026-04-20/`
- `RESTORE.md` 참조 (시나리오 A/B/C)
- **권장**: 월 1회 시나리오 A 1회 실행 (~15분)

---

## 6. 연락·에스컬레이션

- 1차: `gilheumpark@gmail.com`
- GitHub 이슈: `gilheumpark-bit/eh-universe-web`
- 긴급 롤백 시: 위 핫키 커맨드

---

## 7. 이 문서의 한계

- **실제 사용자 로그 데이터 없음**. 모든 SLA 수치는 이론값 또는 내부 테스트 결과.
- 장애 대응 시간은 "1인 운영자가 오프라인 아닐 때" 기준. 24/7 보장 불가.
- 베타 진입 전 on-call 체계 별도 수립 필요.
