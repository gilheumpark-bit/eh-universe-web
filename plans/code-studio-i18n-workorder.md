# 코드 스튜디오 — 한국어 모드 영어 잔존 번역 작업지시서

> 생성일: 2026-03-31 | 대상: src/components/code-studio/ (77파일)
> 목표: lang === "ko" 모드일 때 모든 UI 텍스트 한국어 표시

---

## 현재 문제

코드 스튜디오의 UI 텍스트 중 상당수가 영어 하드코딩 상태:
- 상태 라벨: "Idle", "Planning", "Running", "Done", "Error"
- 역할 라벨: "Architect", "Developer", "Reviewer", "Documenter"
- 단계 라벨: "Director", "Coding", "Review", "Security", "Chaos", "Fixing", "Docs", "Commit"
- 버튼/UI: "Code View", "Diff View", "Added", "Modified", "Deleted"
- 설정: "Configured", "Not configured", "Hide Config", "Config"
- 기타: "No open files", "EXPLORER", "New Project", "Describe your project here"

## i18n 패턴

이 프로젝트의 i18n 방식:
```typescript
// 방법 1: L4() 헬퍼 (권장)
import { L4 } from '@/lib/i18n';
L4(lang, { ko: '한국어', en: 'English' })

// 방법 2: isKO 삼항 (기존 코드에 많음 — 새 코드는 L4 사용)
const isKO = lang === 'ko';
{isKO ? '한국어' : 'English'}

// 방법 3: createT() 번역 사전
import { createT } from '@/lib/i18n';
const t = createT(lang === 'ko' ? 'KO' : 'EN');
t('key.path')
```

## lang 전달 방식

코드 스튜디오에서 lang은 보통 `CodeStudioShell`에서 props로 받거나 `useLang()` 훅으로 접근:
```typescript
// CodeStudioShell.tsx에서
const { lang } = useLang(); // 또는 props.lang
```

각 하위 컴포넌트에서 lang을 props로 받지 못하는 경우:
```typescript
import { useLang } from '@/lib/LangContext';
const { lang } = useLang();
const isKO = lang === 'ko';
```

---

## 파일별 번역 대상 (우선순위순)

### Tier 1 — 메인 UI (사용자 직접 노출)

| 파일 | 영어 텍스트 | 한국어 번역 |
|------|------------|------------|
| `WelcomeScreen.tsx` | "CODE STUDIO", "코드 스튜디오" 확인 | 이미 번역됨 확인 필요 |
| `CodeStudioShell.tsx` | "No open files", "project", "README.md", "New Project", "Describe your project here" | "열린 파일 없음", "프로젝트", "새 프로젝트", "프로젝트 설명을 작성하세요" |
| `EditorTabs.tsx` | 탭 관련 영어 | 확인 필요 |
| `StatusBar.tsx` | 상태바 텍스트 | 확인 필요 |
| `FileExplorer.tsx` | "EXPLORER" | "탐색기" |

### Tier 2 — 패널 텍스트

| 파일 | 영어 텍스트 | 한국어 번역 |
|------|------------|------------|
| `AgentPanel.tsx` | Idle/Planning/Running/Paused/Done/Error | 대기/계획/실행/일시정지/완료/오류 |
| | Architect/Developer/Reviewer/Documenter | 설계자/개발자/리뷰어/문서화 |
| `AutopilotPanel.tsx` | Director/Coding/Review/Security/Chaos/Fixing/Docs/Commit | 지휘/코딩/검토/보안/카오스/수정/문서/커밋 |
| | "Hide Config" / "Config" | "설정 숨기기" / "설정" |
| `AgentDiffPreview.tsx` | "Code View" / "Diff View" / Added / Modified / Deleted | "코드 보기" / "변경 비교" / 추가 / 수정 / 삭제 |
| `AIHub.tsx` | "Configured" / "Not configured" | "설정됨" / "미설정" |
| `ComposerPanel.tsx` | 확인 필요 |
| `PipelinePanel.tsx` | 확인 필요 |
| `TerminalPanel.tsx` | 확인 필요 |
| `GitPanel.tsx` | 확인 필요 |
| `SearchPanel.tsx` | 확인 필요 |

### Tier 3 — 나머지 패널/컴포넌트 (77파일 전수)

전체 파일 목록:
```bash
find src/components/code-studio/ -name "*.tsx" ! -path "*__tests__*" | sort
```

---

## 작업 방법

### 각 파일에 대해:
1. 파일 읽기
2. 영어 하드코딩 UI 텍스트 찾기 (JSX 내 문자열)
3. `useLang` import 확인 (없으면 추가)
4. `isKO` 삼항 또는 `L4()` 적용
5. 빌드 확인

### 제외 대상 (번역 불필요)
- 프로그래밍 용어: "TypeScript", "JavaScript", "function", "class" 등
- 파일명: "README.md", "index.ts" 등
- 키보드 키: "Enter", "Escape", "Tab" 등
- CSS 클래스명, HTML 속성값
- API/기술적 식별자: "idle", "planning" (상태 ID)
- 에러 코드/로그 메시지 (개발자용)

### 번역해야 하는 것
- 사용자에게 보이는 **라벨, 버튼 텍스트, 설명문, 상태 표시**
- 모달/대화상자 텍스트
- 빈 상태 메시지
- 툴팁

---

## 검증

```bash
npm run build                    # 빌드 통과
npx eslint src/components/code-studio/ # 0 errors
```

## 주의사항

1. **lang props 확인** — 각 컴포넌트가 lang을 어떻게 받는지 먼저 확인
2. **기존 번역 중복 방지** — 이미 L4()/isKO 처리된 부분 건드리지 않기
3. **panel-registry 라벨** — `src/lib/code-studio/core/panel-registry.ts`에 패널 이름 번역이 이미 있을 수 있음
4. **console.log 금지** — `import { logger } from '@/lib/logger'` 사용
