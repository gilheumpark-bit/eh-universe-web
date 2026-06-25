# Loreguard Context Index & Judgment OS 정밀 설계

작성일: 2026-06-23  
상태: PROPOSED / 앱 맞춤 구현 설계  
대상 앱: Loreguard Studio, Translation Studio, 과정기록, 출고 패키지  
원본 참고: `C:\Users\sung4\Downloads\noa_context_index_judgment_os_design_v0_1.md`

## 1. 설계 판정

외부 설계 문서의 핵심 문장인 "전부 기억하지 않고, 무엇을 다시 읽을지 기억한다"는 Loreguard에 적합하다.

다만 현재 앱에 그대로 이식하지 않는다. Loreguard에는 이미 다음 기반이 있다.

- `StoryConfig`: 세계관, 캐릭터, 씬시트, 연출, 원고, 출고 설정의 단일 프로젝트 상태
- `acceptedImportCandidates`: 파일 가져오기 후 작가가 승인한 외부 자료 후보
- `worldFieldEvidence`: 세계관 필드별 근거와 ARCS 상태
- `CreativeEvent`: 과정기록 append-only 이벤트
- `CreativeDecisionContext`: 작가가 노아 제안을 선택, 폐기, 수정한 판단 맥락
- `buildWritingContextComplianceReport`: 집필 전후 기준선/7축 보조 점검
- `tab-expert-registry`: 10단계 탭별 노아 관제 프로필
- `app-brain-policy`: 적용/미리보기/보류/보호/기록 판단 정책
- `MemoPanel`: 프로젝트별 스크래치 메모 저장소

따라서 신규 시스템은 "거대한 RAG"가 아니라, 위 구조를 연결하는 Context Index 계층이다.

## 2. 제품 목표

이 설계의 제품 목표는 기억력 과시가 아니다.

작가가 흩어 놓은 메모, 불러온 자료, 노아 제안, 직접 수정, 기준선, 출고 근거를 다음 흐름으로 묶는다.

```text
입력
-> 후보화
-> 인덱싱
-> 재독
-> 노아 판단
-> 작가 승인
-> 기준선 반영
-> 과정기록
-> 출고/확인서 근거
```

사용자 표면에서는 "AI 기억", "RAG", "검색 인프라"라고 말하지 않는다.

권장 표면 표현:

- 메모 후보
- 읽은 자료
- 근거
- 다시 확인
- 노아 검토
- 작가 선택
- 과정기록

## 3. 현재 앱에 맞춘 아키텍처

```text
User Input / File Import / Memo
  -> Candidate Intake
  -> Context Index Builder
  -> Retrieval Planner
  -> Re-Reader
  -> Judgment Packet
  -> App Brain Apply Policy
  -> Author Gate
  -> StoryConfig Patch
  -> CreativeEvent Receipt
```

### 3.1 Candidate Intake

입력 출처를 하나의 후보 모델로 통일한다.

출처:

- 파일 가져오기: `acceptedImportCandidates`
- 상단/슬라이드 메모: `MemoPanel` 메모
- 노아 대화 제안: `ChatCanvasDock` 제안
- 집필 중 붙여넣기: 향후 `EXTERNAL_IMPORT` 또는 paste 후보
- 작가 직접 수정: `HUMAN_DRAFT` / `HUMAN_REVISION`

중요 원칙:

- 후보는 곧 기준선이 아니다.
- 메모는 곧 설정이 아니다.
- 노아 제안은 곧 원고가 아니다.
- 파일 내용은 곧 작품 편입이 아니다.

### 3.2 Context Index Builder

`StoryConfig`에 바로 대형 원문 인덱스를 넣지 않는다. 1차 MVP는 별도 pure module이 프로젝트 상태를 읽어 파생 인덱스를 만든다.

권장 파일:

```text
src/lib/loreguard/context-index.ts
src/lib/loreguard/context-index.types.ts
src/lib/loreguard/context-retrieval.ts
src/lib/loreguard/context-judgment.ts
```

초기 인덱스는 메모리 계산값으로 둔다. 저장은 후속 단계에서 `StoryConfig.contextIndexSnapshot` 같은 optional 필드로만 추가한다.

### 3.3 Retrieval Planner

탭별로 다시 읽을 자료가 다르다.

