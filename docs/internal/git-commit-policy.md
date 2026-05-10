# Git Commit Policy — 정직 기록 룰

> **2026-05-10 신설** — 솔로 + AI 오케스트레이션 환경에서 본인 git history 가 정직한 운영 로그 역할.
> 외부 reviewer 0이라도 6개월 후 본인이 search 가능하도록.

---

## 1. Conventional Commits — 영문 type/scope, 본문 한글 OK

상세: `CONTRIBUTING.md` Commit Message Convention.

```
<type>(<scope>): <description>

[optional body explaining WHY, not WHAT]

[optional footer for refs/tags]
```

---

## 2. 격리 §1 위반 시 — 정직 표기 룰

**격리 §1**: 8 절대 금지 파일 0byte 변경 (studio-types / save-engine / ManuscriptView / OriginBadge / origin-migration / AuditExportButton / markdown-serializer / project-serializer / useOriginTracker).

위반 발생 시 commit body 첫 줄에 명시:

```
feat(types): add 'scene-sheet' to AppTab union

§1 violation: src/lib/studio-types.ts (8 lines added).
이유: SceneSheet 별 탭 추가 — 기존 분산 mount 통합.
하위 호환: 기존 AppTab 값 유지 (extension only, no break).
변호사 검토 필요 X (도메인 enum 확장).
```

**금지**: "0byte 유지" 라고 거짓 표기. 깬 거 인정 + 사유 + 영향 범위 명시.

---

## 3. Self-induced bug 발견 — 정직 기록 룰

본인 PR 에서 도입한 회귀를 나중에 발견했을 때:

### ❌ 잘못된 표기 (자랑·외부 탓)
```
fix(token-meter): real bug 발견 + 16일 silent fail 해소
```
- "real bug" 어휘 = 외부 탓 뉘앙스
- "발견" = 자랑 톤

### ✅ 정직 표기
```
fix(token-meter): correct event suffix mapping (regression from 9d8a3c)

Self-induced regression. token-meter dispatchTokenPressure 가 'warn'
suffix 로 dispatch 했으나 listener 는 'warning' suffix expect.
9d8a3c (2026-04-25) 에서 도입, 16일간 silent fail.
사용자 영향: 80% token usage 토스트 미표시 (P1 → P0 격상 후 fix).
```

**핵심**:
- **Regression from <commit-sha>** — 도입 시점 명시
- **Self-induced** — 본인 책임 인정
- **사용자 영향** — 측정 가능한 형태
- **자랑 어휘 (real / discovered / 발견) X**

---

## 4. AI 오케스트레이션 흔적 — 정직 표기

본 프로젝트는 솔로 + AI 다중 에이전트 (Claude / Gemini / GPT 등) 협업.

### Co-Author 표기 정책

**Phase 2 (현재) 까지**:
```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```
정직성 우선. 외부 reviewer 0이므로 영향 X.

**Phase 3 이후 (외부 노출 시점)**:
- 채용·투자·언론 노출 시 Co-Author 표기 정책 재검토.
- 저작권·기여도·CLA 영향 분석 후 결정.
- 단순 표기 제거가 아니라 명시적 정책 변경 (commit message 에 명시).

### AI 도입 회귀 표기

AI 에이전트가 도입한 회귀는 그대로 본인 책임:
```
fix(component): correct conditional useMemo (Rules of Hooks)

ESLint react-hooks/rules-of-hooks 위반. 본 commit 작성 시
useMemo 가 early return 뒤에 호출되어 view 전환 시 hook count
mismatch 가능. ESLint 1차 검출 후 즉시 수리.

본인 (orchestrator) 가 lint 누락 — 메타 약속 위반 (CONTRIBUTING
"Edit 후 즉시 lint" 룰).
```

**핵심**: "AI 가 만든 버그" 변명 X. orchestrator 가 검증 누락.

---

## 5. 알파 출시 전 P0 격상 룰

다음 패턴은 P1 → P0 격상:

| 패턴 | 사유 |
|---|---|
| 16일 이상 silent fail (테스트 통과인데 user-facing 미작동) | 회귀 detection 안전망 부재 |
| 격리 §1 위반 (정직 표기 후) | 본인 약속 깸 — 다음 약속 신뢰도 ↓ |
| Forbidden words 위반 (4언어 byte-level) | 변호사 감수 정합성 |

P0 격상 시 commit message 에 `P1 → P0` 명시 + retroactive 안내 (사용자 노출 가능성 있을 때).

---

## 6. master push 정책

- **fast-forward only** 권장 (`git merge --ff-only`)
- **force push 금지** (master/main) — 사용자 명시 승인 시만
- **태그 보존 우선** — 브랜치 삭제 전 archive 태그
- **secret commit 금지** — `.env` / `.key` / `credential` / `service-account*` 패턴 자동 차단 (pre-commit hook 권장)

---

## 7. 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-05-10 | 신설 — 솔로 + AI 오케스트레이션 정직 기록 룰 |
