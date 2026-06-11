// ============================================================
// Creative Process — 창작 과정 확인서 (Authorship Journal) 타입 정의
// ============================================================
// 외부 명칭:
//   ko: 창작 과정 확인서
//   en: Authorship Journal      (미국 — 작가 친숙도 + 법적 안전)
//   ja: 制作過程確認書
//   zh: 创作过程确认书
//
// 격리 전략 (Track-D §1.1, §1.2):
//   - 기존 EntryOrigin (USER/TEMPLATE/ENGINE_SUGGEST/ENGINE_DRAFT) 건드리지 않음
//   - EpisodeManuscript.content 구조화 X (계속 string)
//   - 본 모듈은 외부에서 import만 받음 (read-only consumer)
//   - studio-types.ts 의존성: 없음 (완전 분리)
//
// 사상 정합:
//   - 14차 §3 엄밀성 시장: 보증 X, 정보 제공 O
//   - 11차 §4 PASS/HOLD/FAIL/BLOCK: ARCS 4상태 적용
//   - 8차 §7.1 권력 5축: 검증 권력 = 제3자 (EH)
//   - 4차 §1: "보증이 아니라 증인" — 판정 X, 기록 O
// ============================================================

// ============================================================
// PART 1 — Origin Type (9종 책임 분계 태그)
// ============================================================
//
// 5/2 LoreGuard_부족부분_설계_창작과정확인서_v0.1 §6.1 사양.
// 기존 EntryOrigin (4종) 의 확장판이지만 별도 타입으로 분리 격리.
// origin-adapter.ts 의 단방향 매핑 함수로만 변환 가능.

/** 9종 창작 출처 분류 */
export type CreativeOriginType =
  /** 작가 직접 작성한 초안 (AI 개입 0) */
  | 'HUMAN_DRAFT'
  /** 작가 직접 수정·개작 (이미 존재하는 텍스트의 인간 개입) */
  | 'HUMAN_REVISION'
  /** AI 제안 → 작가 채택 (수정 없이 그대로) */
  | 'AI_SUGGESTION'
  /** AI 초안 생성 (작가 후속 검토 전제) */
  | 'AI_DRAFT'
  /** AI 재작성·다듬기 (작가 원문 → AI 변형) */
  | 'AI_REWRITE'
  /** 외부 텍스트 편입 (다른 도구·문서 → 본 작품) */
  | 'EXTERNAL_IMPORT'
  /** 템플릿·프리셋 시드 (장르 골격 등 시스템 제공값) */
  | 'TEMPLATE_SEED'
  /** 협업자 (공동 작가·편집자·번역가 등) 기여 */
  | 'COLLABORATOR_INPUT'
  /** 시스템 자동 생성 (메타데이터·색인 등 작가 의도 무관) */
  | 'SYSTEM_GENERATED';

/** 모든 Origin 타입 배열 (검증·UI 렌더용) */
export const ALL_CREATIVE_ORIGINS: readonly CreativeOriginType[] = [
  'HUMAN_DRAFT',
  'HUMAN_REVISION',
  'AI_SUGGESTION',
  'AI_DRAFT',
  'AI_REWRITE',
  'EXTERNAL_IMPORT',
  'TEMPLATE_SEED',
  'COLLABORATOR_INPUT',
  'SYSTEM_GENERATED',
] as const;

// ============================================================
// PART 2 — CreativeEvent (개별 창작 이벤트 1건)
// ============================================================

/** 이벤트가 가리키는 대상 타입 */
export type CreativeEventTarget =
  | 'manuscript' // 원고 본문
  | 'world' // 세계관
  | 'character' // 캐릭터
  | 'scene' // 씬시트
  | 'glossary' // 용어집
  | 'metadata' // 메타데이터
  | 'other';

/** 이벤트 종류 */
export type CreativeEventType =
  | 'create' // 신규 생성
  | 'edit' // 수정
  | 'accept' // AI 제안 수락
  | 'reject' // AI 제안 거절
  | 'import' // 외부 편입
  | 'delete' // 삭제 (논리적)
  | 'restore' // 복원
  | 'merge'; // 병합

/** 행위 주체 */
export type CreativeActorType =
  | 'human' // 작가 본인
  | 'ai' // AI 제안·생성
  | 'system' // 시스템 자동
  | 'collaborator'; // 외부 협업자