| 탭 | 우선 재독 대상 |
|---|---|
| 프로젝트 생성 | releasePurpose, rightsStatus, rightsNote, importFileReports |
| 세계관 | corePremise, powerStructure, worldFieldEvidence, world import 후보 |
| 캐릭터·아이템 | characters, items, charRelations, character/item import 후보 |
| 메인 시나리오 | synopsis, mainScenarioStructure, plot import 후보 |
| 씬시트 | episodeSceneSheets, current episode, scene import 후보 |
| 연출 | sceneDirection, directionSnapshot, direction import 후보 |
| 집필 | current manuscript, current scene sheet, active characters/items, externalCraftReferences |
| 퇴고 | manuscript, compliance report, revision notes |
| 번역 | translationConfig, glossary, translatedManuscripts, reference bundle |
| 출고 | creative events, source records, rightsLedger, package state |

### 3.4 Re-Reader

Re-Reader는 요약기가 아니라 현재 작업에 필요한 근거만 읽는 계층이다.

반환값은 원문 전체가 아니라 다음 구조다.

```ts
interface LoreguardReadPacket {
  id: string;
  projectId: string;
  tabId: LoreguardBrainTabId;
  sourcesRead: LoreguardSourcePointer[];
  relevance: "high" | "medium" | "low";
  extractedPoints: string[];
  conflicts: LoreguardContextConflict[];
  missingEvidence: string[];
  confidence: "INDEX_HINT" | "SOURCE_FOUND" | "READ_CONFIRMED" | "CONFLICTED" | "STALE";
}
```

### 3.5 Judgment Packet

노아가 실행하기 전 판단 패킷을 만든다.

```ts
interface LoreguardJudgmentPacket {
  id: string;
  projectId: string;
  tabId: LoreguardBrainTabId;
  actionKind: AppBrainActionKind;
  userIntent: string;
  readPacketIds: string[];
  evidenceStatus: "none" | "index-only" | "read-confirmed" | "conflicted" | "stale";
  riskLevel: "low" | "medium" | "high";
  decision: "AUTO_CONTINUE" | "PREVIEW" | "HOLD" | "SPLIT" | "PROTECT" | "RECORD";
  reasonCodes: string[];
  authorGateRequired: boolean;
  receiptLevel: "none" | "light" | "full";
}
```

이 패킷은 `decideAppBrain()`과 겹치지 않는다. 역할은 다르다.

- `LoreguardJudgmentPacket`: 근거가 충분한지 판단
- `decideAppBrain()`: 이 변경을 어떻게 적용할지 판단

## 4. 데이터 모델 초안

### 4.0 내부 표준명과 표시 라벨

내부 항목은 화면 문구가 아니라 stable id로 관리한다. 나중에 사용자가 "근거를 보여줘", "노트 종류 보여줘", "출고 패키지에 포함해줘"라고 요청하면 같은 id를 1언어 또는 4개국어 라벨로 렌더링한다.

현재 앱 언어 기준은 `AppLanguage = "KO" | "EN" | "JP" | "CN"`이다. 사용자 화면에 직접 노출될 수 있는 Context Index 항목은 `Record<AppLanguage, string>` 라벨을 필수로 둔다.

권장 타입:

```ts
type LoreguardLabel4 = Readonly<Record<AppLanguage, string>>;

interface LoreguardContextKindDefinition {
  id: LoreguardContextKind;
  tabId: LoreguardBrainTabId;
  label: LoreguardLabel4;
  description: LoreguardLabel4;
  sourceKinds: readonly LoreguardSourceKind[];
  defaultImportance: "low" | "medium" | "high";
  canBecomeBaseline: boolean;
  canAppearInCertificate: boolean;
  requiresAuthorGate: boolean;
}
```

표시 규칙:

- 내부 저장: `world.core-premise`, `character.speech-style` 같은 stable id만 저장한다.
- 단일 언어 UI: `label[normalizeAppLanguage(language)]`를 사용한다.
- 4개국어 출력: `label.KO`, `label.EN`, `label.JP`, `label.CN`을 모두 보여준다.
- `L4()`는 간단한 버튼/문장에는 가능하지만, 이 레지스트리 항목에는 쓰지 않는다. `L4()`는 JP/CN fallback이 가능하므로 "4개국어 정확 표준"에는 약하다.
- 공개 표면에서는 "AI 생성", "인증", "보증" 표현을 쓰지 않는다.

### 4.0.1 탭별 표준 Context Kind

