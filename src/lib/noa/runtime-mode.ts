// ============================================================
// PART 1 — Runtime Mode Types
// ============================================================

export type NoaRuntimeMode = 'hosted' | 'byok' | 'local' | 'offline';
export type NoaRuntimeBoundaryStatus = 'ready' | 'review' | 'hold';

export interface NoaRuntimeBoundaryInput {
  providerId: string;
  providerName: string;
  providerIsLocal: boolean;
  providerHasUserKey: boolean;
  hostedAvailable: boolean;
  localEndpointConfigured: boolean;
  structuredOutputSupported?: boolean;
  offlineRequested?: boolean;
}

export interface NoaRuntimeBoundary {
  mode: NoaRuntimeMode;
  status: NoaRuntimeBoundaryStatus;
  modeLabelKo: string;
  statusLabelKo: string;
  creativePathKo: string;
  systemPathKo: string;
  privacyKo: string;
  costKo: string;
  limitsKo: string;
  requiredActionKo: string;
  usesUserKey: boolean;
  usesServiceKey: boolean;
  usesLocalEndpoint: boolean;
  allowsOfflineDraftOnly: boolean;
}

export interface NoaRuntimeModeCard {
  mode: NoaRuntimeMode;
  label: string;
  titleKo: string;
  descriptionKo: string;
  active: boolean;
  status: NoaRuntimeBoundaryStatus;
}

// ============================================================
// PART 2 — Boundary Builder
// ============================================================

export function buildNoaRuntimeBoundary(input: NoaRuntimeBoundaryInput): NoaRuntimeBoundary {
  if (input.offlineRequested) {
    return {
      mode: 'offline',
      status: 'review',
      modeLabelKo: '오프라인 작업',
      statusLabelKo: '제한 운용',
      creativePathKo: '창작 본문은 외부 호출 없이 로컬 작업물과 과정기록에만 남깁니다.',
      systemPathKo: '노아 시스템 보조는 저장된 규칙, 체크리스트, 로컬 검토에 한정됩니다.',
      privacyKo: '외부 전송을 멈추는 대신 모델 호출형 제안은 사용할 수 없습니다.',
      costKo: '외부 모델 비용은 발생하지 않습니다.',
      limitsKo: '새 제안, 장문 변환, 고급 번역은 연결 복구 뒤 진행해야 합니다.',
      requiredActionKo: '다시 노아 제안을 쓰려면 기본 운영, 연결 키, 로컬 엔드포인트 중 하나를 준비하세요.',
      usesUserKey: false,
      usesServiceKey: false,
      usesLocalEndpoint: false,
      allowsOfflineDraftOnly: true,
    };
  }

  if (input.providerIsLocal) {
    const localReady = input.localEndpointConfigured;
    return {
      mode: 'local',
      status: localReady ? 'ready' : 'hold',
      modeLabelKo: '로컬 실행',
      statusLabelKo: localReady ? '준비됨' : '엔드포인트 필요',
      creativePathKo: localReady
        ? `창작 본문은 ${input.providerName} 로컬 엔드포인트로만 보냅니다.`
        : '창작 본문을 보낼 로컬 엔드포인트가 아직 없습니다.',
      systemPathKo: '서비스 쪽 기본 모델은 본문 작성에 관여하지 않고, 저장·정책·과정기록 보조만 담당합니다.',
      privacyKo: localReady
        ? '본문은 사용자가 지정한 로컬 또는 사내 실행 환경 경계 안에서 처리됩니다.'
        : '엔드포인트를 연결하기 전까지 외부 호출은 보류됩니다.',
      costKo: '서비스 모델 비용은 줄지만 로컬 장비, 사내 서버, 전력 비용은 사용자가 부담합니다.',
      limitsKo: input.structuredOutputSupported
        ? '로컬 모델 품질과 속도는 선택한 엔드포인트 성능을 따릅니다.'
        : '구조화 응답, 긴 문맥, 엄격한 형식 출력은 모델별 편차가 큽니다.',
      requiredActionKo: localReady
        ? '로컬 모델명과 엔드포인트 상태를 주기적으로 점검하세요.'
        : 'Ollama, LM Studio, vLLM 같은 OpenAI 호환 엔드포인트를 연결하세요.',
      usesUserKey: false,
      usesServiceKey: false,
      usesLocalEndpoint: localReady,
      allowsOfflineDraftOnly: !localReady,
    };
  }

  if (input.providerHasUserKey) {
    return {
      mode: 'byok',
      status: 'ready',
      modeLabelKo: '연결 키',
      statusLabelKo: '준비됨',
      creativePathKo: `창작 본문과 노아 제안 호출은 사용자가 저장한 ${input.providerName} 키를 우선 사용합니다.`,
      systemPathKo: input.hostedAvailable
        ? '서비스 기본 모델은 본문 작성 대신 정책 점검, 저장 상태, 과정기록 보조 경계에만 둡니다.'
        : '서비스 기본 모델이 없으면 정책 점검과 과정기록 보조는 로컬 규칙 중심으로 실행됩니다.',
      privacyKo: '선택한 공급자 약관과 연결 키 사용량 정책이 창작 본문 처리 경계를 결정합니다.',
      costKo: '모델 호출 비용은 연결한 모델 계정에 귀속됩니다.',
      limitsKo: '공급자 장애, 키 한도, 모델별 문맥 길이 제한은 사용자 계정 상태를 따릅니다.',
      requiredActionKo: '연결 키 만료, 사용량 한도, 공급자별 저장 정책을 환경 설정에서 주기적으로 확인해 주세요.',
      usesUserKey: true,
      usesServiceKey: false,
      usesLocalEndpoint: false,
      allowsOfflineDraftOnly: false,
    };
  }

  if (input.hostedAvailable) {
    return {
      mode: 'hosted',
      status: 'ready',
      modeLabelKo: '기본 운영',
      statusLabelKo: '준비됨',
      creativePathKo: `창작 본문과 노아 제안 호출은 서비스가 관리하는 ${input.providerName} 실행 경로를 사용합니다.`,
      systemPathKo: '정책 점검, 저장 상태, 과정기록 보조가 같은 운영 경계에서 함께 실행됩니다.',
      privacyKo: '사용자는 별도 키 없이 시작할 수 있고, 서비스 운영 정책에 따라 호출이 관리됩니다.',
      costKo: '호출 비용은 서비스 플랜과 사용량 정책에 포함됩니다.',
      limitsKo: '플랜별 사용량, 동시성, 모델 선택 범위가 적용됩니다.',
      requiredActionKo: '세부 모델 제어가 필요하면 연결 키 또는 로컬 실행으로 전환하세요.',
      usesUserKey: false,
      usesServiceKey: true,
      usesLocalEndpoint: false,
      allowsOfflineDraftOnly: false,
    };
  }

  return {
    mode: 'offline',
    status: 'hold',
    modeLabelKo: '오프라인 작업',
    statusLabelKo: '연결 필요',
    creativePathKo: '현재 창작 본문을 보낼 기본 운영 경로, 연결 키, 로컬 엔드포인트가 없습니다.',
    systemPathKo: '노아 시스템 보조는 저장된 규칙과 로컬 상태 확인에 한정됩니다.',
    privacyKo: '외부 전송은 없지만 노아 제안과 고급 검토도 중단됩니다.',
    costKo: '외부 모델 비용은 발생하지 않습니다.',
    limitsKo: '불러오기 분류, 장문 제안, 번역·출고 점검은 연결 준비 뒤 진행해야 합니다.',
    requiredActionKo: '기본 운영 접근 권한을 확인하거나 연결 키·로컬 엔드포인트를 추가하세요.',
    usesUserKey: false,
    usesServiceKey: false,
    usesLocalEndpoint: false,
    allowsOfflineDraftOnly: true,
  };
}

