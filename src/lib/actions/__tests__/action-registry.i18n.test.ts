// ============================================================
// action-registry.i18n.test — i18n 완전성 게이트
// ============================================================
// [P10 루프3/mid-engineer+junior, 2026-06-08]
//   ACTION_CATALOG 의 모든 액션이 4 언어 (ko/en/ja/zh) 라벨을 보유하는지 강제.
//   새 액션 추가 시 i18n 누락이 CI 단계에서 차단된다.
//
//   회귀 방지 게이트 — auditActionI18n() 비어있어야 통과.
// ============================================================

import { ACTION_CATALOG, auditActionI18n } from '../action-registry';

describe('action-registry i18n 완전성', () => {
  it('ACTION_CATALOG 모든 액션이 4 언어 ko/en/ja/zh 라벨 보유', () => {
    const missing = auditActionI18n(['ko', 'en', 'ja', 'zh']);
    if (missing.length > 0) {
      // 친화적 에러 메시지 — 어떤 액션이 어떤 언어 누락인지 한 줄씩.
      const detail = missing
        .map((m) => `  • ${m.id} → missing: [${m.missingLangs.join(', ')}]`)
        .join('\n');
      throw new Error(
        `[action-registry i18n] ${missing.length} action(s) missing translations:\n${detail}\n` +
        `Fix: src/lib/actions/action-registry.ts 의 ACTION_CATALOG 해당 entry 에 i18n.{ko|en|ja|zh} 추가.`,
      );
    }
    expect(missing).toEqual([]);
  });

  it('필수 부분집합 (예: ko + en) 검사도 동일 결과', () => {
    // 일반적으로는 4 언어 다 필요하지만, 향후 partial check 도 가능해야 함.
    const missingKoEn = auditActionI18n(['ko', 'en']);
    // ko/en 만 검사 시에도 비어있어야 함 (이미 위 테스트가 4언어 통과면 부분집합도 통과).
    expect(missingKoEn).toEqual([]);
  });

  it('ACTION_CATALOG entry 0 개가 아님 (회귀 방지 sanity)', () => {
    const count = Object.keys(ACTION_CATALOG).length;
    expect(count).toBeGreaterThan(20);
  });
});