아래 표는 1차 canonical 목록이다. 구현 시 이 id를 기준으로 테스트를 건다.

| 탭 | 내부 id | KO | EN | JP | CN |
|---|---|---|---|---|---|
| project | `project.goal` | 작품 목표 | Work Goal | 作品目標 | 作品目标 |
| project | `project.release-purpose` | 출고 목적 | Release Purpose | 出稿目的 | 交付目的 |
| project | `project.rights-note` | 권리/IP 메모 | Rights/IP Note | 権利/IPメモ | 权利/IP 备注 |
| project | `project.target-market` | 대상 시장 | Target Market | 対象市場 | 目标市场 |
| project | `project.import-report` | 파일 읽기 기록 | File Read Record | ファイル読取記録 | 文件读取记录 |
| world | `world.core-premise` | 핵심 전제 | Core Premise | 中核前提 | 核心前提 |
| world | `world.power-structure` | 권력 구조 | Power Structure | 権力構造 | 权力结构 |
| world | `world.rule-taboo` | 규칙과 금기 | Rules and Taboos | ルールと禁忌 | 规则与禁忌 |
| world | `world.history-event` | 역사와 사건 | History and Events | 歴史と事件 | 历史与事件 |
| world | `world.daily-life` | 생활감 | Daily Life Texture | 生活感 | 生活质感 |
| world | `world.evidence` | 세계관 근거 | World Evidence | 世界観根拠 | 世界观依据 |
| character | `character.desire-lack` | 욕망과 결핍 | Desire and Lack | 欲望と欠落 | 欲望与缺失 |
| character | `character.speech-style` | 말투 | Speech Style | 話し方 | 说话风格 |
| character | `character.relationship-pressure` | 관계 압력 | Relationship Pressure | 関係の圧力 | 关系压力 |
| character | `character.info-state` | 정보 상태 | Information State | 情報状態 | 信息状态 |
| character | `character.change-trigger` | 변화 계기 | Change Trigger | 変化の契機 | 变化触发点 |
| character | `character.item-condition` | 아이템 소유/조건 | Item Ownership/Condition | アイテム所有/条件 | 道具归属/条件 |
| character | `character.forbidden-drift` | 금지 드리프트 | Forbidden Drift | 禁止ドリフト | 禁止偏移 |
| plot | `plot.synopsis-7` | 7문장 시놉시스 | 7-Sentence Synopsis | 7文シノプシス | 7句梗概 |
| plot | `plot.cause-effect` | 사건 인과 | Cause and Effect | 事件因果 | 事件因果 |
| plot | `plot.act-structure` | 액트 구조 | Act Structure | 幕構成 | 幕结构 |
| plot | `plot.ending-lock` | 결말 잠금 | Ending Lock | 結末ロック | 结局锁定 |
| plot | `plot.twist-candidate` | 반전 후보 | Twist Candidate | どんでん返し候補 | 反转候选 |
| plot | `plot.discarded-arc` | 폐기 전개 | Discarded Arc | 破棄した展開 | 废弃走向 |
| scene | `scene.purpose` | 장면 목적 | Scene Purpose | シーン目的 | 场景目的 |
| scene | `scene.conflict` | 갈등 | Conflict | 葛藤 | 冲突 |
| scene | `scene.public-info` | 공개 정보 | Revealed Information | 公開情報 | 公开信息 |
| scene | `scene.hidden-info` | 숨은 정보 | Hidden Information | 隠された情報 | 隐藏信息 |
| scene | `scene.emotion-curve` | 감정 곡선 | Emotion Curve | 感情曲線 | 情绪曲线 |
| scene | `scene.reward-hook` | 보상감/후킹 | Reward and Hook | 報酬感/フック | 奖励感/钩子 |
| scene | `scene.next-link` | 다음 장면 연결 | Next Scene Link | 次シーン接続 | 下一场景连接 |
| direction | `direction.mise-en-scene` | 미장센 | Mise-en-scene | ミザンセーヌ | 场面调度 |
| direction | `direction.camera-pov` | 카메라/시점 | Camera/POV | カメラ/視点 | 镜头/视角 |
| direction | `direction.light-sound` | 조명/소리 | Light/Sound | 照明/音 | 灯光/声音 |
| direction | `direction.action` | 액션 | Action | アクション | 动作 |
| direction | `direction.prose-rhythm` | 문장 리듬 | Prose Rhythm | 文章リズム | 文句节奏 |
| direction | `direction.cliffhanger` | 클리프행어 | Cliffhanger | クリフハンガー | 悬念收束 |
| writing | `writing.episode-goal` | 현재 회차 목표 | Current Episode Goal | 現在話の目標 | 当前章节目标 |
| writing | `writing.active-character` | 활성 캐릭터 | Active Characters | 登場中キャラクター | 活跃角色 |
| writing | `writing.active-item` | 활성 아이템 | Active Items | 使用中アイテム | 活跃道具 |
| writing | `writing.referenced-source` | 참조 근거 | Referenced Sources | 参照根拠 | 参考依据 |
| writing | `writing.noa-suggestion` | 노아 제안 후보 | Noa Suggestion Candidate | ノア提案候補 | Noa 建议候选 |
| writing | `writing.author-reason` | 작가 선택 이유 | Author Selection Reason | 作者の選択理由 | 作者选择理由 |
| revision | `revision.sentence-issue` | 문장 결함 | Sentence Issue | 文章の問題 | 句子问题 |
| revision | `revision.repetition-rhythm` | 반복/리듬 | Repetition/Rhythm | 反復/リズム | 重复/节奏 |
| revision | `revision.character-drift` | 캐릭터 흔들림 | Character Drift | キャラクター揺れ | 角色偏移 |
| revision | `revision.world-conflict` | 설정 충돌 | Setting Conflict | 設定衝突 | 设定冲突 |
| revision | `revision.edit-reason` | 수정 이유 | Edit Reason | 修正理由 | 修改理由 |
| translate | `translate.glossary` | 용어집 | Glossary | 用語集 | 术语表 |
| translate | `translate.proper-noun` | 고유명사 | Proper Nouns | 固有名詞 | 专有名词 |
| translate | `translate.cultural-risk` | 문화 어색함 | Cultural Awkwardness | 文化的違和感 | 文化不自然 |
| translate | `translate.source-preservation` | 원문 보존 | Source Preservation | 原文保持 | 原文保留 |
| translate | `translate.localization-choice` | 현지화 선택 | Localization Choice | ローカライズ選択 | 本地化选择 |
| translate | `translate.review-hold` | 검토 보류 | Review Hold | レビュー保留 | 审阅保留 |
| export | `export.manuscript-hash` | 원고 해시 | Manuscript Hash | 原稿ハッシュ | 稿件哈希 |
| export | `export.process-summary` | 과정기록 요약 | Process Record Summary | 過程記録要約 | 过程记录摘要 |
| export | `export.external-import` | 외부 편입 | External Import | 外部取り込み | 外部导入 |
| export | `export.author-choice` | 작가 선택 | Author Choice | 作者の選択 | 作者选择 |
| export | `export.rights-evidence` | 권리/IP 근거 | Rights/IP Evidence | 権利/IP根拠 | 权利/IP 依据 |
| export | `export.submission-bundle` | 제출 구성 | Submission Bundle | 提出構成 | 提交组合 |
| export | `export.limitation-note` | 한계 문구 | Limitation Note | 限界文言 | 限制说明 |