/**
 * 단일 창작 이벤트 1건의 기록.
 *
 * 사용 시점: 작가의 모든 의미 있는 행위 (생성·수정·수락·거절·편입·삭제) 발생 시.
 * 보존 원칙: append-only. 삭제는 'delete' 이벤트로 표현 (실 데이터 삭제 X).
 */
export interface CreativeEvent {
  /** 이벤트 고유 ID (ULID 권장) */
  id: string;
  /** 소속 프로젝트 ID */
  projectId: string;
  /** 에피소드 번호 (해당 시) */
  episodeId?: number;
  /** 대상 타입 */
  targetType: CreativeEventTarget;
  /** 대상 식별자 (캐릭터 id, 씬 id, 용어 id 등) */
  targetId: string;
  /** 이벤트 종류 */
  eventType: CreativeEventType;
  /** 행위 주체 타입 */
  actorType: CreativeActorType;
  /** 행위자 식별자 (작가명·AI 모델명·협업자 ID 등) */
  actorId: string;
  /** 창작 출처 분류 (9종 중 1) */
  originType: CreativeOriginType;
  /** 변경 전 콘텐츠 해시 (SHA-256 hex) — 신규 생성 시 null */
  beforeHash: string | null;
  /** 변경 후 콘텐츠 해시 (SHA-256 hex) — 삭제 시 null */
  afterHash: string | null;
  /** 외부 소스 참조 ID (EXTERNAL_IMPORT·AI_*등) — SourceRecord.id */
  sourceId?: string;
  /** 이벤트 발생 시각 (ISO 8601) */
  createdAt: string;
  /** 발생 시점 앱 버전 (재현성·디버깅용) */
  appVersion: string;
  /** 작가 메모 (선택, 비공개) */
  note?: string;

  // ============================================================
  // [s81-hash-chain — additive·optional] per-event hash chain.
  // 구 이벤트 (chain 도입 前) 는 세 필드 모두 undefined — 여전히 유효.
  // ============================================================

  /** 창작 단계 (9 stage 중 1, 선택) */
  stage?: CreativeStage;
  /**
   * 직전 이벤트의 eventHash (같은 projectId 체인).
   * null = genesis (체인 첫 이벤트, 또는 직전 이벤트가 legacy 무해시).
   * undefined = legacy 이벤트 (chain 도입 前 기록).
   */
  parentEventHash?: string | null;
  /**
   * 본 이벤트 해시 — SHA-256(canonicalJson(event − eventHash)) hex 64자.
   * parentEventHash 포함하여 계산 → 체인 위변조 검출 가능.
   */
  eventHash?: string;
}

/** 창작 단계 (s81 — 이벤트 stage 태그, 선택) */
export type CreativeStage =
  | 'world'
  | 'character'
  | 'plot'
  | 'scene-sheet'
  | 'direction'
  | 'writing'
  | 'revision'
  | 'publish'
  | 'translate';

// ============================================================
// PART 3 — SourceRecord (외부 텍스트·AI 출력 출처 기록)
// ============================================================

/** 외부 소스 종류 */
export type SourceRecordType =
  | 'ai_output' // AI 생성물 (Claude/GPT/Gemini 등)
  | 'external_doc' // 외부 문서 (워드·구글독스·노션 등)
  | 'web_clip' // 웹 클립
  | 'image_caption' // 이미지 캡션
  | 'reference' // 참고 자료
  | 'collaborator_text' // 협업자 제공 텍스트
  | 'other';

/** 공개 범위 */
export type SourceVisibility =
  | 'public' // 누구나 (Public View 노출)
  | 'publisher' // 출판사·플랫폼 (Publisher View)
  | 'private'; // 작가 본인만 (Private View)

/**
 * 외부 텍스트 / AI 출력 1건의 출처 기록.
 *
 * 사용 시점: EXTERNAL_IMPORT 또는 AI_* 이벤트 발생 시 함께 생성.
 * CreativeEvent.sourceId 로 역참조됨.
 */
export interface SourceRecord {
  /** 소스 고유 ID (ULID 권장) */
  id: string;
  /** 소속 프로젝트 ID */
  projectId: string;
  /** 소스 종류 */
  sourceType: SourceRecordType;
  /** 작가가 붙인 라벨 (예: "1화 마무리 후보 — Claude 제안") */
  label: string;
  /** 편입 시각 (ISO 8601) */
  importedAt: string;
  /** 원본 콘텐츠 해시 (SHA-256 hex) */
  contentHash: string;
  /** AI 생성물인 경우 프로바이더 (claude / openai / gemini 등) */
  provider?: string;
  /** AI 생성물인 경우 모델명 */
  model?: string;
  /** 외부 파일 원본 이름 */
  fileName?: string;
  /** 외부 URL */
  url?: string;
  /** 라이선스 메모 (작가가 직접 입력한 사용 권리 정보) */
  licenseNote?: string;
  /** 공개 범위 */
  visibility: SourceVisibility;
  /** 작가 메모 */
  note?: string;
}

