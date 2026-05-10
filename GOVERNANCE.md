# Loreguard / EH Universe — Governance

> **Last updated**: 2026-05-10
> **Stage**: Alpha (single maintainer)

본 문서는 의사결정·라이선스·기여·메인테이너십 정책을 정의한다. 외부 contributor·investor·법무팀 모두 본 문서를 단일 진실로 참조.

---

## 1. Maintainer

**현재 메인테이너 (1명)**:

| 역할 | 담당자 | 연락 |
|---|---|---|
| BDFL (Benevolent Dictator For Life) | 박길흠 (Park Gilheum) | gilheumpark@gmail.com |
| Code review · merge | 박길흠 | (master push 권한 단독) |
| Security disclosures | 박길흠 | security@eh-universe.dev |
| Commercial licensing | 박길흠 | gilheumpark@gmail.com (subject `[COMMERCIAL]`) |

**확장 계획** (Phase 3 — 2026-09 이후):
- 1명 영입 (운영·커뮤니티 관리)
- 1명 영입 (법무 자문 — KR + US 1차)
- 외부 contributor 10명+ 시점에 Maintainer Council 도입

---

## 2. 의사결정 모델

| 결정 유형 | 모델 | 설명 |
|---|---|---|
| 일상 PR 머지 | BDFL | 메인테이너 단독 결정 |
| 기능 추가 | RFC + BDFL | Issue 로 RFC 제안 → 1주 토론 후 BDFL 승인 |
| 라이선스·상업 정책 변경 | BDFL + 변호사 | KIPO 특허 + AGPL/Commercial 영향 검토 후 |
| 파괴적 변경 (Breaking) | RFC + 마이그레이션 가이드 | CHANGELOG 에 BREAKING 명시 + Major bump |
| ATTESTATION 4언어 텍스트 | BDFL + 변호사 | 변경 시 변호사 재감수 + Major bump (`attestationStatementVersion`) |
| 격리 §1 (8 절대 금지 파일) | BDFL — 변경 X | studio-types / save-engine / ManuscriptView / OriginBadge / origin-migration / AuditExportButton / markdown-serializer / project-serializer / useOriginTracker |

---

## 3. 라이선스 정책

**Dual License** — `LICENSE` (AGPL-3.0-or-later) + `COMMERCIAL-LICENSE.md` (상업).

### 3.1 외부 기여자 CLA

