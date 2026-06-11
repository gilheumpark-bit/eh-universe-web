// ============================================================
// github-mirror.test.ts — 확인서/이벤트 GitHub 미러 (D2-github-mirror)
// ============================================================
//
// 검증 축:
//   - 옵트인 게이트 (noa-github-config meta owner/repo + GITHUB_SYNC 플래그
//     + vault 토큰 — D1-pat-security 이후 config 에 token 직렬화 없음) — 미충족 시 네트워크 0
//   - per-event append-only 미러 (ULID 순서·stage 경로·watermark 전진)
//   - 이미 존재 (422) → 존재 확인 후 skip (재커밋 X)
//   - 실패 비침묵 1회/60s throttle (noa:alert)
//   - mirrorCertificate → commitSha 반환 + cert.githubCommitSha 보존
//   - token 미기록 (파일 내용·alert 메시지)

import type { CreativeEvent, ProcessCertificate } from '../types';

// ── mocks (네트워크·IDB 차단) ──
jest.mock('@/lib/github-sync', () => ({
  putFile: jest.fn(),
  getFile: jest.fn(),
}));
jest.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: jest.fn(),
}));
jest.mock('../event-recorder', () => ({
  listCreativeEvents: jest.fn(),
}));
// vault — jsdom 에 WebCrypto subtle 미존재. production 계약(복호화 토큰 주입)만 mock.
jest.mock('@/lib/github-token-vault', () => ({
  loadToken: jest.fn(),
}));

import { putFile, getFile } from '@/lib/github-sync';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { loadToken } from '@/lib/github-token-vault';
import { listCreativeEvents } from '../event-recorder';
import {
  mirrorEvents,
  mirrorCertificate,
  scheduleEventMirror,
  isCpMirrorEnabled,
  ANCHOR_HONESTY_NOTICE,
  CP_EVENTS_ROOT,
  CP_CERTS_ROOT,
  _resetMirrorModuleForTests,
} from '../github-mirror';

const mockPutFile = putFile as jest.MockedFunction<typeof putFile>;
const mockGetFile = getFile as jest.MockedFunction<typeof getFile>;
const mockFlag = isFeatureEnabled as jest.MockedFunction<typeof isFeatureEnabled>;
const mockList = listCreativeEvents as jest.MockedFunction<typeof listCreativeEvents>;
const mockLoadToken = loadToken as jest.MockedFunction<typeof loadToken>;

const TOKEN = 'ghp_SECRET_TOKEN_DO_NOT_LOG';

/**
 * 신규 계약 (D1-pat-security): noa-github-config = 메타만 (owner/repo/branch —
 * production useGitHubSync StoredConfigMeta 와 동일·token 필드 직렬화 없음),
 * token 은 github-token-vault 복호화 주입. 레거시 {token,owner,repo} 형태를
 * 주입하면 production 이 더 이상 만들지 않는 형태로 회귀를 가린다 — 금지.
 */
function setOptIn(): void {
  localStorage.setItem(
    'noa-github-config',
    JSON.stringify({ owner: 'o', repo: 'r', branch: 'main' }),
  );
  mockLoadToken.mockResolvedValue(TOKEN);
}

function makeEvent(id: string, stage?: CreativeEvent['stage']): CreativeEvent {
  return {
    id,
    projectId: 'prj-1',
    targetType: 'manuscript',
    targetId: 'm1',
    eventType: 'edit',
    actorType: 'human',
    actorId: 'author',
    originType: 'HUMAN_REVISION',
    beforeHash: 'a'.repeat(64),
    afterHash: 'b'.repeat(64),
    createdAt: '2026-06-10T00:00:00.000Z',
    appVersion: 'test',
    ...(stage ? { stage } : {}),
  };
}

function makeCert(id: string): ProcessCertificate {
  return {
    id,
    projectId: 'prj-1',
    manuscriptHash: 'c'.repeat(64),
    generatedAt: '2026-06-10T00:00:00.000Z',
    generatedBy: 'loreguard@test',
    reportVersion: '1.1.0',
    visibility: 'private',
    includedSections: [],
    summaryStats: {
      totalEpisodes: 1,
      totalUnits: 100,
      unitLabel: 'chars',
      aiAssistUsed: false,
      externalImportCount: 0,
      humanRevisionCount: 1,
      externalStatus: '확인 가능',
    },
    timelineHash: 'd'.repeat(64),
    sourceSummaryHash: 'e'.repeat(64),
    limitationTextVersion: '1.0.0',
  };
}

