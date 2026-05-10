// ============================================================
// HCI Label Migration — 'Verified'/'Unverified' EN 라벨 retroactive 안내
// ============================================================
//
// [P1 fix — 2026-05-10] FORBIDDEN_WORDS_4LANG.en 위반 라벨 교체:
//   'Verified' → 'Strong'
//   'Unverified' → 'Limited'
//
// 이전에 발급된 ProcessCertificate (en view) 에 위반 텍스트가 포함됐을
// 가능성이 있음. 출판사·플랫폼 제출분이 있다면 작가가 retroactive 정정
// 인지하도록 IDB 누적 certificates 스캔 + 알림 토스트.
//
// 정책:
//   - silent 자동 수정 X (작가 알 권리)
//   - 발견 시 1회 알림 토스트 (CustomEvent)
//   - localStorage flag 로 1회 알림 후 mute
// ============================================================

import { openCreativeProcessDB, STORE_CERTIFICATES, promisifyRequest } from './idb-store';

const MIGRATION_NOTICE_KEY = 'noa_creative_hci_label_migration_notified_v1';
const FORBIDDEN_LABELS_EN = ['Verified', 'Unverified'] as const;

export interface HCILabelMigrationResult {
  /** 위반 라벨 포함 발급 건 갯수 */
  affectedCount: number;
  /** 가장 최근 위반 발급일 (ISO) */
  latestAffectedAt?: string;
  /** 알림 이미 발송됨 여부 */
  alreadyNotified: boolean;
}

/**
 * 누적 ProcessCertificate 중 EN view + Verified/Unverified 라벨 포함 건 카운트.
 * IDB 미지원 / 빈 상태 → affectedCount 0.
 */
export async function scanHCILabelMigration(): Promise<HCILabelMigrationResult> {
  const alreadyNotified =
    typeof window !== 'undefined' && window.localStorage?.getItem(MIGRATION_NOTICE_KEY) === '1';

  if (typeof indexedDB === 'undefined') {
    return { affectedCount: 0, alreadyNotified };
  }

  try {
    const db = await openCreativeProcessDB();
    const tx = db.transaction(STORE_CERTIFICATES, 'readonly');
    const store = tx.objectStore(STORE_CERTIFICATES);
    const all = (await promisifyRequest(store.getAll())) as Array<{
      id: string;
      generatedAt?: string;
      visibility?: string;
      hciPayload?: { intent?: string };
      // 후방 호환 — 이전 발급은 hciPayload 가 없을 수도 있음
      htmlSnapshot?: string;
      mdSnapshot?: string;
    }>;

    let affectedCount = 0;
    let latestAffectedAt: string | undefined;

    for (const cert of all) {
      // EN view 추정 — visibility 만으론 부족, hciPayload.intent 가 'verified'/'unverified' 면 경고
      // (라벨 자체는 렌더 시점에 결정되므로 hciPayload 가 있으면 영향 가능성).
      const intent = cert.hciPayload?.intent;
      if (intent === 'verified' || intent === 'unverified') {
        affectedCount += 1;
        const at = cert.generatedAt ?? '';
        if (!latestAffectedAt || at > latestAffectedAt) {
          latestAffectedAt = at;
        }
      }
    }

    return { affectedCount, latestAffectedAt, alreadyNotified };
  } catch {
    return { affectedCount: 0, alreadyNotified };
  }
}

/**
 * 안내 1회 발송 — `noa:hci-label-migration-notice` CustomEvent.
 * 사용자 인지 후 markNotified() 로 mute.
 */
export function dispatchMigrationNotice(result: HCILabelMigrationResult): void {
  if (typeof window === 'undefined') return;
  if (result.alreadyNotified || result.affectedCount === 0) return;
  try {
    window.dispatchEvent(
      new CustomEvent('noa:hci-label-migration-notice', { detail: result }),
    );
  } catch {
    // CustomEvent 미지원 환경 — silent
  }
}

/** 안내 확인 처리 — localStorage 영구 flag. */
export function markNotified(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(MIGRATION_NOTICE_KEY, '1');
  } catch {
    // noop
  }
}

/** 4언어 안내 텍스트 — 작가 인지용. */
export const MIGRATION_NOTICE_TEXT_4LANG = {
  ko: '이전에 발급한 영문 확인서에 라벨 표기가 변경되었습니다 (‘Verified/Unverified’ → ‘Strong/Limited’). 출판사·플랫폼 제출분이 있다면 재발급을 권장합니다.',
  en: 'English Authorship Journal label updated (‘Verified/Unverified’ → ‘Strong/Limited’). If you submitted previous versions to publishers or platforms, re-issuing is recommended.',
  ja: '以前に発行された英語版確認書のラベル表記が変更されました (‘Verified/Unverified’ → ‘Strong/Limited’)。出版社・プラットフォームへ提出済みの場合は再発行を推奨します。',
  zh: '此前发行的英文版确认书标签表述已更新 (‘Verified/Unverified’ → ‘Strong/Limited’)。若已向出版社或平台提交，建议重新发行。',
} as const;

/** Forbidden 라벨 list — 외부 검사 도구용 export. */
export const HCI_FORBIDDEN_EN_LABELS = FORBIDDEN_LABELS_EN;