// ============================================================
// PART 4 — ProcessCertificate (창작 과정 확인서 본문)
// ============================================================

/** 확인서 공개 보기 (Track-D 격리전략 §3.1.5 + 4차 정리 §3) */
export type CertificateView =
  | 'public' // 누구나 — 생성 시각·해시·AI Assist 여부·타임라인 요약
  | 'publisher' // 출판사·플랫폼 — 세계관 기준선·AI/인간 흐름·외부 편입
  | 'legal' // 분쟁 대응 — 해시·diff·승인 로그·외부 가져오기
  | 'private'; // 작가 본인 — 전체 (폐기 아이디어·미공개 플롯 포함)

/** 외부 점검 상태 표현 (격리 전략 §2.5 외부용 낮춤 표현) */
export type CertificateExternalStatus =
  | '확인 가능' // 내부 READY
  | '추가 확인 필요' // 내부 REVIEW_NEEDED
  | '외부 편입 기록 있음' // 내부 SOURCE_MISSING
  | '일부 기록 없음' // 내부 HUMAN_REVIEW_LOW / LOG_GAP
  | '확인서 생성 불가'; // 내부 EXPORT_BLOCKED

/** 보고서 섹션 ID (10개 — 격리 전략 §2.3) */
export type CertificateSectionId =
  | 'overview' // 1. 프로젝트 개요
  | 'manuscript-info' // 2. 원고 정보
  | 'world-baseline' // 3. 세계관 기준선
  | 'character-baseline' // 4. 캐릭터·주요 설정
  | 'ai-usage-summary' // 5. AI 사용 여부·범위
  | 'external-import' // 6. 외부 텍스트 편입 이력
  | 'version-timeline' // 7. 주요 버전 타임라인
  | 'author-choice-summary' // 8. 작가 선택·수정·폐기
  | 'hash-and-export-time' // 9. 원고 해시·출력 시각
  | 'limitation-statement'; // 10. 한계와 책임 범위

/** 요약 통계 (확인서 상단 한눈 박스용) */
export interface CertificateSummaryStats {
  /** 총 에피소드 수 */
  totalEpisodes: number;
  /** 총 글자 수 (한·일·중) 또는 단어 수 (영) */
  totalUnits: number;
  /** 단위 ('chars' | 'words') */
  unitLabel: 'chars' | 'words';
  /** AI 보조 사용 여부 (any AI_* event > 0) */
  aiAssistUsed: boolean;
  /** 외부 편입 건수 */
  externalImportCount: number;
  /** 작가 수정 횟수 (HUMAN_REVISION 이벤트 수) */
  humanRevisionCount: number;
  /** 외부 점검 상태 (사용자 노출용) */
  externalStatus: CertificateExternalStatus;
  /**
   * [2026-05-09 — LearningGuard 설계서 §2.9] 사용된 AI 모델·도구 list.
   * 평가자에 AI 보조 정도 정확한 보고 — public/publisher view에 표시.
   * 예: ["gpt-5.4", "claude-sonnet-4-6", "qwen-3.6-35b"]
   */
  aiModelsUsed?: string[];
  /** AI 의견 요청 횟수 (AI_REQUEST 이벤트). public 표시 가능. */
  aiRequestCount?: number;
  /** AI 제안 수용 횟수 (DECISION_AI_ACCEPT). */
  aiAcceptCount?: number;
  /** AI 제안 미수용 횟수 (DECISION_AI_REJECT). [어휘 — '미수용' 중립]. */
  aiUnusedCount?: number;
  /** 총 작업 시간 (초) — 에디터 활성 기준. opt-in. */
  totalDurationSeconds?: number;
  /** 수동 타이핑 글자 수 — opt-in (privacy). */
  manualTypingChars?: number;
  /** 열람 자료 수 (READ_RESOURCE 이벤트). */
  resourcesViewedCount?: number;
}

/**
 * [2026-05-09 — LearningGuard 설계서 §2.2] Issuer 매트릭스.
 * 누가 확인서를 발급했는지 — 4 view 분리 정합.
 */
