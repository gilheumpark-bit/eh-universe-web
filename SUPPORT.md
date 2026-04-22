# Getting Support

EH Universe Web (Loreguard) 사용 중 도움이 필요하시면 아래 채널을 이용해 주세요.

---

## 어디서 도움을 받나요?

| 상황 | 채널 |
|------|------|
| 🐛 **버그 발견** | [GitHub Issues — Bug Report](https://github.com/gilheumpark-bit/eh-universe-web/issues/new?template=bug_report.md) |
| ✨ **기능 제안** | [GitHub Issues — Feature Request](https://github.com/gilheumpark-bit/eh-universe-web/issues/new?template=feature_request.md) |
| 💬 **일반 질문** | [GitHub Discussions](https://github.com/gilheumpark-bit/eh-universe-web/discussions) |
| 🔒 **보안 취약점** | [SECURITY.md](SECURITY.md) — `security@eh-universe.dev` |
| 👥 **행동 강령 위반 신고** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — `gilheumpark@gmail.com` |
| 📝 **알파 작가 모집 문의** | [gilheumpark@gmail.com](mailto:gilheumpark@gmail.com) |
| ⚖️ **라이선스·상업적 이용** | [gilheumpark@gmail.com](mailto:gilheumpark@gmail.com) |

---

## 문제 신고 전에 확인할 것

### 1. 이미 알려진 이슈인지
- [열린 Issues](https://github.com/gilheumpark-bit/eh-universe-web/issues)에서 검색
- [CHANGELOG.md](CHANGELOG.md) — 최근 수정 사항 확인

### 2. 로컬 환경 기본 점검
```bash
# 브라우저 콘솔 에러 확인 (F12)
# localStorage 확인: noa_* 키 존재 여부
# 네트워크 탭: API 호출 실패 여부
```

### 3. 버그 리포트에 꼭 포함할 것
- 재현 단계 (번호 매기기)
- 브라우저 + OS 버전
- 페이지 경로 (`/studio`, `/network` 등)
- 콘솔 에러 스크린샷

---

## 자주 묻는 질문

### Q. AI 서버(DGX Spark) 응답이 느립니다
- 기본 TTFT 0.13초, 18~20 tok/s 입니다.
- BYOK 모드 (Gemini/OpenAI/Claude)로 전환 시 속도 보장.
- Settings → 고급 → "엔진 선택" 에서 전환 가능.

### Q. 원고 데이터는 어디에 저장되나요?
- 기본: `localStorage` + `IndexedDB` (로컬)
- 선택: GitHub 자동 백업 (`Octokit`, OAuth 1분 설정)
- 선택: Firestore 클라우드 동기화 (Settings → 고급)
- 상세: [/privacy](https://ehsu.app/privacy)

### Q. 라이선스는 어떻게 되나요?
- 소스코드 + 창작 콘텐츠 전체 **CC-BY-NC 4.0** (비상업적 무료)
- 상업적 이용 문의: `gilheumpark@gmail.com`

### Q. 알파 작가 모집 중이라고 들었습니다
- 브릿G 장르문학 작가 50명 얼리 액세스 멤버 모집 중
- 기간 한정 할인 + 알파 기여자 명시 + 해외 플랫폼 런칭 지원
- 직통 피드백 채널 운영
- 문의: `gilheumpark@gmail.com`

---

## 응답 시간 목표

| 유형 | 응답 목표 |
|------|-----------|
| 보안 취약점 | 48시간 이내 수신 확인 |
| P0 버그 (앱 사용 불가) | 영업일 기준 3일 이내 |
| P1 버그 (주요 기능 장애) | 영업일 기준 7일 이내 |
| P2 버그 (경미) | 다음 정기 릴리스 |
| 기능 제안 | 검토 후 로드맵 반영 여부 회신 |

단, **알파 단계 (1인 운영)** 이므로 응답이 지연될 수 있습니다. 긴급 건은 이메일 제목에 `[긴급]` 을 붙여 주세요.

---

## 기여하고 싶으신가요?

[CONTRIBUTING.md](CONTRIBUTING.md) 를 먼저 읽어 주세요. PR 환영합니다.