describe('github-mirror — 옵트인 게이트', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    _resetMirrorModuleForTests();
    mockFlag.mockReturnValue(true);
    mockPutFile.mockResolvedValue({ sha: 'blob', commitSha: 'commit-sha-1' });
    mockList.mockResolvedValue([]);
    mockLoadToken.mockResolvedValue(null); // vault 비어 있음 — setOptIn() 이 덮어씀
  });

  it('noa-github-config 미존재 → mirrorEvents/mirrorCertificate null·네트워크 0', async () => {
    expect(await isCpMirrorEnabled()).toBe(false);
    expect(await mirrorEvents('prj-1')).toBeNull();
    expect(await mirrorCertificate(makeCert('CERT1'))).toBeNull();
    expect(mockPutFile).not.toHaveBeenCalled();
  });

  it('GITHUB_SYNC 플래그 OFF → config 있어도 null', async () => {
    setOptIn();
    mockFlag.mockReturnValue(false);
    expect(await isCpMirrorEnabled()).toBe(false);
    expect(await mirrorEvents('prj-1')).toBeNull();
    expect(mockPutFile).not.toHaveBeenCalled();
  });

  it('meta 있어도 vault 토큰 미확보 → null (인증 불능 — 네트워크 0)', async () => {
    localStorage.setItem('noa-github-config', JSON.stringify({ owner: 'o', repo: 'r' }));
    expect(await isCpMirrorEnabled()).toBe(false);
    expect(await mirrorEvents('prj-1')).toBeNull();
    expect(mockPutFile).not.toHaveBeenCalled();
  });

  it('meta 불완전 (owner 누락) → vault 토큰 있어도 null', async () => {
    localStorage.setItem('noa-github-config', JSON.stringify({ repo: 'r' }));
    mockLoadToken.mockResolvedValue(TOKEN);
    expect(await isCpMirrorEnabled()).toBe(false);
    expect(await mirrorEvents('prj-1')).toBeNull();
    expect(mockPutFile).not.toHaveBeenCalled();
  });

  it('[회귀 D1×D2] production meta-only config (token 필드 자체 없음) + vault 토큰 → 게이트 통과', async () => {
    // 기존 parsed.token 게이트였다면 영구 false — 미러 사일런트 중단 회귀 재현 차단
    setOptIn();
    expect(await isCpMirrorEnabled()).toBe(true);
  });

  it('legacy 평문 token 잔존 (vault 마이그레이션 전) → fallback 으로 게이트 통과', async () => {
    localStorage.setItem(
      'noa-github-config',
      JSON.stringify({ token: TOKEN, owner: 'o', repo: 'r' }),
    );
    expect(await isCpMirrorEnabled()).toBe(true);
  });
});