export type CertificateIssuerType =
  | 'self'              // 작가 본인
  | 'publisher'         // 출판사·에이전시
  | 'collaborator'      // 공동 작가·번역가·편집자
  | 'admission_token';  // 외부 검증 토큰 (입학사정관·심사기관 등)

export interface CertificateIssuer {
  type: CertificateIssuerType;
  /** 검증 완료 여부 (Phase 1: 항상 false — Phase 2 에서 OAuth 검증) */
  verified: boolean;
  /** 동의 기록 시각 (ISO 8601 UTC). 미성년자 보호자 동의 등에 활용 가능. */
  consentRecordedAt?: string;
  /** 외부 admission_token 사용 시 토큰 hash (verification trail). */
  tokenHash?: string;
}

/**
 * [2026-05-09 — LearningGuard 설계서 §2.10] 보존 정책.
 * 확인서·이벤트 로그 자동 삭제 약속 — 작가 IP·privacy 보호.
 */
export interface CertificateRetention {
  /** 만료 시각 (ISO 8601 UTC). 이후 자동 삭제. */
  expiresAt: string;
  /** 자동 삭제 여부. false 시 만료 후 보관 (작가 명시 요청 시). */
  autoDelete: boolean;
  /** 정책 URL — 사용자가 자세한 보존 정책 확인 가능. */
  policyUrl?: string;
}

/**
 * 창작 과정 확인서 1장.
 *
 * 생성 시점: 작가가 ManuscriptView 메뉴에서 명시 발급 시.
 * 외부 표기: ko "창작 과정 확인서" / en "Authorship Journal" /
 *           ja "制作過程確認書" / zh "创作过程确认书".
 *
 * 법적 위치: 보증 X, 정보 자료 O. 첫 줄 디스클레이머 4언어 byte-level 고정.
 */
export interface ProcessCertificate {
  /** 확인서 고유 ID (ULID 권장) — 외부 검증 URL 의 path parameter 로도 사용 */
  id: string;
  /** 소속 프로젝트 ID */
  projectId: string;
  /** 최종 원고 해시 (SHA-256 hex) — 발급 시점 원고 무결성 */
  manuscriptHash: string;
  /** 발급 시각 (ISO 8601 UTC) */
  generatedAt: string;
  /** 발급 시스템 (예: 'loreguard@2.2.0-alpha.1') */
  generatedBy: string;
  /** 보고서 사양 버전 (스키마 버전 추적) */
  reportVersion: string;
  /** 공개 범위 (4계층 중 1) */
  visibility: CertificateView;
  /** 포함된 섹션 ID 배열 */
  includedSections: CertificateSectionId[];
  /** 요약 통계 */
  summaryStats: CertificateSummaryStats;
  /** 타임라인 데이터 해시 (재현성·재발급 검증용) */
  timelineHash: string;
  /** 외부 소스 요약 데이터 해시 */
  sourceSummaryHash: string;
  /** 한계 문구 버전 (변경 추적용) */
  limitationTextVersion: string;

  // ============================================================
  // [2026-05-09 — LearningGuard 설계서 §2.1~2.10 보강]
  // 모든 신규 필드 optional — 기존 발급물 0byte 변경.
  // ============================================================

  /** [§2.1] 스키마 버전. 호환성 추적 — 'reportVersion'은 보고서 사양, 'schemaVersion'은 데이터 모델. */
  schemaVersion?: string;
  /** [§2.1] 앱 버전 (semver). 'generatedBy'와 분리하여 검증 단순화. */
  appVersion?: string;
  /** [§2.2] 발급자 정보 매트릭스 (4 view 분리 정합). */
  issuer?: CertificateIssuer;
  /** [§2.3] 외부 검증 URL — 입학사정관·출판사가 직접 검증 가능. /verify/:id */
  verificationUrl?: string;
  /** [§2.3] 외부 검증 QR (data URL). UI 노출용 사전 생성. */
  verificationQrDataUrl?: string;
  /** [§2.8] 발급 시각 (Local). issued_at 은 UTC, 본 필드는 작가 시간대 표시용. */
  issuedAtLocal?: string;
  /** [§2.8] 시간대 (IANA 표기, 예: 'Asia/Seoul'). */
  timeZone?: string;
  /** [§2.10] 보존 정책 — 자동 삭제 약속. */
  retention?: CertificateRetention;

  // ============================================================
  // [Visual Charter v1.0 — 2026-05-10] stitch_lore_guard 시각 헌법 통합
  // 모든 신규 필드 optional — 기존 발급물 0byte 변경.
  // ============================================================

