import { buildNoaRuntimeBoundary, buildNoaRuntimeModeCards } from '../runtime-mode';

const baseInput = {
  providerId: 'gemini',
  providerName: 'Google Gemini',
  providerIsLocal: false,
  providerHasUserKey: false,
  hostedAvailable: false,
  localEndpointConfigured: false,
  structuredOutputSupported: true,
};

describe('buildNoaRuntimeBoundary', () => {
  it('서비스 운영 경로가 준비되면 hosted 모드로 본다', () => {
    const boundary = buildNoaRuntimeBoundary({
      ...baseInput,
      hostedAvailable: true,
    });

    expect(boundary.mode).toBe('hosted');
    expect(boundary.status).toBe('ready');
    expect(boundary.usesServiceKey).toBe(true);
    expect(boundary.usesUserKey).toBe(false);
    expect(boundary.creativePathKo).toContain('서비스가 관리하는');
  });

  it('연결 키가 있으면 창작 본문 호출을 연결 키 모드로 분리한다', () => {
    const boundary = buildNoaRuntimeBoundary({
      ...baseInput,
      providerHasUserKey: true,
      hostedAvailable: true,
    });

    expect(boundary.mode).toBe('byok');
    expect(boundary.status).toBe('ready');
    expect(boundary.usesUserKey).toBe(true);
    expect(boundary.usesServiceKey).toBe(false);
    expect(boundary.systemPathKo).toContain('본문 작성 대신 정책 점검');
  });

  it('로컬 공급자를 선택했지만 엔드포인트가 없으면 hold로 막는다', () => {
    const boundary = buildNoaRuntimeBoundary({
      ...baseInput,
      providerId: 'lmstudio',
      providerName: 'LM Studio',
      providerIsLocal: true,
      localEndpointConfigured: false,
      hostedAvailable: true,
    });

    expect(boundary.mode).toBe('local');
    expect(boundary.status).toBe('hold');
    expect(boundary.usesLocalEndpoint).toBe(false);
    expect(boundary.requiredActionKo).toContain('OpenAI 호환 엔드포인트');
  });

  it('로컬 엔드포인트가 있으면 서비스 기본 모델을 본문 작성에서 제외한다', () => {
    const boundary = buildNoaRuntimeBoundary({
      ...baseInput,
      providerId: 'ollama',
      providerName: 'Ollama',
      providerIsLocal: true,
      localEndpointConfigured: true,
    });

    expect(boundary.mode).toBe('local');
    expect(boundary.status).toBe('ready');
    expect(boundary.usesLocalEndpoint).toBe(true);
    expect(boundary.systemPathKo).toContain('본문 작성에 관여하지 않고');
  });

  it('운영 경로가 없으면 오프라인 제한 상태로 둔다', () => {
    const boundary = buildNoaRuntimeBoundary(baseInput);

    expect(boundary.mode).toBe('offline');
    expect(boundary.status).toBe('hold');
    expect(boundary.allowsOfflineDraftOnly).toBe(true);
    expect(boundary.requiredActionKo).toContain('연결 키');
  });
});

describe('buildNoaRuntimeModeCards', () => {
  it('활성 모드와 준비 상태를 카드 배열에 반영한다', () => {
    const cards = buildNoaRuntimeModeCards({
      ...baseInput,
      providerHasUserKey: true,
      hostedAvailable: true,
    });

    const byokCard = cards.find((card) => card.mode === 'byok');
    const hostedCard = cards.find((card) => card.mode === 'hosted');

    expect(byokCard).toMatchObject({ active: true, status: 'ready' });
    expect(hostedCard).toMatchObject({ active: false, status: 'ready' });
  });
});
