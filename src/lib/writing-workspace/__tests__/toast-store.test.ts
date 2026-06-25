// ============================================================
// toast-store.test — 토스트 알림 store 단위 테스트
// 정상·빈·경계·이상 입력 ≥6 케이스.
// ============================================================

import {
  createToast,
  pruneExpired,
  nextToastId,
  DEFAULT_TOAST_TTL,
  MIN_TOAST_TTL,
  MAX_TOAST_TTL,
  MAX_TOAST_MESSAGE,
  type Toast,
} from '../toast-store';

describe('toast-store', () => {
  // ----------------------------------------------------------
  // PART 1 — createToast 정상 경로
  // ----------------------------------------------------------

  describe('createToast — 정상', () => {
    test('기본 입력으로 Toast 생성 (kind=info, ttl=3500)', () => {
      const t = createToast({ message: '저장되었습니다', now: 1_700_000_000_000 });
      expect(t).not.toBeNull();
      expect(t!.kind).toBe('info');
      expect(t!.message).toBe('저장되었습니다');
      expect(t!.createdAt).toBe(1_700_000_000_000);
      expect(t!.ttl).toBe(DEFAULT_TOAST_TTL);
      expect(typeof t!.id).toBe('string');
      expect(t!.id).toMatch(/^[0-9a-z]{10}-[0-9a-z]{4}$/);
    });

    test('모든 kind 가 보존된다', () => {
      const kinds = ['info', 'success', 'warn', 'error'] as const;
      for (const k of kinds) {
        const t = createToast({ kind: k, message: 'msg', now: 1 });
        expect(t).not.toBeNull();
        expect(t!.kind).toBe(k);
      }
    });

    test('호출자가 주입한 now 가 그대로 createdAt 에 반영된다', () => {
      const t = createToast({ message: 'X', now: 42 });
      expect(t!.createdAt).toBe(42);
    });

    test('커스텀 ttl 이 정상 범위면 그대로 보존', () => {
      const t = createToast({ message: '진행 중', ttl: 5000, now: 0 });
      expect(t!.ttl).toBe(5000);
    });
  });

  // ----------------------------------------------------------
  // PART 2 — createToast 빈·이상 입력 (null 반환·throw 안 함)
  // ----------------------------------------------------------

  describe('createToast — 빈/이상 입력', () => {
    test('빈 문자열 메시지는 null 반환', () => {
      expect(createToast({ message: '' })).toBeNull();
    });

    test('공백만 있는 메시지는 null 반환 (trim 후 빈)', () => {
      expect(createToast({ message: '   \t\n  ' })).toBeNull();
    });

    test('null/undefined 입력은 null 반환 (throw 안 함)', () => {
      expect(() => createToast(null)).not.toThrow();
      expect(() => createToast(undefined)).not.toThrow();
      expect(createToast(null)).toBeNull();
      expect(createToast(undefined)).toBeNull();
    });

    test('message 가 string 이 아니면 null 반환', () => {
      // @ts-expect-error — 의도적 이상 입력 검증 (number)
      expect(createToast({ message: 123 })).toBeNull();
      // @ts-expect-error — 의도적 이상 입력 검증 (null)
      expect(createToast({ message: null })).toBeNull();
    });

    test('알 수 없는 kind 는 info 로 폴백', () => {
      // @ts-expect-error — 의도적 이상 입력
      const t = createToast({ kind: 'fatal', message: 'msg', now: 1 });
      expect(t!.kind).toBe('info');
    });
  });

  // ----------------------------------------------------------
  // PART 3 — createToast 경계값 (ttl 클램프·메시지 절단)
  // ----------------------------------------------------------

  describe('createToast — 경계값', () => {
    test('ttl=0 은 MIN_TOAST_TTL 로 클램프', () => {
      const t = createToast({ message: 'm', ttl: 0, now: 0 });
      expect(t!.ttl).toBe(MIN_TOAST_TTL);
    });

    test('ttl=음수 는 MIN_TOAST_TTL 로 클램프', () => {
      const t = createToast({ message: 'm', ttl: -1000, now: 0 });
      expect(t!.ttl).toBe(MIN_TOAST_TTL);
    });

    test('ttl=과대값(10분) 은 MAX_TOAST_TTL 로 클램프', () => {
      const t = createToast({ message: 'm', ttl: 600_000, now: 0 });
      expect(t!.ttl).toBe(MAX_TOAST_TTL);
    });

    test('ttl=NaN/Infinity 는 기본값으로 폴백 (비유한값 가드)', () => {
      const a = createToast({ message: 'm', ttl: NaN, now: 0 });
      const b = createToast({ message: 'm', ttl: Infinity, now: 0 });
      // Number.isFinite(NaN) / isFinite(Infinity) 모두 false → 기본값
      expect(a!.ttl).toBe(DEFAULT_TOAST_TTL);
      expect(b!.ttl).toBe(DEFAULT_TOAST_TTL);
    });

    test('과대 메시지는 MAX_TOAST_MESSAGE 길이로 절단', () => {
      const long = 'A'.repeat(MAX_TOAST_MESSAGE + 200);
      const t = createToast({ message: long, now: 0 });
      expect(t!.message.length).toBe(MAX_TOAST_MESSAGE);
    });

    test('메시지 양끝 공백은 trim', () => {
      const t = createToast({ message: '  hello  ', now: 0 });
      expect(t!.message).toBe('hello');
    });
  });

  // ----------------------------------------------------------
  // PART 4 — pruneExpired
  // ----------------------------------------------------------

  describe('pruneExpired', () => {
    const make = (id: string, createdAt: number, ttl: number): Toast => ({
      id,
      kind: 'info',
      message: 'm',
      createdAt,
      ttl,
    });

    test('만료되지 않은 토스트는 유지', () => {
      const list = [make('a', 1000, 3500), make('b', 2000, 3500)];
      const out = pruneExpired(list, 3000);
      expect(out).toHaveLength(2);
    });

    test('만료된 토스트는 제거 (createdAt + ttl <= now)', () => {
      const list = [
        make('expired', 0, 1000), // 0+1000 = 1000 <= 2000 → 제거
        make('alive', 1500, 1000), // 1500+1000 = 2500 > 2000 → 유지
      ];
      const out = pruneExpired(list, 2000);
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe('alive');
    });

    test('정확한 경계 (createdAt + ttl == now) 는 만료로 처리', () => {
      const list = [make('edge', 1000, 500)]; // 만료 시점 1500
      expect(pruneExpired(list, 1500)).toHaveLength(0);
      expect(pruneExpired(list, 1499)).toHaveLength(1);
    });

    test('빈 배열/null/비배열 입력 안전 가드', () => {
      expect(pruneExpired([], 100)).toEqual([]);
      expect(pruneExpired(null, 100)).toEqual([]);
      expect(pruneExpired(undefined, 100)).toEqual([]);
      // @ts-expect-error — 의도적 이상 입력
      expect(pruneExpired('not-array', 100)).toEqual([]);
    });

    test('now 가 비정상이면 list 를 그대로 반환 (만료 판단 불가)', () => {
      const list = [make('a', 1000, 3500)];
      expect(pruneExpired(list, NaN)).toEqual(list);
      // @ts-expect-error — 의도적 이상 입력 (string 으로 NaN 트리거)
      expect(pruneExpired(list, 'now')).toEqual(list);
    });

    test('손상된 항목 (createdAt/ttl 비수치) 은 보존', () => {
      const bad = { id: 'bad', kind: 'info', message: 'm', createdAt: 'x', ttl: 'y' } as unknown as Toast;
      const list = [bad, make('good', 1000, 3500)];
      const out = pruneExpired(list, 2000);
      expect(out).toHaveLength(2);
    });

    test('원본 배열은 변경되지 않음 (불변)', () => {
      const list = [make('a', 0, 100), make('b', 0, 5000)];
      const copy = list.slice();
      pruneExpired(list, 1000);
      expect(list).toEqual(copy);
    });
  });

  // ----------------------------------------------------------
  // PART 5 — nextToastId (정렬·단조 증가)
  // ----------------------------------------------------------

  describe('nextToastId', () => {
    test('prev=null 이면 timestamp prefix + 0001', () => {
      const id = nextToastId(null, 1_700_000_000_000);
      expect(id).toMatch(/^[0-9a-z]{10}-0001$/);
    });

    test('같은 시간 prefix 에서 seq 가 단조 증가', () => {
      const t = 1_700_000_000_000;
      const a = nextToastId(null, t);
      const b = nextToastId(a, t);
      const c = nextToastId(b, t);
      expect(a < b).toBe(true);
      expect(b < c).toBe(true);
      expect(a.endsWith('-0001')).toBe(true);
      expect(b.endsWith('-0002')).toBe(true);
      expect(c.endsWith('-0003')).toBe(true);
    });

    test('다른 시간 prefix 면 seq 0001 재시작', () => {
      const a = nextToastId(null, 1000);
      const b = nextToastId(a, 9999);
      expect(b.endsWith('-0001')).toBe(true);
    });

    test('prev 형식 불일치 시 0001 폴백', () => {
      const id = nextToastId('garbage', 1000);
      expect(id.endsWith('-0001')).toBe(true);
    });

    test('두 toast 의 id 는 시간순 정렬 가능 (사전 비교)', () => {
      const early = createToast({ message: 'a', now: 1_700_000_000_000 });
      const late = createToast({ message: 'b', now: 1_700_000_001_000 });
      expect(early!.id < late!.id).toBe(true);
    });
  });
});