describe('github-mirror — mirrorEvents (per-event append-only)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    _resetMirrorModuleForTests();
    mockFlag.mockReturnValue(true);
    mockPutFile.mockResolvedValue({ sha: 'blob', commitSha: 'commit-sha-1' });
    setOptIn();
  });

  it('ULID 순서로 순차 push + stage 경로 + watermark 전진 (2회차 0건)', async () => {
    const events = [makeEvent('01B', 'writing'), makeEvent('01A'), makeEvent('01C', 'revision')];
    mockList.mockResolvedValue(events);

    const res1 = await mirrorEvents('prj-1');
    expect(res1).toEqual({ pushed: 3, skipped: 0, remaining: 0 });
    expect(mockPutFile).toHaveBeenCalledTimes(3);
    // 정렬 후 호출 순서 = 01A → 01B → 01C, stage 미존재 = unstaged
    expect(mockPutFile.mock.calls[0][1]).toBe(`${CP_EVENTS_ROOT}/prj-1/unstaged/01A.json`);
    expect(mockPutFile.mock.calls[1][1]).toBe(`${CP_EVENTS_ROOT}/prj-1/writing/01B.json`);
    expect(mockPutFile.mock.calls[2][1]).toBe(`${CP_EVENTS_ROOT}/prj-1/revision/01C.json`);
    // append-only — create (sha 없음)
    expect(mockPutFile.mock.calls[0][3]).toBeUndefined();

    // 파일 envelope — 원본 이벤트 + 정직 표기, token 미기록
    const body = JSON.parse(mockPutFile.mock.calls[0][2] as string) as {
      schema: string; notice: typeof ANCHOR_HONESTY_NOTICE; event: CreativeEvent;
    };
    expect(body.schema).toBe('cp-mirror/event@1');
    expect(body.notice.ko).toContain('인간 작성 자체는 증명 불가');
    expect(body.event.id).toBe('01A');
    expect(mockPutFile.mock.calls[0][2]).not.toContain(TOKEN);

    // 2회차 — watermark 이후 잔여 0 → 네트워크 0
    mockPutFile.mockClear();
    const res2 = await mirrorEvents('prj-1');
    expect(res2).toEqual({ pushed: 0, skipped: 0, remaining: 0 });
    expect(mockPutFile).not.toHaveBeenCalled();
  });

  it('원격 이미 존재 (422) → getFile 확인 후 skip + watermark 전진', async () => {
    mockList.mockResolvedValue([makeEvent('01A', 'writing')]);
    mockPutFile.mockRejectedValueOnce(Object.assign(new Error('exists'), { status: 422 }));
    mockGetFile.mockResolvedValueOnce({ path: 'p', content: '{}', sha: 'existing' });

    const res = await mirrorEvents('prj-1');
    expect(res).toEqual({ pushed: 0, skipped: 1, remaining: 0 });

    // watermark 전진 — 재호출 시 네트워크 0
    mockPutFile.mockClear();
    expect(await mirrorEvents('prj-1')).toEqual({ pushed: 0, skipped: 0, remaining: 0 });
    expect(mockPutFile).not.toHaveBeenCalled();
  });

  it('하드 실패 (500) → 중단 + noa:alert 1회/60s throttle + 성공분만 watermark', async () => {
    const alerts: string[] = [];
    const onAlert = (e: Event) => {
      alerts.push(String((e as CustomEvent).detail?.message ?? ''));
    };
    window.addEventListener('noa:alert', onAlert);

    mockList.mockResolvedValue([makeEvent('01A'), makeEvent('01B')]);
    // 01A 성공, 01B 실패 (500 = 비재시도)
    mockPutFile
      .mockResolvedValueOnce({ sha: 'blob', commitSha: 'c1' })
      .mockRejectedValue(Object.assign(new Error('server down'), { status: 500 }));

    const res1 = await mirrorEvents('prj-1');
    expect(res1).toEqual({ pushed: 1, skipped: 0, remaining: 1 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).not.toContain(TOKEN); // token 미기록

    // 60s 내 재실패 → alert 추가 0 (throttle) — 01A 는 watermark 로 skip
    const res2 = await mirrorEvents('prj-1');
    expect(res2).toEqual({ pushed: 0, skipped: 0, remaining: 1 });
    expect(alerts).toHaveLength(1);

    window.removeEventListener('noa:alert', onAlert);
  });

  it('배치 상한 (20) 초과분은 remaining 으로 — 다음 주기 이월', async () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeEvent(`01${String(i).padStart(2, '0')}`),
    );
    mockList.mockResolvedValue(many);

    const res = await mirrorEvents('prj-1');
    expect(res).toEqual({ pushed: 20, skipped: 0, remaining: 5 });
    expect(mockPutFile).toHaveBeenCalledTimes(20);
  });

  it('scheduleEventMirror — 디바운스: 연속 호출 = flush 1회', async () => {
    mockList.mockResolvedValue([makeEvent('01A', 'writing')]);
    scheduleEventMirror('prj-1', 20);
    scheduleEventMirror('prj-1', 20);
    scheduleEventMirror('prj-1', 20);
    await new Promise((r) => setTimeout(r, 150));
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockPutFile).toHaveBeenCalledTimes(1);
  });
});

describe('github-mirror — mirrorCertificate', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    _resetMirrorModuleForTests();
    mockFlag.mockReturnValue(true);
    setOptIn();
  });

  it('cp-certs/{certId}.json 커밋 → commitSha 반환 + cert.githubCommitSha 보존', async () => {
    mockPutFile.mockResolvedValue({ sha: 'blob', commitSha: 'abc1234def' });
    const cert = makeCert('CERTID01');

    const res = await mirrorCertificate(cert);
    expect(res).toEqual({ commitSha: 'abc1234def' });
    expect(cert.githubCommitSha).toBe('abc1234def'); // additive 보존 (스펙 D2-b)

    expect(mockPutFile).toHaveBeenCalledTimes(1);
    expect(mockPutFile.mock.calls[0][1]).toBe(`${CP_CERTS_ROOT}/CERTID01.json`);
    const body = JSON.parse(mockPutFile.mock.calls[0][2] as string) as {
      schema: string; notice: typeof ANCHOR_HONESTY_NOTICE; certificate: ProcessCertificate;
    };
    expect(body.schema).toBe('cp-mirror/cert@1');
    expect(body.notice.ko).toContain('앵커 시점 이후 무변조·존재만 증명');
    expect(body.certificate.id).toBe('CERTID01');
    // 미러 파일 본문에 자기 commitSha 없음 (자기참조 불가) + token 미기록
    expect(body.certificate.githubCommitSha).toBeUndefined();
    expect(mockPutFile.mock.calls[0][2]).not.toContain(TOKEN);
  });

  it('실패 → null + noa:alert (발급 비차단·비침묵)', async () => {
    const alerts: string[] = [];
    const onAlert = (e: Event) => {
      alerts.push(String((e as CustomEvent).detail?.message ?? ''));
    };
    window.addEventListener('noa:alert', onAlert);

    mockPutFile.mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403 }));
    const cert = makeCert('CERTID02');
    const res = await mirrorCertificate(cert);

    expect(res).toBeNull();
    expect(cert.githubCommitSha).toBeUndefined();
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).not.toContain(TOKEN);

    window.removeEventListener('noa:alert', onAlert);
  });
});
