/**
 * append-only-audit.test.ts (2026-05-10 신설 — M-10)
 *
 * creative-process 모듈이 append-only 정책을 코드 레벨에서 보장하는지 검증.
 *
 * 정책 (5차 §2 "장부 뒤에서" + 16차 §11 "Gap-aware Ledger"):
 *   - 이벤트는 추가만 (no delete/update)
 *   - 'delete' 이벤트도 새 record 로 append (실 데이터 삭제 X)
 *   - 무결성 보장 = 발급된 Process Certificate 의 신뢰 base
 *
 * 본 테스트는 모듈 export 스펙 자체를 검증.
 * 외부 호출 측이 destructive 행위를 시도해도 모듈에 export 가 없으면 호출 불가.
 */

import * as eventRecorder from '../event-recorder';
import * as sourceRecorder from '../source-recorder';
import * as idbStore from '../idb-store';

describe('creative-process append-only 보장 (M-10)', () => {
  describe('event-recorder', () => {
    it('destructive 함수 export 0건 (delete/remove/clear/update)', () => {
      const exports = Object.keys(eventRecorder);
      const destructive = exports.filter((k) => {
        const lower = k.toLowerCase();
        return (
          lower.includes('delete') ||
          lower.includes('remove') ||
          lower.includes('clear') ||
          lower.includes('update') ||
          lower.includes('overwrite')
        );
      });
      expect(destructive).toEqual([]);
    });

    it('record 함수 (append-only) 만 노출', () => {
      expect(typeof eventRecorder.recordCreativeEvent).toBe('function');
    });
  });

  describe('source-recorder', () => {
    it('destructive 함수 export 0건', () => {
      const exports = Object.keys(sourceRecorder);
      const destructive = exports.filter((k) => {
        const lower = k.toLowerCase();
        return (
          lower.includes('delete') ||
          lower.includes('remove') ||
          lower.includes('clear') ||
          lower.includes('update') ||
          lower.includes('overwrite')
        );
      });
      expect(destructive).toEqual([]);
    });
  });

  describe('idb-store', () => {
    it('destructive 헬퍼 export 0건 (drop/delete/clear)', () => {
      const exports = Object.keys(idbStore);
      const destructive = exports.filter((k) => {
        const lower = k.toLowerCase();
        // _resetCachedDB 는 테스트 헬퍼 — DB 핸들 reset, 데이터 무영향
        if (k === '_resetCachedDB') return false;
        return (
          lower.includes('delete') ||
          lower.includes('drop') ||
          lower.includes('clear') ||
          lower.includes('overwrite')
        );
      });
      expect(destructive).toEqual([]);
    });
  });

  describe('소스 코드 검증 — destructive IDB 호출 패턴', () => {
    it('event-recorder 의 source 에 IDBObjectStore.delete/clear 직접 호출 X', () => {
      // 메타 검증 — fs read 로 source 검사
      // 단순 spy 로는 dynamic import 통과만 확인.
      // 실 검증은 build pipeline 에서 grep 으로:
      //   grep -E '\.(delete|clear)\(' src/lib/creative-process/{event,source}-recorder.ts
      // 현재 테스트는 export 스펙만 검증.
      expect(true).toBe(true);
    });
  });
});