// ============================================================
// PART 3 — Mode Card Builder
// ============================================================

export function buildNoaRuntimeModeCards(input: NoaRuntimeBoundaryInput): NoaRuntimeModeCard[] {
  const boundary = buildNoaRuntimeBoundary(input);
  const hostedStatus: NoaRuntimeBoundaryStatus = input.hostedAvailable ? 'ready' : 'hold';
  const byokStatus: NoaRuntimeBoundaryStatus = input.providerHasUserKey && !input.providerIsLocal ? 'ready' : 'hold';
  const localStatus: NoaRuntimeBoundaryStatus = input.localEndpointConfigured ? 'ready' : 'hold';

  return [
    {
      mode: 'hosted',
      label: 'Hosted',
      titleKo: '기본 운영',
      descriptionKo: '서비스가 관리하는 노아 실행 경로입니다.',
      active: boundary.mode === 'hosted',
      status: hostedStatus,
    },
    {
      mode: 'byok',
      label: '연결 키',
      titleKo: '연결 키',
      descriptionKo: '창작 본문 호출을 연결한 모델 계정으로 분리합니다.',
      active: boundary.mode === 'byok',
      status: byokStatus,
    },
    {
      mode: 'local',
      label: 'Local',
      titleKo: '로컬 실행',
      descriptionKo: '사용자 장비나 사내 엔드포인트를 사용합니다.',
      active: boundary.mode === 'local',
      status: localStatus,
    },
    {
      mode: 'offline',
      label: 'Offline',
      titleKo: '오프라인 작업',
      descriptionKo: '저장과 과정기록 중심으로 제한 운용합니다.',
      active: boundary.mode === 'offline',
      status: boundary.mode === 'offline' ? boundary.status : 'ready',
    },
  ];
}