### 4.0.2 적정 노트 개수 정책

저장 가능한 노트 수와 화면 노출 수를 분리한다.

| 탭 | 표준 종류 수 | 화면 기본 노출 | 프로젝트 누적 적정 범위 |
|---|---:|---:|---:|
| project | 5 | 3 | 3-7 |
| world | 6 | 3 | 5-15 |
| character | 7 | 3 | 캐릭터당 3-6 |
| plot | 6 | 3 | 5-12 |
| scene | 7 | 3 | 회차당 3-10 |
| direction | 6 | 3 | 회차당 3-8 |
| writing | 6 | 3 | 회차당 3-12 |
| revision | 5 | 3 | 회차당 3-10 |
| translate | 6 | 3 | 언어당 5-15 |
| export | 7 | 3 | 패키지당 5-12 |

UI 원칙:

- 기본 화면은 탭당 3개만 보여준다.
- 나머지는 "근거", "보류함", "더 보기" 아래로 접는다.
- 출고/확인서에는 모든 노트를 넣지 않고 탭별 핵심 3-5개만 선별한다.
- 내부 인덱스는 더 많이 저장해도 되지만, 노아 응답에는 현재 질문과 관련 있는 source pointer만 넣는다.

### 4.1 Source Pointer

```ts
type LoreguardSourceKind =
  | "story-config-field"
  | "accepted-import-candidate"
  | "memo"
  | "creative-event"
  | "source-record"
  | "manuscript"
  | "scene-sheet"
  | "rights-ledger";

interface LoreguardSourcePointer {
  kind: LoreguardSourceKind;
  id: string;
  label: string;
  stage?: CreativeStage;
  targetKey?: string;
  hash?: string;
  updatedAt?: string;
  excerpt?: string;
}
```