  /** Witness Seal 일련번호 (LG-{YY}{MM}-{serial}-{hash4}) — 시각 봉인용. */
  sealNumber?: string;
  /** HCI (Human Control Index) 결과 — 0~100 단일 숫자 + 3축 분석. */
  hciPayload?: HCIPayload;
  /** ATTESTATION OF GENESIS 텍스트 (4언어 중 발급 언어). */
  attestationStatement?: string;
  /** Origin Summary (3 카테고리 % — 도넛 차트용). */
  originSummary?: OriginSummaryPayload;
  /** Work Sessions — 작업 시점 list (UI 시점 표시용). */
  workSessions?: WorkSessionEntry[];
  /**
   * [s81-hash-chain — additive·optional] 발급 시점 이벤트 체인 tip 해시
   * (해당 projectId 의 마지막 hashed 이벤트의 eventHash).
   * 확인서가 체인 tip 을 anchoring → 발급 이후 체인 조작 검출 가능.
   * undefined = hashed 이벤트 0건 (legacy-only 프로젝트).
   */
  chainTipHash?: string;

  /**
   * [D2-github-mirror — additive·optional] 확인서 GitHub 미러 commit SHA.
   * 발급 직후 cp-certs/{certId}.json 커밋 성공 시 보존 — commit 시각이
   * 제3자(GitHub) 타임스탬프 앵커가 된다.
   * 정직 표기: 인간 작성 자체는 증명 불가 — 앵커 시점 이후 무변조·존재만 증명.
   * 미러 파일 본문에는 본 필드 부재 (그 커밋이 파일 생성 자체 — 자기참조 불가).
   * undefined = 미러 옵트인 안 함 / 미러 실패 (발급 자체는 유효).
   */
  githubCommitSha?: string;
}

// ============================================================
// PART 4.5 — Visual Charter v1.0 추가 타입
// ============================================================

export interface HCIPayload {
  /** 0~100 (소수점 1자리) */
  hci: number;
  intent: 'verified' | 'partial' | 'unverified';
  density: 'high' | 'medium' | 'low';
  logic: 'validated' | 'pending' | 'incomplete';
  totalEvents: number;
}

export interface OriginSummaryPayload {
  /** 인간 입력 % (HUMAN_DRAFT + EXTERNAL_IMPORT + TEMPLATE_SEED + COLLABORATOR) */
  human_input: number;
  /** 정제 작업 % (HUMAN_REVISION + AI_REWRITE) */
  refinement: number;
  /** AI 제안 % (AI_SUGGESTION + AI_DRAFT + SYSTEM_GENERATED) */
  ai_suggestion: number;
}

export interface WorkSessionEntry {
  /** 작업 시점 (ISO 8601 UTC) */
  date: string;
  /** 4언어 라벨 또는 자동 추출된 작업 이름 */
  title: string;
}

// ============================================================
// PART 5 — ManuscriptOriginEntry (parallel map 항목)
// ============================================================
//
// 격리 전략 §1.2: EpisodeManuscript.content 는 string 그대로 유지.
// 문단별 출처는 별도 parallel map으로 관리.
// Phase 1 MVP에서는 타입만 정의하고 빈 map 유지.
// Phase 3 (Origin 확장 단계) 에서 채워 넣음.

/**
 * 원고 한 단락의 출처 매핑 1건.
 *
 * 키 형식: `{episodeId}:{paragraphHash}` 또는 `{episodeId}:{stableRangeId}`
 * (본문 텍스트 변경 시 hash 재계산으로 매핑 갱신)
 */
export interface ManuscriptOriginEntry {
  /** 출처 분류 */
  originType: CreativeOriginType;
  /** 외부 소스 참조 (해당 시) */
  sourceId?: string;
  /** 마지막 수정 시각 (ISO 8601) */
  lastModifiedAt: string;
}

// ============================================================
// PART 6 — 외부 명칭 상수 (4언어)
// ============================================================
//
// 외부 표기는 i18n 시스템과 별도로 본 모듈 자체에 고정.
// 단어 변경 = 카테고리 변경이므로 byte-level 고정 필요.

/** 4언어 확인서 외부 명칭 */
export const CERTIFICATE_LABELS = {
  ko: '창작 과정 확인서',
  en: 'Authorship Journal',
  ja: '制作過程確認書',
  zh: '创作过程确认书',
} as const;

export type CertificateLanguage = keyof typeof CERTIFICATE_LABELS;
