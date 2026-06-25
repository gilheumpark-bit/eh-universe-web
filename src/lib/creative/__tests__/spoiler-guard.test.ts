import {
  classifySpoiler,
  canExposeInMedia,
  type SpoilerEntry,
  type SpoilerLevel,
} from '@/lib/creative/spoiler-guard';

describe('spoiler-guard', () => {
  // ============================================================
  // classifySpoiler — 4등급 각각 (사양 §1·§2)
  // ============================================================

  describe('classifySpoiler — 4등급', () => {
    it('tier 1 (표면 사실) → Public', () => {
      // 사양 §1.1 예: "주인공 직업 = 협회 보조 인력"
      expect(classifySpoiler({ tier: 1 })).toBe('Public');
    });

    it('tier 2 (시스템 작동 원리) → Internal', () => {
      // 사양 §1.1 예: "주인공 가족사 = 8년 전 화재"
      expect(classifySpoiler({ tier: 2 })).toBe('Internal');
    });

    it('tier 3 (형이상학·주제, themeLink 없음) → Restricted', () => {
      // 사양 §1.1 예: "안타고니스트 정체"
      expect(classifySpoiler({ tier: 3 })).toBe('Restricted');
    });

    it('themeLink 연결 (작품 핵심 주제) → Confidential', () => {
      // 사양 §2: if themeLink != null → Confidential
      // §1.1 예: "각성 시스템의 진실 = 죽은 신의 잔재"
      expect(classifySpoiler({ tier: 3, themeLink: '죽은 신의 잔재' })).toBe('Confidential');
      // tier 낮아도 themeLink가 보수 승급 (강등 금지)
      expect(classifySpoiler({ tier: 1, themeLink: '결말 = 시스템 종료' })).toBe('Confidential');
    });

    it('conflictsWith + 표면 룰 모순 → 최소 Restricted 승급', () => {
      // 사양 §2: conflictsWith.length > 0 AND contradicts 표면 룰 → Restricted
      expect(
        classifySpoiler({ tier: 1, conflictsWith: ['fact_001'], contradictsSurfaceRule: true }),
      ).toBe('Restricted');
      // AND 조건 — 모순 플래그 없으면 승급 X
      expect(
        classifySpoiler({ tier: 1, conflictsWith: ['fact_001'], contradictsSurfaceRule: false }),
      ).toBe('Public');
      // 충돌 목록이 비면 승급 X
      expect(classifySpoiler({ tier: 1, conflictsWith: [], contradictsSurfaceRule: true })).toBe(
        'Public',
      );
    });

    it('명시 classification 슬롯이 유효하면 추론보다 우선한다 (§2.1)', () => {
      expect(classifySpoiler({ classification: 'Restricted', tier: 1 })).toBe('Restricted');
      // 대소문자 무시 정규화
      expect(classifySpoiler({ classification: 'public', tier: 3 })).toBe('Public');
      expect(classifySpoiler({ classification: ' CONFIDENTIAL ' })).toBe('Confidential');
    });
  });

  // ============================================================
  // classifySpoiler — 미지 입력 = 보수 디폴트 (Confidential)
  // ============================================================

  describe('classifySpoiler — 미지 입력 방어', () => {
    it('null/undefined/비객체 entry → Confidential (가장 보수적)', () => {
      expect(classifySpoiler(null)).toBe('Confidential');
      expect(classifySpoiler(undefined)).toBe('Confidential');
      expect(classifySpoiler('fact' as unknown as SpoilerEntry)).toBe('Confidential');
    });

    it('빈 entry (tier·themeLink·충돌 신호 전무) → Confidential', () => {
      expect(classifySpoiler({})).toBe('Confidential');
    });

    it('미인식 명시 등급 토큰 → Confidential (미상 등급 보수 디폴트)', () => {
      expect(classifySpoiler({ classification: 'TopSecret' })).toBe('Confidential');
      expect(classifySpoiler({ classification: '공개' })).toBe('Confidential');
    });

    it('미상 tier (0·4·NaN) → 신호 없으면 Confidential, 신호 있으면 승급 룰만 적용', () => {
      expect(classifySpoiler({ tier: 0 })).toBe('Confidential');
      expect(classifySpoiler({ tier: 4 })).toBe('Confidential');
      expect(classifySpoiler({ tier: NaN })).toBe('Confidential');
      // tier 미상 + 표면 룰 모순 → Restricted (보수 신호 반영)
      expect(
        classifySpoiler({ tier: 9, conflictsWith: ['fact_002'], contradictsSurfaceRule: true }),
      ).toBe('Restricted');
    });

    it('공백 themeLink는 신호로 치지 않는다', () => {
      expect(classifySpoiler({ tier: 2, themeLink: '   ' })).toBe('Internal');
      expect(classifySpoiler({ tier: 2, themeLink: null })).toBe('Internal');
    });
  });

  // ============================================================
  // canExposeInMedia — 차단 매트릭스 (사양 §1·§3)
  // ============================================================

  describe('canExposeInMedia — 4등급 매트릭스', () => {
    it('Public → 모든 매체 PASS (✓ 자유, §1)', () => {
      for (const media of ['image', 'video', 'audio', 'cover'] as const) {
        const d = canExposeInMedia('Public', media);
        expect(d.allowed).toBe(true);
        expect(d.judgment).toBe('PASS');
      }
    });

    it('Confidential → 모든 매체·모든 회차 BLOCKED (✗ 절대 차단, §1)', () => {
      for (const media of ['image', 'video', 'audio', 'cover'] as const) {
        const d = canExposeInMedia('Confidential', media);
        expect(d.allowed).toBe(false);
        expect(d.judgment).toBe('BLOCKED');
      }
      // 공개 회차 도달했어도 절대 차단 (§1 — 승급은 별도 절차 §4)
      const reached = canExposeInMedia('Confidential', 'image', {
        currentEpisode: 99,
        publicAtEpisode: 18,
      });
      expect(reached.allowed).toBe(false);
      expect(reached.judgment).toBe('BLOCKED');
    });

    it('Restricted → 회차 미상이면 자동 BLOCKED (§3.1)', () => {
      const d = canExposeInMedia('Restricted', 'image');
      expect(d.allowed).toBe(false);
      expect(d.judgment).toBe('BLOCKED');
    });

    it('Internal → 회차 미상이면 허용하되 WARNING (자동 차단 대상 아님, §1·§8)', () => {
      const d = canExposeInMedia('Internal', 'video');
      expect(d.allowed).toBe(true);
      expect(d.judgment).toBe('WARNING');
    });
  });

  // ============================================================
  // canExposeInMedia — 회차 도달 경계 (§3.1 publicAtEpisode <= current)
  // ============================================================

  describe('canExposeInMedia — 회차 경계', () => {
    it('Internal: 도달(=경계 포함) PASS / 미도달 BLOCKED', () => {
      // 경계: publicAtEpisode == currentEpisode → 도달 (<=)
      const atBoundary = canExposeInMedia('Internal', 'image', {
        currentEpisode: 5,
        publicAtEpisode: 5,
      });
      expect(atBoundary.allowed).toBe(true);
      expect(atBoundary.judgment).toBe('PASS');

      // 미도달: 5화 작성 중인데 7화 공개 fact
      const before = canExposeInMedia('Internal', 'image', {
        currentEpisode: 5,
        publicAtEpisode: 7,
      });
      expect(before.allowed).toBe(false);
      expect(before.judgment).toBe('BLOCKED');
    });

    it('Restricted: 도달 시 WARNING (작가 확인, §8) / 미도달 BLOCKED', () => {
      // 사양 §1: "⚠ 등장 회차 도달 후만" — 도달해도 PASS가 아닌 작가 확인
      const reached = canExposeInMedia('Restricted', 'video', {
        currentEpisode: 13,
        publicAtEpisode: 13,
      });
      expect(reached.allowed).toBe(true);
      expect(reached.judgment).toBe('WARNING');

      const blocked = canExposeInMedia('Restricted', 'video', {
        currentEpisode: 12,
        publicAtEpisode: 13,
      });
      expect(blocked.allowed).toBe(false);
      expect(blocked.judgment).toBe('BLOCKED');
    });

    it('cover(표지·캐릭 일러): Restricted는 회차 도달과 무관하게 BLOCKED (§3.4)', () => {
      const d = canExposeInMedia('Restricted', 'cover', {
        currentEpisode: 99,
        publicAtEpisode: 13,
      });
      expect(d.allowed).toBe(false);
      expect(d.judgment).toBe('BLOCKED');
      // Internal은 §3.4 차단 목록에 없음 — 회차 도달 시 PASS
      const internal = canExposeInMedia('Internal', 'cover', {
        currentEpisode: 9,
        publicAtEpisode: 7,
      });
      expect(internal.allowed).toBe(true);
    });

    it('회차 컨텍스트 결손(음수·NaN·일부 누락)은 회차 미상으로 취급', () => {
      // Restricted + 결손 회차 → 도달 증명 불가 → BLOCKED
      expect(
        canExposeInMedia('Restricted', 'image', { currentEpisode: -1, publicAtEpisode: 5 }).allowed,
      ).toBe(false);
      expect(
        canExposeInMedia('Restricted', 'image', { currentEpisode: NaN, publicAtEpisode: 5 }).allowed,
      ).toBe(false);
      expect(canExposeInMedia('Restricted', 'image', { publicAtEpisode: 5 }).allowed).toBe(false);
      expect(canExposeInMedia('Restricted', 'image', { currentEpisode: 5 }).allowed).toBe(false);
    });
  });

  // ============================================================
  // canExposeInMedia — 미지 입력 방어 (보수 디폴트)
  // ============================================================

  describe('canExposeInMedia — 미지 입력 방어', () => {
    it('미상 등급 → Confidential로 정규화 → BLOCKED', () => {
      for (const bad of [null, undefined, '', 'Secret', 42 as unknown as string]) {
        const d = canExposeInMedia(bad as SpoilerLevel | string | null | undefined, 'image');
        expect(d.allowed).toBe(false);
        expect(d.judgment).toBe('BLOCKED');
        expect(d.level).toBe('Confidential');
      }
    });

    it('등급 토큰 대소문자·공백 정규화', () => {
      expect(canExposeInMedia('public', 'image').judgment).toBe('PASS');
      expect(canExposeInMedia(' RESTRICTED ', 'image').judgment).toBe('BLOCKED');
    });

    it('미상 매체 → image 게이트 기준으로 판정 (보수 매트릭스 유지)', () => {
      const d = canExposeInMedia('Public', 'hologram');
      expect(d.mediaTarget).toBe('image');
      expect(d.judgment).toBe('PASS');
      // 미상 매체 + 미상 등급 → 여전히 차단
      expect(canExposeInMedia(undefined, null).allowed).toBe(false);
    });

    it('판정 결과에 근거(reason)와 정규화 값이 담긴다', () => {
      const d = canExposeInMedia('Restricted', 'audio', {
        currentEpisode: 20,
        publicAtEpisode: 18,
      });
      expect(d.level).toBe('Restricted');
      expect(d.mediaTarget).toBe('audio');
      expect(d.reason.length).toBeGreaterThan(0);
    });
  });
});