모든 외부 PR 은 **CLA (Contributor License Agreement)** 동의 필수. 자동 검증: [cla-assistant.io](https://cla-assistant.io/).

**CLA 동의 효력**:
- 기여 코드를 dual license 둘 다로 라이선싱 가능
- BDFL 의 상업 라이선스 운영 권한 인정
- Patent grant 명시 (KIPO 출원분 포함)

CLA 미동의 PR 은 머지 X.

### 3.2 라이선스 변경 정책

라이선스를 변경하려면 다음 모두 충족:
1. BDFL 결정
2. 변호사 검토 (KR + 적용 시장 변호사)
3. RFC 30일 이상 공개
4. 기존 contributor 동의 (CLA 가 dual license 권리 부여 — 이 조건 자동 충족)
5. Major version bump

**비취소 영역** (변경 불가):
- 커밋 `414fe9ea` 이전 릴리스 = CC-BY-NC-4.0 영구 (CC 비취소 원칙).
- 그 이후 = AGPL-3.0-or-later / Commercial dual.

---

## 4. 기여 정책

| 단계 | 절차 |
|---|---|
| 1. 이슈 등록 | `.github/ISSUE_TEMPLATE/` 사용 |
| 2. RFC (큰 기능) | docs/rfc/<n>-<title>.md 또는 long-form Issue |
| 3. 브랜치 | master 에서 short-lived `fix/...` 또는 `feat/...` |
| 4. PR | `.github/pull_request_template.md` 사용 — TypeScript / ESLint / Test 통과 필수 |
| 5. CLA 서명 | cla-assistant.io 자동 검증 |
| 6. Code review | BDFL 단독 (Phase 1) |
| 7. Merge | Squash + linear history (rebase 권장) |

자세한 내용: [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 5. 코드 품질 게이트 (자동)

PR 머지 전 **모든** 게이트 통과 필수:

| 게이트 | 명령 | 통과 기준 |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 errors (strict) |
| ESLint | `npx eslint src/` | exit=0 (0 ERROR / 0 WARNING) |
| Jest | `npx jest` | 100% pass |
| Lighthouse A11y | (수동, monthly) | 100/100 × 5 페이지 |
| 격리 §1 | `git diff --name-only` | 8 절대 금지 파일 0byte |
| 4언어 byte-level | `grep -F "<text>" <file>` | LIMITATION/ATTESTATION 4언어 매치 |

---

## 6. 보안 (Security Disclosure)

자세한 내용: [SECURITY.md](SECURITY.md).

| 항목 | 정책 |
|---|---|
| 채널 | security@eh-universe.dev |
| Acknowledgment | 48시간 내 |
| Initial assessment | 5 영업일 내 |
| 패치 | severity 별 SLA (P0: 24시간 / P1: 7일 / P2: 30일) |
| Disclosure | coordinated (90일) |

---

## 7. 데이터 / 작가 작품 정책

**작가 데이터 = 작가 소유**. Loreguard 는 처리만.

| 데이터 | 저장 | 보존 | 삭제 |
|---|---|---|---|
| 작가 본문 (manuscript) | localStorage + IndexedDB + 작가 GitHub | 작가 결정 | 작가 액션 즉시 |
| 창작 과정 이벤트 (CreativeEvent) | IndexedDB (`loreguard_creative_process`) | 1년 default + 작가 명시 보관 | append-only / delete event 표기만 |
| 발급 인증서 (ProcessCertificate) | IndexedDB | 1년 default | append-only |
| AI 호출 로그 | 일시 메모리 + Sentry (Phase 2) | 30일 | 자동 |

**알파 단계 데이터 책임**: 작가 본인.
**베타 이후**: 자동 백업 + 1년 보존 + 작가 export 기능.

---

## 8. KIPO 특허 (10-2026-0038027)

**대상**:
- ARCS (AI Response Control System) 엔진
- IP Guard L1-L5 5계층 방어
- Compliance 7-axis scoring

**라이선스 grant**:
- AGPL 수령자: AGPL-3.0 §11 patent retaliation 적용 (no explicit grant beyond §11)
- Commercial 수령자: 명시적 patent license + scope + defense terms (`COMMERCIAL-LICENSE.md` + 별도 commercial agreement)

특허 문의: gilheumpark@gmail.com (subject `[PATENT]`).

---

## 9. 카테고리 / 브랜드 정책

**Loreguard = "Novel IDE" 카테고리 창시자**.

브랜드명/마크 사용:
- "Loreguard", "Lore Guard", "Witness Seal", "ATTESTATION OF GENESIS", "Authorship Journal" — 등록·출원 마크 (NOTICE 참조).
- AGPL fork 시 — 브랜드명 변경 의무 (Loreguard → 다른 이름).
- Commercial 수령자 — 상업 계약에 따라 브랜드 사용 권리 별도 협상.

---

## 10. 4 제품 fork 표준

Loreguard 가 fork 표준. LearningGuard / ESVA / Code Studio (Desktop) 는 별도 repo + 별도 메인테이너 후보.

각 제품:
- 라이선스: 동일 dual license (AGPL + Commercial) 적용
- 격리 §1: 동일 8 파일 0byte 원칙
- 어휘 치환: 12 매핑 sed substitute (자동화)
- 4언어 byte-level: limitation-text / attestation 신규 작성 (도메인별)

자세한 내용: `ROADMAP.md` §4 제품 fork 표준.

---

## 11. 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-05-10 | GOVERNANCE.md 신규 — 1인 메인테이너 + 의사결정 모델 + CLA + 데이터 정책 명시 |

---

## 12. 의견 / 거버넌스 RFC

- 일반: GitHub Issues (`governance` 라벨)
- 비공개: gilheumpark@gmail.com (subject `[GOVERNANCE]`)
- 보안: security@eh-universe.dev

본 문서가 답하지 못하는 거버넌스 질문은 BDFL 결정 + 변호사 자문 + RFC 절차로 보완.