### 4.2 Context Index Entry

```ts
interface LoreguardContextIndexEntry {
  id: string;
  projectId: string;
  tabId: LoreguardBrainTabId;
  keywords: string[];
  aliases: string[];
  sourcePointers: LoreguardSourcePointer[];
  status: "raw" | "indexed" | "read" | "grounded" | "active-reference" | "deprecated";
  confidence: "INDEX_HINT" | "SOURCE_FOUND" | "READ_CONFIRMED" | "CONFLICTED" | "STALE";
  importance: "low" | "medium" | "high";
  lastAccessedAt?: string;
}
```

### 4.3 Memo Candidate

현재 `MemoPanel`의 `MemoCard`는 텍스트와 시각만 가진다. 다음 단계에서 아래 필드를 추가하되, 기존 localStorage를 깨지 않도록 optional로 둔다.

```ts
interface LoreguardMemoCandidate {
  id: string;
  text: string;
  at: number;
  suggestedTabId?: LoreguardBrainTabId;
  status?: "memo" | "candidate" | "held" | "applied" | "discarded";
  sourceHash?: string;
  routedTargetKey?: string;
}
```

### 4.4 Receipt 연결

Context Index 자체는 확인서가 아니다. 확인서 근거가 되려면 `CreativeEvent`로 남아야 한다.

권장 이벤트 매핑:

- 메모 저장: 기본은 기록하지 않음. 작가가 후보화할 때 `SYSTEM_GENERATED` 또는 `HUMAN_DRAFT` light receipt
- 메모 후보 반영: `HUMAN_REVISION` 또는 `HUMAN_DRAFT`
- 파일 후보 채택: `EXTERNAL_IMPORT`
- 노아 제안 채택: `AI_SUGGESTION` + `decisionContext.action = accepted`
- 노아 제안 폐기: `AI_SUGGESTION` + `decisionContext.action = rejected`
- 기준선 대량 반영: `merge` 이벤트 + full receipt

## 5. 구현 로드맵

### P0: 읽기 전용 파생 인덱스

목표:

- 앱 상태를 바꾸지 않고 `StoryConfig`에서 Context Index를 만든다.
- 집필/출고/세계관 탭에서 어떤 근거를 다시 읽어야 하는지 계산한다.
- 탭별 내부 항목 id와 4개국어 라벨이 한 레지스트리에서 나온다.

작업:

1. `context-index.types.ts` 추가
2. `context-kind-registry.ts` 추가
3. `buildLoreguardContextIndex(config, projectId)` 구현
4. `planLoreguardRetrieval(input)` 구현
5. 단위 테스트 작성

권장 파일 구조:

```text
src/lib/loreguard/context-index.types.ts
src/lib/loreguard/context-kind-registry.ts
src/lib/loreguard/context-index.ts
src/lib/loreguard/context-retrieval.ts
src/lib/loreguard/context-judgment.ts
src/lib/loreguard/__tests__/context-kind-registry.test.ts
src/lib/loreguard/__tests__/context-index.test.ts
```

`context-kind-registry.test.ts` 필수 검증:

- 모든 `LoreguardContextKind`가 중복 없이 등록된다.
- 모든 라벨이 `KO`, `EN`, `JP`, `CN`을 가진다.
- 빈 문자열 라벨이 없다.
- `tabId`가 `LoreguardBrainTabId`에 속한다.
- `sourceKinds`가 빈 배열이 아니다.
- `canAppearInCertificate=true`인 항목은 공개 금지어를 포함하지 않는다.

검증:

```powershell
npx jest src/lib/loreguard/__tests__/context-kind-registry.test.ts --runInBand
npx jest src/lib/loreguard/__tests__/context-index.test.ts --runInBand
npx tsc --noEmit --pretty false
```

### P1: 메모 후보화

목표:

- `MemoPanel` 메모를 "메모 후보"로 승격할 수 있게 한다.
- 기준선에 바로 반영하지 않고 탭 후보로 보낸다.

UI:

- 메모 카드별 작은 동작: `후보로 보내기`
- 후보 탭: 세계관 / 캐릭터 / 시나리오 / 씬시트 / 연출 / 원고 / 출고 메모
- 상태: 보류 / 반영 / 폐기

주의:

- 메모를 저장하는 순간 과정기록을 남기면 감시처럼 느껴질 수 있다.
- 후보로 승격하거나 기준선에 반영할 때부터 기록한다.

### P2: 집필 Re-Reader

목표:

- 집필 전 현재 회차에 필요한 근거만 읽는다.
- `buildWritingContextComplianceReport`의 입력 근거를 더 명확히 만든다.

경로:

```text
TabWriting
-> buildLoreguardContextIndex
-> retrieveForWritingEpisode
-> buildWritingContextComplianceReport
-> buildComplianceGatePatch
```

성능:

- `/api/complete` 자동완성에는 전체 재독을 걸지 않는다.
- 자동완성은 current draft + current scene + active characters 정도만 본다.
- 긴 재독은 수동 노아 제안/집필 생성/퇴고/출고에서 실행한다.

### P3: 출고/확인서 근거 연결

목표:

- 확인서와 출고 패키지가 "무엇을 다시 읽고 판단했는지"를 보여준다.

추가 섹션 후보:

- 다시 확인한 기준선
- 작가 선택 요약
- 외부 편입 후보와 반영 여부
- 보류/폐기된 노아 제안 요약

긴 원문은 공개하지 않는다. 기존 정책대로 QR, 축약 해시, 조회 링크 중심으로 둔다.

### P4: 평가 하네스

측정 대상:

- 캐릭터 일관성 충돌 탐지
- 세계관 규칙 충돌 탐지
- 잘못된 과거 기억 방지
- 메모 후보 라우팅 정확도
- 출고 근거 누락 감지

초기 eval은 synthetic PASS 도장으로 끝내지 않는다. 실제 `StoryConfig` fixture와 불러오기 후보 fixture를 사용한다.

## 6. 금지 주장

이 설계가 들어가도 아래 표현은 금지한다.

- NOA 기억력이 개선됐다고 확정
- 일반 RAG보다 우수하다고 확정
- 1M context보다 낫다고 확정
- D64/D8 비용 절감이 검증됐다고 확정
- 확인서가 권리나 저작권을 보증한다고 표현
- 메모/파일을 자동으로 작품 기준선에 반영

허용 표현:

- 필요한 근거를 다시 확인하도록 돕는다.
- 작가가 채택한 내용만 기준선에 반영한다.
- 과정기록에는 선택과 보류의 흔적을 남긴다.
- 출고 전 확인해야 할 근거를 모아 보여준다.

## 7. 적용 우선순위

1. `context-index` pure module 작성
2. `MemoPanel` 메모 후보화
3. 집필 탭 Re-Reader 카드 추가
4. 출고 탭 근거 요약 추가
5. Eval 하네스 작성

## 8. 완료 기준

P0 완료 기준:

- `context-kind-registry`가 탭별 표준 항목 61개를 등록한다.
- 모든 표준 항목은 `KO/EN/JP/CN` 라벨을 가진다.
- `StoryConfig` fixture 하나로 인덱스가 만들어진다.
- 파일 후보, 세계관 필드, 캐릭터, 씬시트, 연출, 원고가 source pointer로 분리된다.
- 탭별 retrieval plan이 결정된다.
- `INDEX_HINT`와 `READ_CONFIRMED`가 구분된다.
- 실행 없이 읽기 전용 테스트가 통과한다.

P1 완료 기준:

- 메모가 프로젝트별로 유지된다.
- 메모를 후보로 보낼 수 있다.
- 후보는 기준선에 자동 반영되지 않는다.
- 작가가 반영할 때 과정기록이 남는다.

P2 완료 기준:

- 집필 생성 전 관련 근거를 다시 읽는다.
- 자동완성에는 무거운 재독을 걸지 않는다.
- 7축 점검 입력 근거가 추적 가능하다.

## 9. 최종 정의

Loreguard Context Index는 장기 기억 기능이 아니다.

```text
작가가 남긴 메모와 근거를
필요한 순간 다시 확인하고,
노아가 판단 후보를 정리한 뒤,
작가가 승인한 것만 기준선과 과정기록에 남기는 계층이다.
```
